// 📍 Initializes and maintains image positions,
// ALWAYS clamping them inside the restricted box.

import { useEffect, useState } from "react";
import { clampPosition } from "../Utils/clampPosition";

type Position = { x: number; y: number };
type Size = { w: number; h: number };
type RestrictedBox = { left: number; top: number; width: number; height: number };

export function useImagePositions(
  uids?: string[],
  sizes?: Record<string, Size>,
  restrictedBox?: RestrictedBox,
  imageState?: Record<string, any>,
  currentViewKey?: string
) {
  const [positions, setPositions] = useState<Record<string, Position>>({});

  const safeUids = Array.isArray(uids) ? uids : [];
  const safeSizes = sizes ?? {};
  const safeBox = restrictedBox ?? { left: 0, top: 0, width: 0, height: 0 };
  const safeViewKey = currentViewKey ?? "";

  //
  // 1️⃣ Initialize + clamp when new images are added
  //
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };

      safeUids.forEach((uid) => {
        if (next[uid]) {
          return;
        }

        const size = safeSizes[uid];
        if (!size) {
          // leave position as-is until we know the size
          console.log(`[useImagePositions][${uid}] waiting for size before initial position`);
          return;
        }

        const layer = imageState?.[uid];
        const savedPosition =
          safeViewKey &&
          layer?.canvasPositions &&
          layer.canvasPositions[safeViewKey];

        if (savedPosition) {
          next[uid] = clampPosition(
            savedPosition.x,
            savedPosition.y,
            size.w,
            size.h,
            safeBox
          );
          return;
        }

        console.log(`[useImagePositions][${uid}] creating initial centered position`, {
          size,
          restrictedBox: safeBox,
        });
        next[uid] = clampPosition(
          safeBox.left + (safeBox.width - size.w) / 2,
          safeBox.top + (safeBox.height - size.h) / 2,
          size.w,
          size.h,
          safeBox
        );
      });

      return next;
    });
  }, [
    safeUids.length ? safeUids.join(",") : "",
    JSON.stringify(safeSizes),
    JSON.stringify(imageState),
    safeBox.left,
    safeBox.top,
    safeBox.width,
    safeBox.height,
    safeViewKey,
  ]);

  return { positions, setPositions };
}
