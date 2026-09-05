import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { clampPosition } from "../Utils/clampPosition";

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function useTextAutoShrink({
  imageState,
  canvasRef,
  positions,
  sizes,
  restrictedBox,
  compactPriceMode,
  onResizeText,
  onRepositionText,
}: {
  imageState: Record<string, any>;
  canvasRef: RefObject<HTMLDivElement>;
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  restrictedBox: Box;
  compactPriceMode?: boolean;
  onResizeText?: (uid: string, newFontSize: number) => void;
  onRepositionText?: (uid: string, next: { x: number; y: number }) => void;
}) {
  const lastShrinkAtRef = useRef<Record<string, number>>({});
  const MIN_FONT_SIZE = 4;
  const SAFETY_SCALE = 0.98;

  useEffect(() => {
    if (compactPriceMode) return;
    const boxRight = restrictedBox.left + restrictedBox.width;
    const boxBottom = restrictedBox.top + restrictedBox.height;
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    Object.entries(imageState).forEach(([uid, layer]) => {
      if (layer.type !== "text") return;

      const el = document.querySelector<HTMLElement>(
        `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
      );

      let textRect: { x: number; y: number; w: number; h: number } | null = null;
      if (canvasRect && el) {
        const domRect = el.getBoundingClientRect();
        textRect = {
          x: domRect.left - canvasRect.left,
          y: domRect.top - canvasRect.top,
          w: domRect.width,
          h: domRect.height,
        };
      } else {
        const pos = positions[uid];
        const size = sizes[uid];
        if (pos && size) {
          textRect = { x: pos.x, y: pos.y, w: size.w, h: size.h };
        }
      }

      if (!textRect) return;

      const clampedBefore = clampPosition(
        textRect.x,
        textRect.y,
        textRect.w,
        textRect.h,
        restrictedBox
      );

      if (
        Math.abs(clampedBefore.x - (positions[uid]?.x ?? textRect.x)) > 0.1 ||
        Math.abs(clampedBefore.y - (positions[uid]?.y ?? textRect.y)) > 0.1
      ) {
        onRepositionText?.(uid, clampedBefore);
      }

      const rightOverflow = clampedBefore.x + textRect.w - boxRight;
      const bottomOverflow = clampedBefore.y + textRect.h - boxBottom;

      if (rightOverflow <= 0 && bottomOverflow <= 0) return;

      const startX = Math.max(clampedBefore.x, restrictedBox.left);
      const startY = Math.max(clampedBefore.y, restrictedBox.top);
      const availableWidth = Math.max(1, boxRight - startX);
      const availableHeight = Math.max(1, boxBottom - startY);

      const currentFontSize =
        layer.fontSize ?? sizes[uid]?.h ?? layer.size?.h ?? 16;
      if (currentFontSize <= MIN_FONT_SIZE) return;

      const widthScale = availableWidth / Math.max(textRect.w, 1);
      const heightScale = availableHeight / Math.max(textRect.h, 1);
      const targetScale = Math.min(widthScale, heightScale, 1) * SAFETY_SCALE;
      const nextSize = Math.max(MIN_FONT_SIZE, currentFontSize * targetScale);
      if (Math.abs(nextSize - currentFontSize) < 0.05) return;

      const now = Date.now();
      const last = lastShrinkAtRef.current[uid] ?? 0;
      if (now - last < 16) return;

      lastShrinkAtRef.current[uid] = now;

      const scale = nextSize / currentFontSize;
      const estimatedWidth = textRect.w * scale;
      const estimatedHeight = textRect.h * scale;
      const clampedAfter = clampPosition(
        clampedBefore.x,
        clampedBefore.y,
        estimatedWidth,
        estimatedHeight,
        restrictedBox
      );

      if (
        Math.abs(clampedAfter.x - clampedBefore.x) > 0.1 ||
        Math.abs(clampedAfter.y - clampedBefore.y) > 0.1
      ) {
        onRepositionText?.(uid, clampedAfter);
      }

      onResizeText?.(uid, Number(nextSize.toFixed(2)));
    });
  }, [
    canvasRef,
    positions,
    sizes,
    imageState,
    restrictedBox,
    compactPriceMode,
    onResizeText,
    onRepositionText,
  ]);
}
