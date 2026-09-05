type RestrictedBox = {
  width: number;
  height: number;
};

type Position = {
  x: number;
  y: number;
};

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
  position: Position;
  restrictedBox: RestrictedBox;
}) {
  const aspectRatio = currentHeight / currentWidth;
  const requestedHeight = requestedWidth * aspectRatio;

  const maxWidth = restrictedBox.width - position.x;
  const maxHeight = restrictedBox.height - position.y;

  if (maxWidth <= 0 || maxHeight <= 0) {
    return null;
  }

  const scale = Math.min(
    maxWidth / requestedWidth,
    maxHeight / requestedHeight,
    1
  );

  return {
    width: requestedWidth * scale,
    height: requestedHeight * scale,
  };
}
