"use client";

import { FlipHorizontal, FlipVertical } from "lucide-react";

import ActionButtons from "./ActionButtons";
import ClipartSizeControls from "../ClipartSideBar/Properties/ClipartSizeControls";
import { getClampedSize } from "../ClipartSideBar/Properties/utils/getClampedSize";
import type { ImageState } from "./UploadSidebar";

type ImageEditorProps = {
  selectedImage: string;
  layer: ImageState;
  positions: Record<string, { x: number; y: number }>;
  restrictedBox?: { left: number; top: number; width: number; height: number };
  canvasRef: React.RefObject<HTMLDivElement>;

  onResize?: (w: number, h: number) => void;
  onRotateImage?: (id: string, rotation: number) => void;
  onFlipImage?: (id: string, flip: "none" | "horizontal" | "vertical") => void;
  onDuplicateUploadedImage?: (id: string) => void;
  onRemoveUploadedImage?: (id: string) => void;
  onResetImage?: (id: string) => void;
  onCrop?: () => void;
};

export default function ImageEditor({
  canvasRef,
  selectedImage,
  layer,
  positions,
  restrictedBox,
  onResize,
  onRotateImage,
  onFlipImage,
  onDuplicateUploadedImage,
  onRemoveUploadedImage,
  onResetImage,
  onCrop,
}: ImageEditorProps) {
  if (!layer || !selectedImage || !canvasRef.current) return null;

  const fallbackCanvasRect = canvasRef.current.getBoundingClientRect();
  const box = restrictedBox ?? {
    left: 0,
    top: 0,
    width: fallbackCanvasRect.width,
    height: fallbackCanvasRect.height,
  };
  const canvasRect = canvasRef.current.getBoundingClientRect();
  const selectedEl = canvasRef.current.querySelector<HTMLElement>(
    `[data-uid="${CSS.escape(selectedImage)}"]`
  );
  const livePosition = selectedEl
    ? {
        x: selectedEl.getBoundingClientRect().left - canvasRect.left,
        y: selectedEl.getBoundingClientRect().top - canvasRect.top,
      }
    : null;

  const position =
    livePosition ??
    positions[selectedImage] ??
    layer.canvasPositions?.[selectedImage] ?? {
      x: box.left,
      y: box.top,
    };
  const aspect = layer.size.h / layer.size.w;
  if (!Number.isFinite(aspect) || aspect <= 0) return null;

  const handleResize = (requestedWidth: number) => {
    const clampedWidth = Math.max(requestedWidth, 1);
    const localPosition = {
      x: position.x - box.left,
      y: position.y - box.top,
    };

    const result = getClampedSize({
      requestedWidth: clampedWidth,
      currentWidth: layer.size.w,
      currentHeight: layer.size.h,
      position: localPosition,
      restrictedBox: {
        width: box.width,
        height: box.height,
      },
    });
    if (!result) return;
    onResize?.(result.width, result.height);
  };

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      {/* SIZE */}
      <div className="space-y-2">
        <ClipartSizeControls
          value={layer.size.w}
          min={20}
          max={600}
          onChange={handleResize}
        />
      </div>

      {/* ROTATE */}
      <div className="space-y-2">
        <p className="font-semibold text-lg">Rotate</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={-180}
            max={180}
            value={layer.rotation ?? 0}
            onChange={(e) =>
              onRotateImage?.(selectedImage, Number(e.target.value))
            }
            className="flex-1"
          />
          <input
            type="number"
            min={-180}
            max={180}
            value={layer.rotation ?? 0}
            onChange={(e) =>
              onRotateImage?.(selectedImage, Number(e.target.value))
            }
            className="w-20 px-2 py-1 border rounded-lg font-mono text-right"
          />
        </div>
      </div>

      {/* FLIP */}
      <div className="space-y-2">
        <p className="font-semibold text-lg">Flip</p>
        <div className="flex gap-3">
          <button
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${
              layer.flip === "horizontal"
                ? "bg-blue-200"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() =>
              onFlipImage?.(
                selectedImage,
                layer.flip === "horizontal" ? "none" : "horizontal"
              )
            }
          >
            <FlipHorizontal size={18} />
            Horizontal
          </button>

          <button
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${
              layer.flip === "vertical"
                ? "bg-blue-200"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() =>
              onFlipImage?.(
                selectedImage,
                layer.flip === "vertical" ? "none" : "vertical"
              )
            }
          >
            <FlipVertical size={18} />
            Vertical
          </button>
        </div>
      </div>

      {/* ACTIONS */}
      <ActionButtons
        selectedImage={selectedImage}
        onDuplicateUploadedImage={onDuplicateUploadedImage}
        onRemoveUploadedImage={onRemoveUploadedImage}
        onResetImage={onResetImage}
        onCrop={onCrop}
      />
    </div>
  );
}
