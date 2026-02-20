"use client";

import React, { useEffect, useRef } from "react";
import UploadedImagesLayer from "./UploadedImagesLayer";
import MainProductImage from "./MainProductImage";
import RestrictedArea from "./RestrictedArea";
import Marquee from "./Marquee";
import SelectionBox from "../SelectionBox";
import TextSelectionBox from "../SelectionBox/TextSelectionBox/TextSelectionBox";

import { useDragSelection } from "./Hooks/useDragSelection";
import { useMarqueeSelection } from "./Hooks/useMarqueeSelection";
import { useImageSizes } from "./Hooks/useImageSizes";
import { useImagePositions } from "./Hooks/useImagePositions";
import { useGroupResize } from "./Hooks/useGroupResize";
import { useDuplicateImages } from "./Hooks/useDuplicateImages";
import DraggableText from "./DraggableText";
import SelectionWatcher from "../Components/SelectionWatcher";
import { useTextAutoShrink } from "./Hooks/TextAutoShrink";

export type CanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  mainImage: string;
  restrictedBox: { left: number; top: number; width: number; height: number };

  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;

  imageState: Record<string, any>;
  setImageState: React.Dispatch<any>;

  onDelete?: (uids: string[]) => void;
  onDuplicate?: (uids: string[]) => void;
  onResize?: (uid: string, w: number, h: number) => void;
  onResizeTextCommit: (uid: string, newFontSize: number) => void;
  onReset?: (uids: string[]) => void;

  onSelectImage?: (uid: string | null) => void;
  onSelectText?: (uid: string | null) => void;
  onSwitchTab?: (tab: string) => void;
  onSelectionChange?: (uids: string[]) => void;
   sizes?: Record<string, { w: number; h: number }>;
  setSizes?: React.Dispatch<React.SetStateAction<Record<string, { w: number; h: number }>>>;
  canvasPositions?: Record<string, { x: number; y: number; width: number; height: number; scale: number }>;
};

// --------------------- Helper functions ---------------------
function fitsInRestrictedBox(
  x: number,
  y: number,
  w: number,
  h: number,
  box: { left: number; top: number; width: number; height: number }
) {
  return (
    x >= box.left &&
    y >= box.top &&
    x + w <= box.left + box.width &&
    y + h <= box.top + box.height
  );
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { left: number; top: number; width: number; height: number }
) {
  return !(
    a.x + a.w < b.left ||
    a.x > b.left + b.width ||
    a.y + a.h < b.top ||
    a.y > b.top + b.height
  );
}

