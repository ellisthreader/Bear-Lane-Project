"use client";

import ClipartSizeControls from "./ClipartSizeControls";
import { getClampedSize } from "./utils/getClampedSize";

type Props = {
  layer: ImageState;
  restrictedBox: { x: number; y: number; width: number; height: number };
  canvasPosition: { x: number; y: number };
  onResize: (w: number, h: number) => void;
};

export default function ResizableClipart({
  layer,
  restrictedBox,
  canvasPosition,
  onResize,
}: Props) {
  const handleResize = (requestedWidth: number) => {
    const pos = canvasPosition ?? { x: 0, y: 0 };

    const result = getClampedSize({
      requestedWidth,
      currentWidth: layer.size.w,
      currentHeight: layer.size.h,
      position: pos,
      restrictedBox,
    });

    if (!result) return;

    onResize(result.width, result.height);
  };

  return (
    <ClipartSizeControls
      value={layer.size.w}
      min={20}
      max={600}
      onChange={handleResize}
    />
  );
}
