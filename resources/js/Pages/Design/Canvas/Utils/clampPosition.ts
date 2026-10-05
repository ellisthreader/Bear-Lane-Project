// 🔒 Clamps an element’s position so it stays fully within the bounds of a restricted container.
export function clampPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  box: { left: number; top: number; width: number; height: number }
) {
  const maxX = box.left + Math.max(box.width - w, 0);
  const maxY = box.top + Math.max(box.height - h, 0);
  return {
    x: Math.min(Math.max(x, box.left), maxX),
    y: Math.min(Math.max(y, box.top), maxY),
  };
}

// 🔒 NEW — clamps BOTH size + position so resizing can't escape
export function clampPositionAndSize(
  x: number,
  y: number,
  w: number,
  h: number,
  box: { left: number; top: number; width: number; height: number }
) {
  const clampedWidth = Math.min(w, box.width);
  const clampedHeight = Math.min(h, box.height);

  const clampedX = Math.min(
    Math.max(x, box.left),
    box.left + box.width - clampedWidth
  );

  const clampedY = Math.min(
    Math.max(y, box.top),
    box.top + box.height - clampedHeight
  );

  return {
    x: clampedX,
    y: clampedY,
    w: clampedWidth,
    h: clampedHeight,
  };
}
