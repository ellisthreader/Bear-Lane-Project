"use client";

import React, { useRef, useState, useEffect } from "react";
import UploadedImagesLayer from "./UploadedImagesLayer";
import MainProductImage from "./MainProductImage";
import RestrictedArea from "./RestrictedArea";
import Marquee from "./Marquee";
import SelectionBox from "../SelectionBox";

import { useDragSelection } from "./Hooks/useDragSelection";
import { useMarqueeSelection } from "./Hooks/useMarqueeSelection";
import { useImageSizes } from "./Hooks/useImageSizes";
import { useImagePositions } from "./Hooks/useImagePositions";
import { useDuplicateImages } from "./Hooks/useDuplicateImages";
import DraggableText from "./DraggableText";
import SelectionWatcher from "../Components/SelectionWatcher";
import { useTextAutoShrink } from "./Hooks/TextAutoShrink";

import { DEFAULT_TEXT_ALIGN, type TextAlign } from "../Types/Text";

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
  textAlign?: TextAlign;
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
  compactPriceMode?: boolean;
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
    compactPriceMode = false,
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
  const { positions, setPositions } = useImagePositions(
    allUids,
    sizes,
    restrictedBox,
    currentImageState,
    currentViewKey
  );

  // ---------------- Text Auto Shrink ----------------
  useTextAutoShrink({
    imageState: currentImageState,
    canvasRef,
    positions,
    sizes,
    restrictedBox,
    compactPriceMode,
    onResizeText: onResizeTextCommit,
    onRepositionText: (uid, next) => {
      setPositions(prev => {
        const current = prev[uid];
        if (
          current &&
          Math.abs(current.x - next.x) < 0.1 &&
          Math.abs(current.y - next.y) < 0.1
        ) {
          return prev;
        }
        return {
          ...prev,
          [uid]: next,
        };
      });
    },
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
    drag.setSelected([]);
  };

  const handleUnifiedGroupResize = (startClientX: number) => {
    if (drag.selected.length === 0) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const startState = drag.selected
      .map(uid => {
        const layer = currentImageState[uid];
        const position = positions[uid];
        const measuredSize = sizes[uid];
        const el = document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(uid)}"]`);
        const rect = el?.getBoundingClientRect();
        const fallbackSize = rect ? { w: rect.width, h: rect.height } : undefined;
        const fallbackPosition = rect
          ? { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top }
          : undefined;

        const size = measuredSize ?? fallbackSize;
        const pos = position ?? fallbackPosition;
        if (!layer || !size || !pos) return null;

        return {
          uid,
          type: layer.type,
          fontSize: layer.fontSize ?? 24,
          size: { ...size },
          position: { ...pos },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (startState.length === 0) return;

    const boxLeft = Math.min(...startState.map(item => item.position.x));
    const boxTop = Math.min(...startState.map(item => item.position.y));
    const boxRight = Math.max(...startState.map(item => item.position.x + item.size.w));
    const boxBottom = Math.max(...startState.map(item => item.position.y + item.size.h));
    const boxWidth = boxRight - boxLeft;
    const boxHeight = boxBottom - boxTop;
    if (boxWidth <= 0 || boxHeight <= 0) return;

    const onMove = (e: MouseEvent) => {
      let scale = Math.exp((e.clientX - startClientX) / 200);

      if (restrictedBox) {
        const right = restrictedBox.left + restrictedBox.width;
        const bottom = restrictedBox.top + restrictedBox.height;
        let maxScale = Infinity;
        maxScale = Math.min(maxScale, (right - boxLeft) / boxWidth);
        maxScale = Math.min(maxScale, (bottom - boxTop) / boxHeight);
        maxScale = Math.max(0.01, maxScale);
        scale = Math.min(scale, maxScale);
      }

      setSizes(prev => {
        const next = { ...prev };
        startState.forEach(item => {
          next[item.uid] = {
            w: item.size.w * scale,
            h: item.size.h * scale,
          };
        });
        return next;
      });

      setPositions(prev => {
        const next = { ...prev };
        startState.forEach(item => {
          const rx = item.position.x - boxLeft;
          const ry = item.position.y - boxTop;
          next[item.uid] = {
            x: boxLeft + rx * scale,
            y: boxTop + ry * scale,
          };
        });
        return next;
      });

      updateCurrentImageState(prev => {
        const next = { ...prev };
        startState.forEach(item => {
          const existing = next[item.uid];
          if (!existing) return;

          next[item.uid] = {
            ...existing,
            size: {
              w: item.size.w * scale,
              h: item.size.h * scale,
            },
            ...(item.type === "text"
              ? { fontSize: Math.max(6, Math.round(item.fontSize * scale)) }
              : {}),
          };
        });
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
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
    if (!onViewSnapshotChange || compactPriceMode) return;
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
    compactPriceMode,
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
      className="flex-1 relative bg-gray-100"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={marquee.onPointerMove}
    >
      <MainProductImage src={currentViewImage} />
      {!compactPriceMode && <RestrictedArea box={restrictedBox} />}

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
              restrictedBox={restrictedBox}
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
              textAlign={layer.textAlign ?? DEFAULT_TEXT_ALIGN}
              fontSize={fontSize}
              onDuplicate={handleDuplicateFromTextProperties}
              onMeasure={(uid, w, h) => {
                setSizes(prev => ({ ...prev, [uid]: { w, h } }));
              }}
            />
          );
        })}

      {drag.selected.length > 0 && (
      <SelectionBox
        selectedImages={drag.selected}
        canvasRef={drag.selectionBoxProps.canvasRef}
        positions={positions}
        sizes={sizes}
        imageState={currentImageState}
        onDuplicate={handleDuplicateFromSelectionBox}
        onStartGroupResize={handleUnifiedGroupResize}
        onDelete={handleDeleteFromSelectionBox}
        onResize={drag.selectionBoxProps.onResize}
        onDeselectAll={drag.selectionBoxProps.onDeselectAll}
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

      {!compactPriceMode && (
        <ProductViewSelector
          images={props.productViewImages ?? {}}
          onSelectView={(imageSrc, key) => {
            setCurrentViewKey(key);
            setCurrentViewImage(imageSrc);
          }}
        />
      )}

      <Marquee marquee={marquee.marquee} />

      {compactPriceMode && (
        <div className="absolute inset-0 z-40 pointer-events-auto" />
      )}

      {!compactPriceMode && (
        <div className="absolute bottom-6 right-6 flex gap-4 z-50">
          <SaveDesignButton onClick={onSaveDesign ?? (() => {})} />
          <GetPriceButton onClick={onGetPrice ?? (() => {})} />
        </div>
      )}
    </div>
  );
}
