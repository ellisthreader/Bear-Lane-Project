"use client";

import { ArrowLeft, Trash2, Copy, RefreshCw } from "lucide-react";

import ColorPicker from "./ColorPicker";
import ChangeArtButton from "./ChangeArtButton";
import RotateControls from "./RotateControls";
import FlipControls from "./FlipControls";
import ClipartSizeControls from "./ClipartSizeControls";

import { getClampedSize } from "./utils/getClampedSize";

type Props = {
  layer: ImageState;

  restrictedBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  canvasPosition: {
    x: number;
    y: number;
  };

  onBack?: () => void;

  onRotate: (v: number) => void;
  onFlip: (v: "none" | "horizontal" | "vertical") => void;
  onResize: (w: number, h: number) => void;

  onChangeArt: () => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onReset: () => void;
  onDuplicate: () => void; // ✅ New prop
};

export default function ClipartProperties({
  layer,
  restrictedBox,
  canvasPosition,
  onBack,
  onRotate,
  onFlip,
  onResize,
  onChangeArt,
  onChangeColor,
  onDelete,
  onReset,
  onDuplicate, // ✅ New prop
}: Props) {
  const isSvg =
    layer.url?.endsWith(".svg") ||
    layer.src?.endsWith(".svg");

  









const handleResize = (requestedWidth: number) => {
  console.group("[CLIPART] handleResize");
  console.log("Slider input:", requestedWidth);

  // ✅ Prevent invalid values
  const clampedWidth = Math.max(requestedWidth, 1);
  console.log("Clamped width (min 1):", clampedWidth);

  // Current position
  const pos = canvasPosition ?? { x: 0, y: 0 };
  console.log("Canvas position:", pos);

  // Current layer size
  const currentSize = layer.size;
  console.log("Current layer size:", currentSize);

  // Normalized restricted box
  const normalizedRestrictedBox = {
    x: restrictedBox.x ?? 0,
    y: restrictedBox.y ?? 0,
    width: restrictedBox.width ?? 600,
    height: restrictedBox.height ?? 600,
  };
  console.log("Restricted box:", normalizedRestrictedBox);

  // Call clamp utility
  const result = getClampedSize({
    requestedWidth: clampedWidth,
    currentWidth: currentSize.w,
    currentHeight: currentSize.h,
    position: pos,
    restrictedBox: normalizedRestrictedBox,
  });

  console.log("Clamp result:", result);

  if (!result) {
    console.warn("[CLIPART] getClampedSize returned null — cannot resize without breaking constraints");
    console.groupEnd();
    return;
  }

  // Check if resized clipart touches the restricted box edges
  const touchesLeft = pos.x < normalizedRestrictedBox.x;
  const touchesTop = pos.y < normalizedRestrictedBox.y;
  const touchesRight =
    pos.x + result.width > normalizedRestrictedBox.x + normalizedRestrictedBox.width;
  const touchesBottom =
    pos.y + result.height > normalizedRestrictedBox.y + normalizedRestrictedBox.height;

  if (touchesLeft || touchesTop || touchesRight || touchesBottom) {
    console.warn(
      "[CLIPART] Layer touches/exceeds restricted box edges:",
      { touchesLeft, touchesTop, touchesRight, touchesBottom }
    );
  }

  // Update the size
  console.log("Updating clipart size to:", result.width, result.height);
  onResize(result.width, result.height);

  console.groupEnd();
};








  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto relative">
      {/* Back */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* SIZE */}
      <ClipartSizeControls
        value={layer.size.w}
        min={20}
        max={600}
        onChange={handleResize}
      />

      {/* ROTATE */}
      <RotateControls
        value={layer.rotation ?? 0}
        onRotate={onRotate}
      />

      {/* COLOR (SVG only) */}
      {isSvg && (
        <ColorPicker
          color={layer.color ?? "#000000"}
          onChangeColor={onChangeColor}
        />
      )}

      {/* FLIP */}
      <FlipControls
        value={layer.flip}
        onFlip={onFlip}
      />

      {/* Bottom actions */}
      <div className="space-y-4">
        {/* Change Art */}
        <ChangeArtButton
          onBack={onBack}
          onChangeArt={onChangeArt}
        />

        {/* Duplicate Clipart */}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold flex items-center justify-center gap-2 transition"
          >
            <Copy size={18} />
            Duplicate Clipart
          </button>
        )}

        <button
          onClick={onReset}
          className="w-full py-3 bg-red-100 text-red-700 rounded-xl flex items-center justify-center gap-2 hover:bg-red-200"
        >
          <RefreshCw size={18} />
          Reset To Original
        </button>

        {/* Delete Clipart */}
        <button
          onClick={onDelete}
          className="w-full py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold flex items-center justify-center gap-2 transition"
        >
          <Trash2 size={18} />
          Delete Clipart
        </button>
      </div>
    </div>
  );
}
