import { useEffect, useRef } from "react";
import type { RefObject } from "react";

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
  onResizeText,
  onRepositionText,
}: {
  imageState: Record<string, any>;
  canvasRef: RefObject<HTMLDivElement>;
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  restrictedBox: Box;
  onResizeText?: (uid: string, newFontSize: number) => void;
  onRepositionText?: (uid: string, next: { x: number; y: number }) => void;
}) {
  const lastShrinkAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    Object.entries(imageState).forEach(([uid, layer]) => {
      if (layer.type !== "text") return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const el = document.querySelector<HTMLElement>(
        `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
      );

      const domRect = el?.getBoundingClientRect();
      const pos = positions[uid];
      const size = sizes[uid];

      const textRect =
        canvasRect && domRect
          ? {
              x: domRect.left - canvasRect.left,
              y: domRect.top - canvasRect.top,
              w: domRect.width,
              h: domRect.height,
            }
          : pos && size
          ? {
              x: pos.x,
              y: pos.y,
              w: size.w,
              h: size.h,
            }
          : null;

      if (!textRect) return;

      const boxRight = restrictedBox.left + restrictedBox.width;
      const boxBottom = restrictedBox.top + restrictedBox.height;
      const leftOverflow = restrictedBox.left - textRect.x;
      const topOverflow = restrictedBox.top - textRect.y;
      const rightOverflow = textRect.x + textRect.w - boxRight;
      const bottomOverflow = textRect.y + textRect.h - boxBottom;

      // Keep text anchored inside the box when transform/measure drift pushes it
      // outside the left/top edges (commonly visible near minimum font size).
      if (leftOverflow > 0 || topOverflow > 0) {
        const baseX = pos?.x ?? textRect.x;
        const baseY = pos?.y ?? textRect.y;
        const nextX = baseX + Math.max(0, leftOverflow);
        const nextY = baseY + Math.max(0, topOverflow);

        if (Math.abs(nextX - baseX) > 0.1 || Math.abs(nextY - baseY) > 0.1) {
          onRepositionText?.(uid, { x: nextX, y: nextY });
        }
      }

      // Preemptively shrink when touching the right/bottom edge so text never leaks out.
      const edgeTolerance = 0.5;
      if (rightOverflow < -edgeTolerance && bottomOverflow < -edgeTolerance) return;

      const currentFontSize = layer.fontSize ?? size?.h ?? 16;
      const minFontSize = 4;
      if (currentFontSize <= minFontSize) return;

      const availableWidth = Math.max(1, boxRight - textRect.x);
      const availableHeight = Math.max(1, boxBottom - textRect.y);
      const widthScale = availableWidth / Math.max(1, textRect.w);
      const heightScale = availableHeight / Math.max(1, textRect.h);
      const targetScale = Math.min(widthScale, heightScale, 1) * 0.98; // keep a tiny safety margin
      const targetSize = Math.max(minFontSize, currentFontSize * targetScale);

      // Shrink directly to the computed fit size so we do not visually overshoot.
      const nextSize = targetSize;
      if (Math.abs(nextSize - currentFontSize) < 0.05) return;

      const now = Date.now();
      const last = lastShrinkAtRef.current[uid] ?? 0;
      if (now - last < 16) return;

      lastShrinkAtRef.current[uid] = now;
      onResizeText?.(uid, Number(nextSize.toFixed(2)));
    });
  }, [canvasRef, positions, sizes, imageState, restrictedBox, onResizeText, onRepositionText]);
}
