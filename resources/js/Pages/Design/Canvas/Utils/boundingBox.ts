// 📦 Computes the bounding box that tightly encloses a set of images based on their positions and sizes.


export function computeBoundingBox(
  positions: Record<string, { x: number; y: number }>,
  sizes: Record<string, { w: number; h: number }>,
  uids: string[]
) {
  if (uids.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  uids.forEach((uid) => {
    const p = positions[uid];
    const s = sizes[uid];
    if (!p || !s) return;

    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.w);
    maxY = Math.max(maxY, p.y + s.h);
  });

  if (minX === Infinity) return null;

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}
