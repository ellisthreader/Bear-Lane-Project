"use client";

import React, { useRef, useState, useEffect } from "react";
import { Image as ImageIcon, Type as TypeIcon, Upload as UploadIcon } from "lucide-react";
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

import ProductViewSelector from "../Components/ProductViewSelector";
import type { ViewKey } from "../types/designTypes";

export type ImageState = {
  url?: string;
  type: "image" | "text" | "clipart";
  zIndex?: number;
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
  clearSelectionSignal?: number;
  productViewImages?: {
    front: string;
    back: string;
    leftSleeve: string;
    rightSleeve: string;
  };
  onViewSnapshotChange?: (viewKey: ViewKey, snapshot: PricePreviewSnapshot) => void;
  compactPriceMode?: boolean;
  canvasPositions?: Record<string, { x: number; y: number }>;
  showMobilePropertiesBar?: boolean;
  showMobileStarterActions?: boolean;
  onOpenUploadFromStarter?: () => void;
  onOpenTextFromStarter?: () => void;
  onOpenClipartFromStarter?: () => void;
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
    onViewSnapshotChange,
    clearSelectionSignal,
    compactPriceMode = false,
    showMobilePropertiesBar = true,
    showMobileStarterActions = false,
    onOpenUploadFromStarter,
    onOpenTextFromStarter,
    onOpenClipartFromStarter,
  } = props;

  const latestUploadedImageRef = useRef<string | null>(null);
  const [currentViewImage, setCurrentViewImage] = useState(mainImage);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    uid: string;
  } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsMobileViewport(query.matches);
    syncViewport();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", syncViewport);
      return () => query.removeEventListener("change", syncViewport);
    }

    query.addListener(syncViewport);
    return () => query.removeListener(syncViewport);
  }, []);

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

  useEffect(() => {
    drag.setSelected([]);
  }, [clearSelectionSignal]);

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

  const handleUnifiedGroupResize = (startClientX: number, _pointerType?: string) => {
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

    const onMove = (e: PointerEvent) => {
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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

  const selectedSingleUid = drag.selected.length === 1 ? drag.selected[0] : null;
  const selectedSingleLayer = selectedSingleUid
    ? currentImageState[selectedSingleUid]
    : null;
  const selectedSingleSize = selectedSingleUid
    ? sizes[selectedSingleUid] ?? selectedSingleLayer?.size
    : undefined;

  const updateLayer = (uid: string, updates: Partial<ImageState>) => {
    updateCurrentImageState(prev => {
      const current = prev[uid];
      if (!current) return prev;
      return {
        ...prev,
        [uid]: {
          ...current,
          ...updates,
        },
      };
    });
  };

  const updateLayerSize = (uid: string, requestedWidth: number) => {
    const layer = currentImageState[uid];
    const currentSize = sizes[uid] ?? layer?.size;
    if (!layer || !currentSize || currentSize.w <= 0 || currentSize.h <= 0) return;

    const aspect = currentSize.h / currentSize.w;
    if (!Number.isFinite(aspect) || aspect <= 0) return;

    const maxWidth = Math.max(20, Math.round(restrictedBox.width || 600));
    const maxHeight = Math.max(20, Math.round(restrictedBox.height || 600));
    let width = Math.max(20, Math.min(requestedWidth, maxWidth));
    let height = width * aspect;

    if (height > maxHeight) {
      height = maxHeight;
      width = height / aspect;
    }

    setSizes(prev => ({
      ...prev,
      [uid]: { w: width, h: height },
    }));

    updateLayer(uid, {
      size: { w: width, h: height },
    });
  };

  const renderMobilePropertiesBar = () => {
    if (
      !isMobileViewport ||
      compactPriceMode ||
      !selectedSingleUid ||
      !selectedSingleLayer
    ) {
      return null;
    }

    const isText = selectedSingleLayer.type === "text";
    const isClipart = Boolean(selectedSingleLayer.isClipart);
    const widthValue = Math.round(selectedSingleSize?.w ?? 150);
    const rotationValue = Math.round(selectedSingleLayer.rotation ?? 0);
    const fontSizeValue = Math.round(selectedSingleLayer.fontSize ?? 24);
    const canTint = isText || isClipart;
    const tintColor = selectedSingleLayer.color ?? "#000000";
    const flipValue = selectedSingleLayer.flip ?? "none";

    return (
      <div
        data-export-ignore="true"
        className="absolute bottom-[88px] left-0 right-0 z-[65] px-3 md:hidden"
      >
        <div className="rounded-2xl border border-gray-200 bg-white/95 px-2 py-2 shadow-[0_10px_26px_rgba(20,20,20,0.18)] backdrop-blur">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ touchAction: "pan-x" }}
          >
            {!isText ? (
              <label className="flex min-w-[180px] flex-col gap-1 rounded-xl bg-gray-100 p-2 text-xs font-medium text-gray-700">
                Size
                <input
                  type="range"
                  min={20}
                  max={Math.max(20, Math.round(restrictedBox.width || 600))}
                  value={widthValue}
                  onChange={(event) =>
                    updateLayerSize(selectedSingleUid, Number(event.target.value))
                  }
                />
                <span>{widthValue}px</span>
              </label>
            ) : (
              <label className="flex min-w-[180px] flex-col gap-1 rounded-xl bg-gray-100 p-2 text-xs font-medium text-gray-700">
                Font Size
                <input
                  type="range"
                  min={8}
                  max={240}
                  value={fontSizeValue}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    updateLayer(selectedSingleUid, { fontSize: nextValue });
                    onResizeTextCommit(selectedSingleUid, nextValue);
                  }}
                />
                <span>{fontSizeValue}px</span>
              </label>
            )}

            <label className="flex min-w-[180px] flex-col gap-1 rounded-xl bg-gray-100 p-2 text-xs font-medium text-gray-700">
              Rotation
              <input
                type="range"
                min={-180}
                max={180}
                value={rotationValue}
                onChange={(event) =>
                  updateLayer(selectedSingleUid, {
                    rotation: Number(event.target.value),
                  })
                }
              />
              <span>{rotationValue}°</span>
            </label>

            {canTint ? (
              <label className="flex min-w-[132px] flex-col gap-1 rounded-xl bg-gray-100 p-2 text-xs font-medium text-gray-700">
                Color
                <input
                  type="color"
                  value={tintColor}
                  onChange={(event) =>
                    updateLayer(selectedSingleUid, { color: event.target.value })
                  }
                  className="h-9 w-full cursor-pointer rounded-md border border-gray-300 bg-transparent"
                />
              </label>
            ) : null}

            <div className="flex min-w-[210px] items-end gap-2 rounded-xl bg-gray-100 p-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  flipValue === "horizontal"
                    ? "bg-[#C6A75E] text-white"
                    : "bg-white text-gray-700 hover:bg-[#C6A75E]/15"
                }`}
                onClick={() =>
                  updateLayer(selectedSingleUid, {
                    flip: flipValue === "horizontal" ? "none" : "horizontal",
                  })
                }
              >
                Flip X
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  flipValue === "vertical"
                    ? "bg-[#C6A75E] text-white"
                    : "bg-white text-gray-700 hover:bg-[#C6A75E]/15"
                }`}
                onClick={() =>
                  updateLayer(selectedSingleUid, {
                    flip: flipValue === "vertical" ? "none" : "vertical",
                  })
                }
              >
                Flip Y
              </button>
            </div>

            <div className="flex min-w-[210px] items-end gap-2 rounded-xl bg-gray-100 p-2">
              <button
                type="button"
                className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                onClick={() => duplicateImages([selectedSingleUid])}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                onClick={() => {
                  props.onDelete?.([selectedSingleUid]);
                  drag.setSelected([]);
                  onSelectImage?.(null);
                  onSelectText?.(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
    if (target.closest('[data-export-ignore="true"]')) return;
    if (target.closest(".selection-button")) return;

    if (e.pointerType === "touch") {
      e.preventDefault();
    }

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
      style={{ touchAction: compactPriceMode ? "auto" : "none" }}
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
              zIndex={layer.zIndex ?? 50}
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

      {showMobileStarterActions ? (
        <div
          data-export-ignore="true"
          className="pointer-events-none absolute inset-0 z-[68] flex items-center justify-center px-4 md:hidden"
        >
          <div className="pointer-events-auto grid w-full max-w-[320px] grid-cols-1 gap-3">
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => onOpenUploadFromStarter?.()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-700 shadow-md"
            >
              <UploadIcon className="h-4 w-4 text-[#8A6D2B]" />
              Upload
            </button>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => onOpenTextFromStarter?.()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-700 shadow-md"
            >
              <TypeIcon className="h-4 w-4 text-[#8A6D2B]" />
              Add text
            </button>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => onOpenClipartFromStarter?.()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm font-semibold text-gray-700 shadow-md"
            >
              <ImageIcon className="h-4 w-4 text-[#8A6D2B]" />
              Add clipart
            </button>
          </div>
        </div>
      ) : null}

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

      {showMobilePropertiesBar ? renderMobilePropertiesBar() : null}
    </div>
  );
}
