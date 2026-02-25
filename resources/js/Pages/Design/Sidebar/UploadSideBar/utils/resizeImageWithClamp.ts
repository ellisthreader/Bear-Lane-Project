type Position = { x: number; y: number };
type RestrictedBox = { x: number; y: number; width: number; height: number };

type Params = {
  requestedWidth: number;
  layer: { size: { w: number; h: number } };
  selectedImage: string;
  position: Position;
  restrictedBox: RestrictedBox;
  onUpdateImageSize?: (id: string, w: number, h: number) => void;
};

/**
 * Resizes an image while keeping its TOP-LEFT corner fixed
 * and guaranteeing it never leaves the restricted box.
 */
export function resizeImageWithClamp({
  requestedWidth,
  layer,
  selectedImage,
  position,
  restrictedBox,
  onUpdateImageSize,
}: Params) {
  if (!layer || !selectedImage) return;

  const aspect = layer.size.h / layer.size.w;

  // Max width that fits in restricted box from top-left
  const maxWidth = restrictedBox.x + restrictedBox.width - position.x;

  // Clamp width, preserve aspect ratio
  const finalWidth = Math.min(requestedWidth, maxWidth);
  const finalHeight = finalWidth * aspect;

  onUpdateImageSize?.(selectedImage, finalWidth, finalHeight);
}
