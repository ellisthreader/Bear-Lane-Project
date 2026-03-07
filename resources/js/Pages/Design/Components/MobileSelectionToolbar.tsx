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
import type { ImageState } from "../types/designTypes";

type FlipValue = "none" | "horizontal" | "vertical";
type ToolId = "rotate" | "size" | "flip" | "color" | "resize-text" | "add-text";

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
  selectedPosition?: { x: number; y: number };
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
  onOpenFontPanel: () => void;
  onOpenOutlinePanel: () => void;
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
  onOpenFontPanel,
  onOpenOutlinePanel,
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

  const layerSize = selectedLayer.size ?? { w: 120, h: 120 };
  const widthValue = Math.round(layerSize.w ?? 120);
  const rotationValue = Math.round(selectedLayer.rotation ?? 0);
  const textSizeValue = Math.round(selectedLayer.fontSize ?? 24);
  const colorValue = selectedLayer.color ?? "#000000";
  const flipValue = (selectedLayer.flip ?? "none") as FlipValue;

  const applyImageWidth = (nextWidth: number) => {
    const aspect = (layerSize.h || 1) / Math.max(layerSize.w || 1, 1);
    const anchorX = Number.isFinite(selectedPosition?.x) ? Number(selectedPosition?.x) : restrictedBox.left;
    const anchorY = Number.isFinite(selectedPosition?.y) ? Number(selectedPosition?.y) : restrictedBox.top;
    const availableWidth = Math.max(20, restrictedBox.left + restrictedBox.width - anchorX);
    const availableHeight = Math.max(20, restrictedBox.top + restrictedBox.height - anchorY);
    const maxWidthByHeight = Math.max(20, availableHeight / Math.max(aspect, 0.0001));
    const maxWidth = Math.max(20, Math.floor(Math.min(availableWidth, maxWidthByHeight)));

    let width = clamp(nextWidth, 20, maxWidth);
    let height = width * aspect;
    const maxHeight = Math.max(20, Math.floor(availableHeight));
    if (height > maxHeight) height = maxHeight;
    if (height === maxHeight) {
      width = Math.min(width, height / Math.max(aspect, 0.0001));
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
    { id: "rotate", label: "Rotate", icon: <RotateCw className="h-4 w-4" />, onClick: () => setActiveTool("rotate"), active: activeTool === "rotate" },
    { id: "size", label: "Resize", icon: <MoveHorizontal className="h-4 w-4" />, onClick: () => setActiveTool("size"), active: activeTool === "size" },
    { id: "flip", label: "Flip", icon: <FlipHorizontal className="h-4 w-4" />, onClick: () => setActiveTool("flip"), active: activeTool === "flip" },
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-4 w-4" />, onClick: () => onDuplicate(selectedUid) },
    { id: "crop", label: "Crop", icon: <Crop className="h-4 w-4" />, onClick: () => onCrop(selectedUid) },
    { id: "reset", label: "Reset", icon: <RotateCcw className="h-4 w-4" />, onClick: () => onReset(selectedUid) },
  ];

  const textTools: ToolbarAction[] = [
    { id: "add-text", label: "Add Text", icon: <Type className="h-4 w-4" />, onClick: () => setActiveTool("add-text"), active: activeTool === "add-text" },
    { id: "color", label: "Colour", icon: <Palette className="h-4 w-4" />, onClick: () => setActiveTool("color"), active: activeTool === "color" },
    { id: "font", label: "Font", icon: <Type className="h-4 w-4" />, onClick: onOpenFontPanel },
    { id: "outline", label: "Outline", icon: <PaintBucket className="h-4 w-4" />, onClick: onOpenOutlinePanel },
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-4 w-4" />, onClick: () => onDuplicate(selectedUid) },
    { id: "resize-text", label: "Resize", icon: <MoveHorizontal className="h-4 w-4" />, onClick: () => setActiveTool("resize-text"), active: activeTool === "resize-text" },
  ];

  const clipartTools: ToolbarAction[] = [
    { id: "color", label: "Colour", icon: <Palette className="h-4 w-4" />, onClick: () => setActiveTool("color"), active: activeTool === "color" },
    { id: "rotate", label: "Rotate", icon: <RotateCw className="h-4 w-4" />, onClick: () => setActiveTool("rotate"), active: activeTool === "rotate" },
    { id: "flip", label: "Flip", icon: <FlipHorizontal className="h-4 w-4" />, onClick: () => setActiveTool("flip"), active: activeTool === "flip" },
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-4 w-4" />, onClick: () => onDuplicate(selectedUid) },
    { id: "change-art", label: "Change Art", icon: <PaintBucket className="h-4 w-4" />, onClick: onChangeArt },
    { id: "size", label: "Resize", icon: <MoveHorizontal className="h-4 w-4" />, onClick: () => setActiveTool("size"), active: activeTool === "size" },
  ];

  const tools = layerKind === "text" ? textTools : layerKind === "clipart" ? clipartTools : imageTools;
  const showOrderAction = activeTool === null && (canGoFront || canGoBack);
  const orderToFront = canGoFront || !canGoBack;

  const renderToolContent = () => {
    if (!activeTool) return null;

    if (activeTool === "rotate") {
      return (
        <>
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => onRotate(selectedUid, clamp(rotationValue - 1, -180, 180))}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800">{rotationValue}°</span>
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => onRotate(selectedUid, clamp(rotationValue + 1, -180, 180))}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input type="range" min={-180} max={180} value={rotationValue} onChange={(event) => onRotate(selectedUid, Number(event.target.value))} className="w-full" />
        </>
      );
    }

    if (activeTool === "size") {
      const aspect = (layerSize.h || 1) / Math.max(layerSize.w || 1, 1);
      const anchorX = Number.isFinite(selectedPosition?.x) ? Number(selectedPosition?.x) : restrictedBox.left;
      const anchorY = Number.isFinite(selectedPosition?.y) ? Number(selectedPosition?.y) : restrictedBox.top;
      const availableWidth = Math.max(20, restrictedBox.left + restrictedBox.width - anchorX);
      const availableHeight = Math.max(20, restrictedBox.top + restrictedBox.height - anchorY);
      const maxWidthByHeight = Math.max(20, availableHeight / Math.max(aspect, 0.0001));
      const maxWidth = Math.max(20, Math.floor(Math.min(availableWidth, maxWidthByHeight)));
      return (
        <>
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => applyImageWidth(widthValue - 2)}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800">{widthValue}px</span>
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => applyImageWidth(widthValue + 2)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input type="range" min={20} max={maxWidth} value={widthValue} onChange={(event) => applyImageWidth(Number(event.target.value))} className="w-full" />
        </>
      );
    }

    if (activeTool === "resize-text") {
      return (
        <>
          <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => onTextResize(selectedUid, clamp(textSizeValue - 1, 8, 240))}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800">{textSizeValue}px</span>
            <button type="button" className="rounded-lg bg-white px-2 py-1 text-gray-700" onClick={() => onTextResize(selectedUid, clamp(textSizeValue + 1, 8, 240))}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input type="range" min={8} max={240} value={textSizeValue} onChange={(event) => onTextResize(selectedUid, Number(event.target.value))} className="w-full" />
        </>
      );
    }

    if (activeTool === "flip") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFlip(selectedUid, flipValue === "horizontal" ? "none" : "horizontal")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              flipValue === "horizontal" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
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
          <button type="button" onClick={handleAddText} className="w-full rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
            Add to design
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {activeTool === "color" ? (
        <div className="fixed inset-0 z-[94] flex items-center justify-center px-6 md:hidden" data-export-ignore="true">
          <div className="w-full max-w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B]"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B]"
                aria-label="Done"
              >
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>
            <label className="block rounded-xl bg-gray-100 p-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">Colour</span>
              <input
                type="color"
                value={colorValue}
                onChange={(event) => onColor(selectedUid, event.target.value)}
                className="h-12 w-full cursor-pointer rounded-md border border-gray-300 bg-white"
              />
            </label>
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
        className="fixed inset-x-0 bottom-0 z-[92] border-t border-gray-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_26px_rgba(20,20,20,0.12)] backdrop-blur md:hidden"
        data-export-ignore="true"
      >
        {activeTool && activeTool !== "color" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B]"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B]"
                aria-label="Done"
              >
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>
            {renderToolContent()}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto" style={{ touchAction: "pan-x" }}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={tool.onClick}
                className={`inline-flex min-w-[78px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
                  tool.active ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
