// ▭ Renders the visual marquee rectangle overlay during click-and-drag selection in ImageCanvas.

import React from "react";
import { Marquee } from "./types";

interface Props {
  marquee: Marquee;
}

export default function MarqueeBox({ marquee }: Props) {
  return (
    <div
      className="absolute border-2 border-[#C6A75E] bg-[#C6A75E]/10 pointer-events-none"
      style={{
        left: marquee.x,
        top: marquee.y,
        width: marquee.w,
        height: marquee.h,
      }}
    />
  );
}
