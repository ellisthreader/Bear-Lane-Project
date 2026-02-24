import { useCallback } from "react";

type Position = { x: number; y: number };
type Size = { w: number; h: number };

type Positions = Record<string, Position>;
type Sizes = Record<string, Size>;
type ImageState = Record<string, any>;

export function useDuplicateImages({
  setPositions: _setPositions,
  setSizes,
  setImageState,
  setUploadedImages,
}: {
  setPositions: React.Dispatch<React.SetStateAction<Positions>>;
  setSizes: React.Dispatch<React.SetStateAction<Sizes>>;
  setImageState: React.Dispatch<React.SetStateAction<ImageState>>;
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const duplicate = useCallback((uids: string[]) => {
    // 🔑 Stable UID map (VERY important)
    const uidMap = new Map<string, string>();

    uids.forEach(uid => {
      uidMap.set(uid, crypto.randomUUID());
    });

    /* ---------------- SIZES ---------------- */
    setSizes(prev => {
      const next = { ...prev };

      uidMap.forEach((newUid, oldUid) => {
        const s = prev[oldUid];
        if (!s) return;

        next[newUid] = { ...s };
      });

      return next;
    });

    /* ---------------- IMAGE STATE ---------------- */
setImageState(prev => {
  const next = { ...prev };

  uidMap.forEach((newUid, oldUid) => {
    const src = prev[oldUid];
    if (!src) return;

    next[newUid] = {
      ...src,
      renderKey: crypto.randomUUID(),
      // Leave empty so useImagePositions can spawn duplicate in the center.
      canvasPositions: {},
    };
  });

  return next;
});


    /* ---------------- UPLOADED IMAGES ---------------- */
    setUploadedImages(prev => {
      return [...prev, ...Array.from(uidMap.values())];
    });
  }, [_setPositions, setSizes, setImageState, setUploadedImages]);

  return duplicate;
}
