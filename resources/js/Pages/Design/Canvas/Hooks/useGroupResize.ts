import { computeBoundingBox } from "../Utils/boundingBox";

export interface GroupResizeParams {
  selected: string[];
  sizes: Record<string, { w: number; h: number }>;
  positions: Record<string, { x: number; y: number }>;
  setSizes: React.Dispatch<
    React.SetStateAction<Record<string, { w: number; h: number }>>
  >;
  setPositions: React.Dispatch<
    React.SetStateAction<Record<string, { x: number; y: number }>>
  >;
  restrictedBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  setImageState?: React.Dispatch<any>;
}

export function useGroupResize({
  selected,
  sizes,
  positions,
  setSizes,
  setPositions,
  restrictedBox,
  setImageState,
}: GroupResizeParams) {
  const startResize = (startX: number) => {
    const box = computeBoundingBox(positions, sizes, selected);
    if (!box) return;

    const startSizes = structuredClone(sizes);
    const startPos = structuredClone(positions);

    const handleMouseMove = (e: MouseEvent) => {
      let scale = Math.exp((e.clientX - startX) / 200);

      if (restrictedBox) {
        const rLeft = restrictedBox.left;
        const rTop = restrictedBox.top;
        const rRight = restrictedBox.left + restrictedBox.width;
        const rBottom = restrictedBox.top + restrictedBox.height;

        const boxLeft = box.left;
        const boxTop = box.top;

        let maxScale = Infinity;

        maxScale = Math.min(maxScale, (rRight - boxLeft) / box.width);
        maxScale = Math.min(maxScale, (rBottom - boxTop) / box.height);

        maxScale = Math.max(0.01, maxScale);

        scale = Math.min(scale, maxScale);
      }

      setSizes(prev => {
        const next = { ...prev };
        selected.forEach(uid => {
          next[uid] = {
            w: startSizes[uid].w * scale,
            h: startSizes[uid].h * scale,
          };
        });
        return next;
      });

      setPositions(prev => {
        const next = { ...prev };
        selected.forEach(uid => {
          const rx = startPos[uid].x - box.left;
          const ry = startPos[uid].y - box.top;

          next[uid] = {
            x: box.left + rx * scale,
            y: box.top + ry * scale,
          };
        });
        return next;
      });

      // ⭐ THIS is the important sync so SizeControls updates
      if (setImageState) {
        setImageState((prev: any) => {
          const next = { ...prev };
          selected.forEach(uid => {
            next[uid] = {
              ...prev[uid],
              size: {
                w: startSizes[uid].w * scale,
                h: startSizes[uid].h * scale,
              },
            };
          });
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return { startResize };
}
