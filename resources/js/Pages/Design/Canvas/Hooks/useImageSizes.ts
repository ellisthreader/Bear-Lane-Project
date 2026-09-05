import { useEffect, useState } from "react";

export function useImageSizes(
  uids?: string[],
  imageState?: Record<string, any>
) {
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});

  const safeUids = Array.isArray(uids) ? uids : [];

  // init sizes (IMAGES ONLY)
  useEffect(() => {
    setSizes(prev => {
      const next = { ...prev };

      safeUids.forEach(uid => {
        if (next[uid]) return;

        const layer = imageState?.[uid];
        if (!layer) return;

        // 🚫 TEXT: do not initialize size here
        if (layer.type === "text") return;

        const s = layer.size ?? { w: 150, h: 150 };
        next[uid] = {
          w: Math.max(1, s.w),
          h: Math.max(1, s.h),
        };
      });

      return next;
    });
  }, [safeUids.join(","), imageState]);

  // sync sidebar → canvas (IMAGES ONLY)
  useEffect(() => {
    if (!imageState) return;

    setSizes(prev => {
      let changed = false;
      const next = { ...prev };

      Object.entries(imageState).forEach(([uid, layer]) => {
        if (!layer?.size) return;

        // 🚫 TEXT: never sync size from imageState
        if (layer.type === "text") return;

        if (
          !prev[uid] ||
          prev[uid].w !== layer.size.w ||
          prev[uid].h !== layer.size.h
        ) {
          next[uid] = layer.size;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [imageState]);

  return { sizes, setSizes };
}
