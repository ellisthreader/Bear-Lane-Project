// 📍 Initializes and maintains image positions,
// ALWAYS clamping them inside the restricted box.

import { useEffect, useRef, useState } from "react";
import { clampPosition } from "../Utils/clampPosition";

type Position = { x: number; y: number };
type Size = { w: number; h: number };
type RestrictedBox = { left: number; top: number; width: number; height: number };

export function useImagePositions(
  uids?: string[],
  sizes?: Record<string, Size>,
  restrictedBox?: RestrictedBox,
  imageState?: Record<string, any>,
  currentViewKey?: string,
  seedPositions?: Record<string, { x: number; y: number }>
) {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const lastViewKeyRef = useRef<string | null>(null);
  const hydratedSavedKeysRef = useRef<Set<string>>(new Set());

  const safeUids = Array.isArray(uids) ? uids : [];
  const safeSizes = sizes ?? {};
  const safeBox = restrictedBox ?? { left: 0, top: 0, width: 0, height: 0 };
  const safeViewKey = currentViewKey ?? "";
  const safeSeedPositions = seedPositions ?? {};
  const uidSignature = safeUids.length ? safeUids.join(",") : "";
  const sizeSignature = safeUids
    .map((uid) => {
      const size = safeSizes[uid];
      return `${uid}:${size?.w ?? ""}:${size?.h ?? ""}`;
    })
    .join("|");
  const seedSignature = safeUids
    .map((uid) => {
      const seed = safeSeedPositions[uid];
      return `${uid}:${seed?.x ?? ""}:${seed?.y ?? ""}`;
    })
    .join("|");
  const savedLayerSignature = safeUids
    .map((uid) => {
      const saved = imageState?.[uid]?.canvasPositions?.[safeViewKey];
      return `${uid}:${saved?.x ?? ""}:${saved?.y ?? ""}:${saved?.width ?? ""}:${saved?.height ?? ""}`;
    })
    .join("|");

  //
  // 1️⃣ Initialize + clamp when new images are added or when the view changes
  //
  useEffect(() => {
    const viewChanged = lastViewKeyRef.current !== safeViewKey;
    if (viewChanged) {
      hydratedSavedKeysRef.current.clear();
    }
    lastViewKeyRef.current = safeViewKey;
    const isBoxReady = safeBox.width > 0 && safeBox.height > 0;

    setPositions((prev) => {
      const next = { ...prev };

      safeUids.forEach((uid) => {
        const key = `${safeViewKey}:${uid}`;
        const layer = imageState?.[uid];
        const savedPositionFromLayer =
          safeViewKey &&
          layer?.canvasPositions &&
          layer.canvasPositions[safeViewKey];
        // Per-view canvas metadata is the source of truth for restore.
        const savedPosition = savedPositionFromLayer ?? safeSeedPositions[uid];
        const hasRelativePosition =
          savedPosition &&
          typeof savedPosition.relX === "number" &&
          typeof savedPosition.relY === "number";

        const relativeWidth =
          savedPosition && typeof savedPosition.relW === "number"
            ? savedPosition.relW * safeBox.width
            : undefined;
        const relativeHeight =
          savedPosition && typeof savedPosition.relH === "number"
            ? savedPosition.relH * safeBox.height
            : undefined;

        const fallbackWidth =
          safeSizes[uid]?.w ??
          layer?.size?.w ??
          relativeWidth ??
          savedPosition?.width ??
          0;
        const fallbackHeight =
          safeSizes[uid]?.h ??
          layer?.size?.h ??
          relativeHeight ??
          savedPosition?.height ??
          0;

        const size = safeSizes[uid] ?? { w: fallbackWidth, h: fallbackHeight };
        const desiredWidth = Math.max(size.w, 1);
        const desiredHeight = Math.max(size.h, 1);

        if (!isBoxReady) {
          return;
        }

        if (savedPosition && (!next[uid] || !hydratedSavedKeysRef.current.has(key))) {
          const hydrateX = hasRelativePosition
            ? safeBox.left + savedPosition.relX * safeBox.width
            : savedPosition.x;
          const hydrateY = hasRelativePosition
            ? safeBox.top + savedPosition.relY * safeBox.height
            : savedPosition.y;
          const clamped = clampPosition(
            hydrateX,
            hydrateY,
            desiredWidth,
            desiredHeight,
            safeBox
          );
          next[uid] = clamped;
          hydratedSavedKeysRef.current.add(key);
          return;
        }

        if (next[uid]) {
          return;
        }

        next[uid] = clampPosition(
          safeBox.left + (safeBox.width - desiredWidth) / 2,
          safeBox.top + (safeBox.height - desiredHeight) / 2,
          desiredWidth,
          desiredHeight,
          safeBox
        );
      });

      return next;
    });
  }, [
    uidSignature,
    sizeSignature,
    seedSignature,
    savedLayerSignature,
    safeBox.left,
    safeBox.top,
    safeBox.width,
    safeBox.height,
    safeViewKey,
  ]);

  return { positions, setPositions };
}
