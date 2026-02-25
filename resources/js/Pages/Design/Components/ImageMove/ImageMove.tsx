// 🖼️ Renders a single image for the ImageCanvas, applying selection styles and disabling pointer events during marquee selection.


import React from "react";
import { ImageData } from "./types";

interface Props {
  img: ImageData;
  isSelected: boolean;
  marqueeActive: boolean;
}

export default function ImageItem({ img, isSelected, marqueeActive }: Props) {
  return (
    <img
      ref={img.ref}
      src={img.url}
      draggable={false}
      style={{
        width: 150,
        height: 150,
        userSelect: "none",
        pointerEvents: marqueeActive ? "none" : "auto",
        border: isSelected ? "2px solid #3b82f6" : "none",
        boxShadow: isSelected ? "0 8px 20px rgba(0,0,0,0.15)" : undefined,
        zIndex: isSelected ? 200 : 50,
      }}
    />
  );
}