export default function Canvas(props: CanvasProps) {
  const {
    canvasRef,
    restrictedBox,
    mainImage,
    uploadedImages,
    imageState,
    onSelectImage,
    onSelectText,
    onSwitchTab,
    onResizeTextCommit,
  } = props;

  // --------------------- Latest uploaded image ref ---------------------
  const latestUploadedImageRef = useRef<string | null>(null);

  // --------------------- Image sizes ---------------------
  const visualUids = Object.keys(imageState).filter(
    (uid) => imageState[uid]?.type === "image" || imageState[uid]?.type === "clipart"
  );
  const { sizes, setSizes } = useImageSizes(visualUids, imageState);

  // --------------------- Image positions ---------------------
  const allUids = Object.keys(imageState);
  const { positions, setPositions } = useImagePositions(allUids, sizes, restrictedBox);

  // --------------------- Text auto shrink ---------------------
  useTextAutoShrink({
    imageState,
    positions,
    sizes,
    restrictedBox,
    onResizeText: onResizeTextCommit,
  });

  // --------------------- Drag selection ---------------------
  const drag = useDragSelection({
    uids: uploadedImages,
    sizes,
    positions,
    setPositions,
    canvasRef,
    restrictedBox,
    onDelete: props.onDelete,
    onDuplicate: props.onDuplicate,
    onResize: props.onResize,
    onReset: props.onReset,
    multiDrag: true,
  });
// Filter only images or clipart
const selectedImages = drag.selected.filter(
  (uid) => imageState[uid]?.type === "image" || imageState[uid]?.type === "clipart"
);

// If you want just a single selected image for SizeControls
const selectedImageId = selectedImages[0]; // pick the first selected image

// Get the actual image object
const st = selectedImageId ? imageState[selectedImageId] : undefined;


  const selectedText = drag.selected.filter((uid) => imageState[uid]?.type === "text");

  // --------------------- Group resize ---------------------
  const groupResize = useGroupResize({
    selected: drag.selected,
    sizes,
    positions,
    setSizes,
    setPositions,
    restrictedBox,
    setImageState: props.setImageState,
  });

  // --------------------- Marquee selection ---------------------
  const marquee = useMarqueeSelection({
    canvasRef,
    uids: allUids,
    onSelect: drag.setSelected,
  });

  // --------------------- Duplicate hook ---------------------
  const duplicateImages = useDuplicateImages({
    setPositions,
    setSizes,
    setImageState: props.setImageState,
    setUploadedImages: props.setUploadedImages,
  });

  const handleDuplicateFromSelectionBox = () => {
    if (drag.selected.length === 0) return;
    duplicateImages(drag.selected);
  };

  const handleDeleteFromSelectionBox = (uids: string[]) => {
    if (!props.onDelete) return;
    props.onDelete(uids);
  };

  const handleDuplicateFromTextProperties = () => {
    if (drag.selected.length === 0) return;
    duplicateImages([drag.selected[0]]);
  };

  // --------------------- Canvas pointer down ---------------------
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;

    if (target.closest(".selection-button")) return;

    const uid = (target.closest("[data-uid]") as HTMLElement)?.dataset.uid;

    // Clicked empty space → start marquee selection
    if (!uid) {
      drag.setSelected([]);
      onSelectImage?.(null);
      onSelectText?.(null);
      marquee.onPointerDown(e);
      return;
    }


    // Get layer, fallback to latest uploaded image if needed
    const layer =
      imageState[uid] ||
      (uid === latestUploadedImageRef.current ? { type: "image" } : null);

    if (!layer) {
      console.warn("⚠️ No layer found for UID:", uid);
      return;
    }

    // ---------------- TEXT ----------------
    if (layer.type === "text") {
      onSelectImage?.(null);
      onSelectText?.(uid);
      onSwitchTab?.("text");
      drag.setSelected([uid]);
      drag.onPointerDown(e, uid);
      return;
    }

// ---------------- UPLOADED IMAGE ----------------
if (layer.type === "image" && !layer.isClipart) {
  onSelectText?.(null);

  // Force select immediately
  onSelectImage?.(uid);

  drag.setSelected([uid]); // still do drag update
  onSwitchTab?.("upload");

  e.stopPropagation();
  return;
}



    // ---------------- CLIPART ----------------
    if (layer.type === "image" && layer.isClipart) {
      onSelectText?.(null);
      onSelectImage?.(uid);
      onSwitchTab?.("clipart");
      drag.setSelected([uid]);
      drag.onPointerDown(e, uid);
      return;
    }
  };

  // --------------------- Render ---------------------
  return (
    <div
      ref={canvasRef}
      className="flex-1 relative bg-gray-200 dark:bg-gray-800"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={marquee.onPointerMove}
    >
      <MainProductImage src={mainImage} />
      
      <RestrictedArea box={restrictedBox} />

      {/* IMAGES */}
      <UploadedImagesLayer
        uids={visualUids}
        positions={positions}
        sizes={sizes} // <- this drives the render size
        imageState={imageState}
        selected={drag.selected}
        hovered={marquee.hovered}
        onPointerDown={drag.onPointerDown}
      />

      {/* TEXT */}
      {Object.entries(imageState)
        .filter(([_, layer]) => layer.type === "text")
        .map(([uid, layer]: any) => {
          const p = positions[uid] ?? { x: 200, y: 200 };
          const fontSize = layer.fontSize ?? 24;
          const size = sizes[uid] ?? { w: 200, h: fontSize };

          return (
            <DraggableText
              key={uid}
              uid={uid}
              text={layer.text ?? ""}
              pos={p}
              size={size}
              rotation={layer.rotation ?? 0}
              flip={layer.flip ?? "none"}
              fontFamily={layer.fontFamily ?? "Arial"}
              color={layer.color ?? "#000"}
              borderColor={layer.borderColor}
              borderWidth={layer.borderWidth}
              highlighted={drag.selected.includes(uid)}
              selected={drag.selected}
              onPointerDown={drag.onPointerDown}
              fontSize={fontSize}
              onDuplicate={handleDuplicateFromTextProperties}
              onMeasure={(uid, w, h) => {
                setSizes((prev) => {
                  const existing = prev[uid];
                  const roundToTenths = (n: number) => Math.round(n * 10) / 10;
                  const roundedW = roundToTenths(w);
                  const roundedH = roundToTenths(h);
                  const changed =
                    !existing ||
                    Math.abs((existing?.w ?? 0) - roundedW) >= 0.1 ||
                    Math.abs((existing?.h ?? 0) - roundedH) >= 0.1;
                  if (!changed) return prev;
                  return { ...prev, [uid]: { w: roundedW, h: roundedH } };
                });
              }}
            />
          );
        })}

      {/* IMAGE SELECTION BOX */}
      {selectedImages.length > 0 && (
        <SelectionBox
          selectedImages={selectedImages}
          canvasRef={drag.selectionBoxProps.canvasRef}
          onDuplicate={handleDuplicateFromSelectionBox}
          onStartGroupResize={(direction) => {
            groupResize.startResize(direction);
          }}
          onDelete={handleDeleteFromSelectionBox}
          onResize={drag.selectionBoxProps.onResize}
          onDeselectAll={drag.selectionBoxProps.onDeselectAll}
        />
      )}

      {/* TEXT SELECTION BOX */}
      {selectedText.length > 0 && (
        <TextSelectionBox
          selectedText={selectedText}
          canvasRef={drag.selectionBoxProps.canvasRef}
          onDuplicate={handleDuplicateFromSelectionBox}
          onDelete={handleDeleteFromSelectionBox}
          onDeselectAll={drag.selectionBoxProps.onDeselectAll}
          onResizeText={onResizeTextCommit}
          restrictedBox={restrictedBox}
          positions={positions}
          imageState={imageState}
          sizes={sizes}
        />
      )}

      <SelectionWatcher
        selected={drag.selected}
        imageState={imageState}
        onSelectImage={onSelectImage}
        onSelectText={onSelectText}
        onSwitchTab={onSwitchTab}
        onSelectionChange={props.onSelectionChange}
      />

      <Marquee marquee={marquee.marquee} />
    </div>
  );
}
