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
import type { ViewKey } from "../types/designTypes";

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
  textAlign?: TextAlign;
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
  canvasPositions?: Record<string, { x: number; y: number }>;
};

export default function Canvas(props: CanvasProps) {
  const {
    canvasRef,
    restrictedBox,
    canvasPositions,
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    uid: string;
  } | null>(null);

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
    currentViewKey,
    canvasPositions
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

  useEffect(() => {
    if (!setViewImageStates) return;

    setViewImageStates(prev => {
      const currentViewState = prev[currentViewKey] ?? {};
      let nextViewState = currentViewState;
      let hasChanges = false;

      Object.entries(positions).forEach(([uid, position]) => {
        const layer = currentViewState[uid];
        if (!layer) return;

        const layerSize = sizes[uid] ?? layer.size;
        if (!layerSize) return;

        const desiredCanvasPosition = {
          x: Number(position.x.toFixed(2)),
          y: Number(position.y.toFixed(2)),
          width: layerSize.w,
          height: layerSize.h,
          scale: layer.canvasPositions?.[currentViewKey]?.scale ?? 1,
          relX:
            restrictedBox.width > 0
              ? Number(
                  ((position.x - restrictedBox.left) / restrictedBox.width).toFixed(6)
                )
              : undefined,
          relY:
            restrictedBox.height > 0
              ? Number(
                  ((position.y - restrictedBox.top) / restrictedBox.height).toFixed(6)
                )
              : undefined,
          relW:
            restrictedBox.width > 0
              ? Number((layerSize.w / restrictedBox.width).toFixed(6))
              : undefined,
          relH:
            restrictedBox.height > 0
              ? Number((layerSize.h / restrictedBox.height).toFixed(6))
              : undefined,
        };

        const existingCanvasPosition = layer.canvasPositions?.[currentViewKey];
        const isSamePosition =
          existingCanvasPosition &&
          Math.abs(existingCanvasPosition.x - desiredCanvasPosition.x) < 0.05 &&
          Math.abs(existingCanvasPosition.y - desiredCanvasPosition.y) < 0.05 &&
          existingCanvasPosition.width === desiredCanvasPosition.width &&
          existingCanvasPosition.height === desiredCanvasPosition.height &&
          existingCanvasPosition.relX === desiredCanvasPosition.relX &&
          existingCanvasPosition.relY === desiredCanvasPosition.relY &&
          existingCanvasPosition.relW === desiredCanvasPosition.relW &&
          existingCanvasPosition.relH === desiredCanvasPosition.relH;

        if (isSamePosition) {
          return;
        }

        nextViewState = {
          ...nextViewState,
          [uid]: {
            ...layer,
            canvasPositions: {
              ...(layer.canvasPositions ?? {}),
              [currentViewKey]: desiredCanvasPosition,
            },
          },
        };

        hasChanges = true;
      });

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        [currentViewKey]: nextViewState,
      };
    });
  }, [
    currentViewKey,
    positions,
    sizes,
    restrictedBox.left,
    restrictedBox.top,
    restrictedBox.width,
    restrictedBox.height,
    setViewImageStates,
  ]);

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

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (compactPriceMode) return;
    e.preventDefault();

    const target = e.target as HTMLElement;
    const uid = (target.closest("[data-uid]") as HTMLElement | null)?.dataset.uid;
    if (!uid) {
      setContextMenu(null);
      return;
    }

    const layer = currentImageState[uid];
    if (!layer) {
      setContextMenu(null);
      return;
    }

    drag.setSelected([uid]);
    if (layer.type === "text") {
      onSelectImage?.(null);
      onSelectText?.(uid);
      onSwitchTab?.("text");
    } else {
      onSelectText?.(null);
      onSelectImage?.(uid);
      onSwitchTab?.(layer.isClipart ? "clipart" : "upload");
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      uid,
    });
  };

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = (event?: MouseEvent) => {
      const target = event?.target as HTMLElement | null;
      if (target?.closest('[data-design-context-menu="true"]')) {
        return;
      }
      setContextMenu(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [contextMenu]);

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
          textAlign: layer.textAlign,
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
      onContextMenu={handleCanvasContextMenu}
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
          const savedViewPosition = layer.canvasPositions?.[currentViewKey];
          const fontSize = layer.fontSize ?? 24;
          const size = sizes[uid] ?? layer.size ?? { w: 1, h: fontSize };
          const fallbackX = restrictedBox.left + (restrictedBox.width - size.w) / 2;
          const fallbackY = restrictedBox.top + (restrictedBox.height - size.h) / 2;
          const p =
            positions[uid] ??
            (savedViewPosition
              ? { x: Number(savedViewPosition.x), y: Number(savedViewPosition.y) }
              : { x: fallbackX, y: fallbackY });
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

      {contextMenu && !compactPriceMode && (
        <div
          data-design-context-menu="true"
          data-export-ignore="true"
          className="fixed z-[12000] min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white/95 py-1 shadow-2xl backdrop-blur-sm"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
            onClick={() => {
              duplicateImages([contextMenu.uid]);
              setContextMenu(null);
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            onClick={() => {
              if (props.onDelete) {
                props.onDelete([contextMenu.uid]);
              }
              drag.setSelected([]);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {!compactPriceMode && (
        <div
          data-export-ignore="true"
          className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 md:gap-4"
        >
          <SaveDesignButton onClick={onSaveDesign ?? (() => {})} />
          <GetPriceButton onClick={onGetPrice ?? (() => {})} />
        </div>
      )}
    </div>
  );
}
