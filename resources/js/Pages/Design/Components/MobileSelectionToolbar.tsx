"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Crop,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Minus,
  Palette,
  RotateCcw,
  RotateCw,
  Type,
  Plus,
  MoveHorizontal,
  PaintBucket,
} from "lucide-react";
import type { CanvasPosition, ImageState } from "../types/designTypes";

type FlipValue = "none" | "horizontal" | "vertical";
type ToolId =
  | "rotate"
  | "size"
  | "flip"
  | "color"
  | "resize-text"
  | "add-text"
  | "font"
  | "outline";

type ToolbarAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

type Props = {
  visible: boolean;
  selectedUid: string | null;
  selectedLayer: ImageState | null;
  selectedPosition?: CanvasPosition;
  selectedSize?: { w: number; h: number };
  canvasRef: React.RefObject<HTMLDivElement>;
  restrictedBox: { left: number; top: number; width: number; height: number };
  canGoFront: boolean;
  canGoBack: boolean;
  onBringToFront: (uid: string) => void;
  onSendToBack: (uid: string) => void;
  onRotate: (uid: string, angle: number) => void;
  onResize: (uid: string, width: number, height: number) => void;
  onFlip: (uid: string, flip: FlipValue) => void;
  onDuplicate: (uid: string) => void;
  onCrop: (uid: string) => void;
  onReset: (uid: string) => void;
  onColor: (uid: string, color: string) => void;
  onFontChange: (uid: string, font: string) => void;
  onBorderColorChange: (uid: string, color: string) => void;
  onBorderWidthChange: (uid: string, width: number) => void;
  onChangeArt: () => void;
  onAddText: (value: string) => Promise<boolean> | boolean;
  onTextResize: (uid: string, value: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function MobileSelectionToolbar({
  visible,
  selectedUid,
  selectedLayer,
  selectedPosition,
  selectedSize,
  canvasRef,
  restrictedBox,
  canGoFront,
  canGoBack,
  onBringToFront,
  onSendToBack,
  onRotate,
  onResize,
  onFlip,
  onDuplicate,
  onCrop,
  onReset,
  onColor,
  onFontChange,
  onBorderColorChange,
  onBorderWidthChange,
  onChangeArt,
  onAddText,
  onTextResize,
}: Props) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    setActiveTool(null);
    setDraftText("");
  }, [selectedUid]);

  if (!visible || !selectedUid || !selectedLayer) return null;

  const isText = selectedLayer.type === "text";
  const isClipart = Boolean(selectedLayer.isClipart);
  const layerKind: "image" | "text" | "clipart" = isText ? "text" : isClipart ? "clipart" : "image";

  const layerSize = selectedSize ?? selectedLayer.size ?? { w: 120, h: 120 };
  const widthValue = Math.round(layerSize.w ?? 120);
  const rotationValue = Math.round(selectedLayer.rotation ?? 0);
  const textSizeValue = Math.round(selectedLayer.fontSize ?? 24);
  const colorValue = selectedLayer.color ?? "#000000";
  const borderColorValue = selectedLayer.borderColor ?? "#000000";
  const borderWidthValue = Math.round(selectedLayer.borderWidth ?? 0);
  const fontFamilyValue = selectedLayer.fontFamily ?? "Arial";
  const flipValue = (selectedLayer.flip ?? "none") as FlipValue;
  const fontOptions = ["Arial", "Inter", "Montserrat", "Poppins", "Roboto Slab", "Georgia"];

  const popupStyle = (() => {
    return {
      left: 8,
      right: 8,
      bottom: "calc(max(0.55rem,env(safe-area-inset-bottom)) + 76px)",
    } as React.CSSProperties;
  })();

  const applyImageWidth = (nextWidth: number) => {
    const aspect = (layerSize.h || 1) / Math.max(layerSize.w || 1, 1);
    const maxWidth = Math.max(20, Math.round(restrictedBox.width || 600));
    const maxHeight = Math.max(20, Math.round(restrictedBox.height || 600));

    let width = clamp(nextWidth, 20, maxWidth);
    let height = width * aspect;

    if (height > maxHeight) {
      height = maxHeight;
      width = height / aspect;
    }

    onResize(selectedUid, width, height);
  };

  const handleAddText = async () => {
    const value = draftText.trim();
    if (!value) return;
    const result = await onAddText(value);
    if (result !== false) {
      setDraftText("");
      setActiveTool(null);
    }
  };

  const imageTools: ToolbarAction[] = [
    {
      id: "rotate",
      label: "Rotate",
      icon: <RotateCw className="h-4 w-4" />,
      onClick: () => setActiveTool("rotate"),
      active: activeTool === "rotate",
    },
    {
      id: "size",
      label: "Size",
      icon: <MoveHorizontal className="h-4 w-4" />,
      onClick: () => setActiveTool("size"),
      active: activeTool === "size",
    },
    {
      id: "flip",
      label: "Flip",
      icon: <FlipHorizontal className="h-4 w-4" />,
      onClick: () => setActiveTool("flip"),
      active: activeTool === "flip",
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy className="h-4 w-4" />,
      onClick: () => onDuplicate(selectedUid),
    },
    {
      id: "crop",
      label: "Crop",
      icon: <Crop className="h-4 w-4" />,
      onClick: () => onCrop(selectedUid),
    },
    {
      id: "reset",
      label: "Reset",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: () => onReset(selectedUid),
    },
  ];

  const textTools: ToolbarAction[] = [
    {
      id: "add-text",
      label: "Add Text",
      icon: <Type className="h-4 w-4" />,
      onClick: () => setActiveTool("add-text"),
      active: activeTool === "add-text",
    },
    {
      id: "color",
      label: "Colour",
      icon: <Palette className="h-4 w-4" />,
      onClick: () => setActiveTool("color"),
      active: activeTool === "color",
    },
    {
      id: "font",
      label: "Font",
      icon: <Type className="h-4 w-4" />,
      onClick: () => setActiveTool("font"),
      active: activeTool === "font",
    },
    {
      id: "outline",
      label: "Outline",
      icon: <PaintBucket className="h-4 w-4" />,
      onClick: () => setActiveTool("outline"),
      active: activeTool === "outline",
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy className="h-4 w-4" />,
      onClick: () => onDuplicate(selectedUid),
    },
    {
      id: "resize-text",
      label: "Resize",
      icon: <MoveHorizontal className="h-4 w-4" />,
      onClick: () => setActiveTool("resize-text"),
      active: activeTool === "resize-text",
    },
  ];

  const clipartTools: ToolbarAction[] = [
    {
      id: "color",
      label: "Colour",
      icon: <Palette className="h-4 w-4" />,
      onClick: () => setActiveTool("color"),
      active: activeTool === "color",
    },
    {
      id: "rotate",
      label: "Rotate",
      icon: <RotateCw className="h-4 w-4" />,
      onClick: () => setActiveTool("rotate"),
      active: activeTool === "rotate",
    },
    {
      id: "flip",
      label: "Flip",
      icon: <FlipHorizontal className="h-4 w-4" />,
      onClick: () => setActiveTool("flip"),
      active: activeTool === "flip",
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy className="h-4 w-4" />,
      onClick: () => onDuplicate(selectedUid),
    },
    {
      id: "change-art",
      label: "Change Art",
      icon: <Wand2 className="h-4 w-4" />,
      onClick: onChangeArt,
    },
    {
      id: "size",
      label: "Resize",
      icon: <MoveHorizontal className="h-4 w-4" />,
      onClick: () => setActiveTool("size"),
      active: activeTool === "size",
    },
  ];

  const tools = layerKind === "text" ? textTools : layerKind === "clipart" ? clipartTools : imageTools;

  const renderPopupBody = () => {
    if (!activeTool) return null;

    if (activeTool === "rotate") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => onRotate(selectedUid, clamp(rotationValue - 1, -180, 180))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#3D2F1A]">{rotationValue}°</span>
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => onRotate(selectedUid, clamp(rotationValue + 1, -180, 180))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotationValue}
            onChange={(event) => onRotate(selectedUid, Number(event.target.value))}
            className="w-full"
          />
        </div>
      );
    }

    if (activeTool === "size") {
      const maxWidth = Math.max(20, Math.round(restrictedBox.width || 600));
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => applyImageWidth(widthValue - 2)}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#3D2F1A]">{widthValue}px</span>
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => applyImageWidth(widthValue + 2)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="range"
            min={20}
            max={maxWidth}
            value={widthValue}
            onChange={(event) => applyImageWidth(Number(event.target.value))}
            className="w-full"
          />
        </div>
      );
    }

    if (activeTool === "resize-text") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => onTextResize(selectedUid, clamp(textSizeValue - 1, 8, 240))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#3D2F1A]">{textSizeValue}px</span>
            <button
              type="button"
              className="rounded-lg bg-white px-2 py-1 text-gray-700"
              onClick={() => onTextResize(selectedUid, clamp(textSizeValue + 1, 8, 240))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="range"
            min={8}
            max={240}
            value={textSizeValue}
            onChange={(event) => onTextResize(selectedUid, Number(event.target.value))}
            className="w-full"
          />
        </div>
      );
    }

    if (activeTool === "flip") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFlip(selectedUid, flipValue === "horizontal" ? "none" : "horizontal")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              flipValue === "horizontal"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <FlipHorizontal className="h-4 w-4" />
            Horizontal
          </button>
          <button
            type="button"
            onClick={() => onFlip(selectedUid, flipValue === "vertical" ? "none" : "vertical")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              flipValue === "vertical" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <FlipVertical className="h-4 w-4" />
            Vertical
          </button>
        </div>
      );
    }

    if (activeTool === "color") {
      return (
        <label className="block rounded-xl bg-gray-100 p-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">Colour</span>
          <input
            type="color"
            value={colorValue}
            onChange={(event) => onColor(selectedUid, event.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white"
          />
        </label>
      );
    }

    if (activeTool === "font") {
      return (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">Font</div>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((font) => {
              const isActive = fontFamilyValue.toLowerCase() === font.toLowerCase();
              return (
                <button
                  key={font}
                  type="button"
                  onClick={() => onFontChange(selectedUid, font)}
                  className={`rounded-lg border px-2 py-2 text-sm ${
                    isActive ? "border-gray-500 bg-gray-100 text-gray-900" : "border-gray-200 bg-white text-gray-700"
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeTool === "outline") {
      return (
        <div className="space-y-3">
          <label className="block rounded-xl bg-gray-100 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">Outline colour</span>
            <input
              type="color"
              value={borderColorValue}
              onChange={(event) => onBorderColorChange(selectedUid, event.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white"
            />
          </label>
          <label className="block rounded-xl bg-gray-100 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">Outline width</span>
            <input
              type="range"
              min={0}
              max={20}
              value={borderWidthValue}
              onChange={(event) => onBorderWidthChange(selectedUid, Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>
      );
    }

    if (activeTool === "add-text") {
      return (
        <div className="space-y-3">
          <input
            type="text"
            value={draftText}
            maxLength={260}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Add text"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
          <button
            type="button"
            onClick={handleAddText}
            className="w-full rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Add to design
          </button>
        </div>
      );
    }

    return null;
  };

  const orderToFront = canGoFront || !canGoBack;
  const showOrderAction = canGoFront || canGoBack;

  return (
    <>
      {activeTool ? (
        <div className="fixed inset-0 z-[96] md:hidden" data-export-ignore="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/10"
            onClick={() => setActiveTool(null)}
            aria-label="Close tool panel"
          />
          <div className="absolute rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl" style={popupStyle}>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </button>
            </div>
            {renderPopupBody()}
          </div>
        </div>
      ) : null}

      {showOrderAction ? (
        <div className="fixed inset-x-0 bottom-[78px] z-[93] flex justify-center px-4 md:hidden" data-export-ignore="true">
          <button
            type="button"
            onClick={() => (orderToFront ? onBringToFront(selectedUid) : onSendToBack(selectedUid))}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/96 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md"
          >
            <Layers className="h-3.5 w-3.5" />
            {orderToFront ? "Send to front" : "Send to back"}
          </button>
        </div>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-[92] border-t border-gray-200 bg-white/96 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(20,20,20,0.16)] md:hidden"
        data-export-ignore="true"
      >
        <div className="flex gap-2 overflow-x-auto" style={{ touchAction: "pan-x" }}>
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={tool.onClick}
              className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                tool.active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              <span>{tool.icon}</span>
              <span className="mt-1 leading-none">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
