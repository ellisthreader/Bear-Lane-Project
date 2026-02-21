"use client";

import React, { useRef, useState, useEffect } from "react";
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

import GetPriceButton from "../Components/Buttons/GetPriceButton";
import SaveDesignButton from "../Components/Buttons/SaveDesignButton";
import ProductViewSelector from "../Components/ProductViewSelector";
import type { ViewKey } from "../Design";

export type ImageState = {
  url?: string;
  type: "image" | "text" | "clipart";
  rotation?: number;
  flip?: "none" | "horizontal" | "vertical";
  size?: { w: number; h: number };
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
  text?: string;
  renderKey?: string;
  isClipart?: boolean;
  original?: any;
  canvasPositions?: Record<string, any>;
  restrictedBox?: any;
  isSvg?: boolean;
  width?: number;
};

export type PricePreviewLayer = {
  uid: string;
  type: "image" | "text" | "clipart";
  url?: string;
  text?: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  rotation: number;
  flip: "none" | "horizontal" | "vertical";
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: number;
};

export type PricePreviewSnapshot = {
  baseImage: string;
  canvasWidth: number;
  canvasHeight: number;
  restrictedBox: { left: number; top: number; width: number; height: number };
  layers: PricePreviewLayer[];
};

export type CanvasProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  mainImage: string;
  restrictedBox: { left: number; top: number; width: number; height: number };
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
  viewImageStates: Record<ViewKey, Record<string, ImageState>>;
  setViewImageStates: React.Dispatch<
    React.SetStateAction<Record<ViewKey, Record<string, ImageState>>>
  >;
  currentViewKey: ViewKey;
  setCurrentViewKey: React.Dispatch<React.SetStateAction<ViewKey>>;
    onDelete?: (uids: string[]) => void;
  onDuplicate?: (uids: string[]) => void;
  onResize?: (uid: string, w: number, h: number) => void;
  onResizeTextCommit: (uid: string, newFontSize: number) => void;
  onReset?: (uids: string[]) => void;
  onSelectImage?: (uid: string | null) => void;
  onSelectText?: (uid: string | null) => void;
  onSwitchTab?: (tab: string) => void;
  onSelectionChange?: (uids: string[]) => void;
  productViewImages?: {
    front: string;
    back: string;
    leftSleeve: string;
    rightSleeve: string;
  };
  onGetPrice?: () => void;
  onSaveDesign?: () => void;
  onViewSnapshotChange?: (viewKey: ViewKey, snapshot: PricePreviewSnapshot) => void;
};

