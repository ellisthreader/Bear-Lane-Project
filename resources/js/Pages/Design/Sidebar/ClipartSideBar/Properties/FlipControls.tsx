"use client";

import { FlipHorizontal, FlipVertical } from "lucide-react";

type FlipControlsProps = {
  value: "none" | "horizontal" | "vertical";
  onFlip: (v: "none" | "horizontal" | "vertical") => void;
};

export default function FlipControls({
  value,
  onFlip,
}: FlipControlsProps) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-lg text-gray-900">Flip</p>

      <div className="flex gap-4">
        <button
          onClick={() =>
            onFlip(value === "horizontal" ? "none" : "horizontal")
          }
          className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
            value === "horizontal"
              ? "bg-[#C6A75E]/10 text-[#8A6D2B]"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <FlipHorizontal size={18} />
          Horizontal
        </button>

        <button
          onClick={() =>
            onFlip(value === "vertical" ? "none" : "vertical")
          }
          className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
            value === "vertical"
              ? "bg-[#C6A75E]/10 text-[#8A6D2B]"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <FlipVertical size={18} />
          Vertical
        </button>
      </div>
    </div>
  );
}
