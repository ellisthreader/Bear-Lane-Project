// utils/getClampedSize.ts

export function getClampedSize({
  requestedWidth,
  currentWidth,
  currentHeight,
  position,
  restrictedBox,
}: {
  requestedWidth: number;
  currentWidth: number;
  currentHeight: number;
  position: { x: number; y: number };
  restrictedBox: { width: number; height: number };
}) {
  const aspectRatio = currentHeight / currentWidth;
  const requestedHeight = requestedWidth * aspectRatio;

  // space available inside restricted box
  const maxWidth = restrictedBox.width - position.x;
  const maxHeight = restrictedBox.height - position.y;

  if (maxWidth <= 0 || maxHeight <= 0) {
    return null; // nothing to resize
  }

  const scale = Math.min(maxWidth / requestedWidth, maxHeight / requestedHeight, 1);

  if (scale <= 0 || Number.isNaN(scale)) {
    return null;
  }

  return {
    width: requestedWidth * scale,
    height: requestedHeight * scale,
  };
}