export default function Canvas(props: CanvasProps) {
  const {
    canvasRef,
    restrictedBox,
    mainImage,
    uploadedImages,
    viewImageStates,
    setViewImageStates,
    currentViewKey,
    setCurrentViewKey,
    onSelectImage,
    onSelectText,
    onSwitchTab,
    onResizeTextCommit,
    onGetPrice,
    onSaveDesign,
    onViewSnapshotChange,
  } = props;

  const latestUploadedImageRef = useRef<string | null>(null);
  const [currentViewImage, setCurrentViewImage] = useState(mainImage);

  // ---------------- Current View State ----------------
  const currentImageState = viewImageStates[currentViewKey] ?? {};

  const updateCurrentImageState: React.Dispatch<
    React.SetStateAction<Record<string, ImageState>>
  > = updates => {
    setViewImageStates(prev => {
      const current = prev[currentViewKey] ?? {};
      const nextForView =
        typeof updates === "function"
          ? updates(current)
          : { ...current, ...updates };

      return {
        ...prev,
        [currentViewKey]: nextForView,
      };
    });
  };

  // ---------------- Image Sizes ----------------
  const visualUids = Object.keys(currentImageState).filter(
    uid => currentImageState[uid]?.type === "image" || currentImageState[uid]?.type === "clipart"
  );
  const { sizes, setSizes } = useImageSizes(visualUids, currentImageState);

  // ---------------- Image Positions ----------------
  const allUids = Object.keys(currentImageState);
  const { positions, setPositions } = useImagePositions(allUids, sizes, restrictedBox);

  // ---------------- Text Auto Shrink ----------------
  useTextAutoShrink({
    imageState: currentImageState,
    positions,
    sizes,
    restrictedBox,
    onResizeText: onResizeTextCommit,
  });

  // ---------------- Drag Selection ----------------
  const drag = useDragSelection({
    uids: allUids,
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

  const selectedImages = drag.selected.filter(
    uid => currentImageState[uid]?.type === "image" || currentImageState[uid]?.type === "clipart"
  );
  const selectedText = drag.selected.filter(uid => currentImageState[uid]?.type === "text");

  // ---------------- Group Resize ----------------
  const groupResize = useGroupResize({
    selected: drag.selected,
    sizes,
    positions,
    setSizes,
    setPositions,
    restrictedBox,
    setImageState: updateCurrentImageState,
  });

  // ---------------- Marquee ----------------
  const marquee = useMarqueeSelection({
    canvasRef,
    uids: allUids,
    onSelect: drag.setSelected,
  });

  // ---------------- Duplicate ----------------
  const duplicateImages = useDuplicateImages({
    setPositions,
    setSizes,
    setImageState: updateCurrentImageState,
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

  // ---------------- Product View ----------------
  useEffect(() => {
    if (mainImage) setCurrentViewImage(mainImage);
  }, [mainImage]);

  useEffect(() => {
    if (!onViewSnapshotChange) return;
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const canvasWidth = canvasBounds?.width ?? 0;
    const canvasHeight = canvasBounds?.height ?? 0;

    const layers: PricePreviewLayer[] = Object.entries(currentImageState)
      .map(([uid, layer]) => {
        const position = positions[uid];
        const size = sizes[uid] ?? layer.size;

        if (!position || !size) return null;

        return {
          uid,
          type:
            layer.type === "text"
              ? "text"
              : layer.isClipart
              ? "clipart"
              : "image",
          url: layer.url,
          text: layer.text,
          position,
          size,
          rotation: layer.rotation ?? 0,
          flip: layer.flip ?? "none",
          color: layer.color,
          borderColor: layer.borderColor,
          borderWidth: layer.borderWidth,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
        };
      })
      .filter((layer): layer is PricePreviewLayer => layer !== null);

    onViewSnapshotChange(currentViewKey, {
      baseImage: currentViewImage,
      canvasWidth,
      canvasHeight,
      restrictedBox,
      layers,
    });
  }, [
    onViewSnapshotChange,
    currentViewKey,
    currentViewImage,
    currentImageState,
    positions,
    sizes,
    restrictedBox,
    canvasRef,
  ]);

  // ---------------- Handlers ----------------
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".selection-button")) return;
    const uid = (target.closest("[data-uid]") as HTMLElement)?.dataset.uid;
    if (!uid) {
      drag.setSelected([]);
      onSelectImage?.(null);
      onSelectText?.(null);
      marquee.onPointerDown(e);
      return;
    }

    const layer = currentImageState[uid];
    if (!layer) return;

    switch (layer.type) {
      case "text":
        onSelectImage?.(null);
        onSelectText?.(uid);
        onSwitchTab?.("text");
        drag.setSelected([uid]);
        drag.onPointerDown(e, uid);
        break;
      case "image":
        onSelectText?.(null);
        onSelectImage?.(uid);
        drag.setSelected([uid]);
        drag.onPointerDown(e, uid);
        onSwitchTab?.(layer.isClipart ? "clipart" : "upload");
        break;
    }
  };

  // ---------------- Render ----------------
  return (
    <div
      ref={canvasRef}
      className="flex-1 relative bg-gray-200 dark:bg-gray-800"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={marquee.onPointerMove}
    >
      <MainProductImage src={currentViewImage} />
      <RestrictedArea box={restrictedBox} />

      <UploadedImagesLayer
        uids={visualUids}
        positions={positions}
        sizes={sizes}
        imageState={currentImageState}
        selected={drag.selected}
        hovered={marquee.hovered}
        onPointerDown={drag.onPointerDown}
      />

      {Object.entries(currentImageState)
        .filter(([_, layer]) => layer.type === "text")
        .map(([uid, layer]) => {
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
                setSizes(prev => ({ ...prev, [uid]: { w, h } }));
              }}
            />
          );
        })}

      {selectedImages.length > 0 && (
        <SelectionBox
          selectedImages={selectedImages}
          canvasRef={drag.selectionBoxProps.canvasRef}
          onDuplicate={handleDuplicateFromSelectionBox}
          onStartGroupResize={direction => groupResize.startResize(direction)}
          onDelete={handleDeleteFromSelectionBox}
          onResize={drag.selectionBoxProps.onResize}
          onDeselectAll={drag.selectionBoxProps.onDeselectAll}
        />
      )}

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
          imageState={currentImageState}
          sizes={sizes}
        />
      )}

      <SelectionWatcher
        selected={drag.selected}
        imageState={currentImageState}
        onSelectImage={onSelectImage}
        onSelectText={onSelectText}
        onSwitchTab={onSwitchTab}
        onSelectionChange={props.onSelectionChange}
      />

      <ProductViewSelector
        images={props.productViewImages ?? {}}
        onSelectView={(imageSrc, key) => {
          setCurrentViewKey(key);
          setCurrentViewImage(imageSrc);
        }}
      />

      <Marquee marquee={marquee.marquee} />

      {/* Bottom Right Buttons */}
      <div className="absolute bottom-6 right-6 flex gap-4 z-50">
        <SaveDesignButton onClick={onSaveDesign ?? (() => {})} />
        <GetPriceButton onClick={onGetPrice ?? (() => {})} />
      </div>
    </div>
  );
}
