// 📝 Defines TypeScript types for images (ImageData) and marquee selection state (Marquee) used in ImageCanvas.


import React from "react";

export interface ImageData {
  url: string;
  x: number;
  y: number;
  ref: React.RefObject<HTMLImageElement>;
}

export interface Marquee {
  hovered: {};
  active: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
