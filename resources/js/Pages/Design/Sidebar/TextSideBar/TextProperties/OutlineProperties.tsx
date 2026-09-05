"use client";

import React from "react";

type Props = {
  onOpenOutline: () => void;
  borderWidth: number;
  borderColor: string;
};

const steps = [0, 0.5, 1, 1.5, 2, 2.5];

const stepLabels = [
  "Select outline",
  "Very thin",
  "Thin",
  "Medium",
  "Thick",
  "Very thick",
];

export default function OutlineProperties({
  onOpenOutline,
  borderWidth,
  borderColor,
}: Props) {
  const numeric = Number(borderWidth);

  const index = steps.findIndex(
    (s) => Math.abs(s - numeric) < 0.001
  );

  const label = index !== -1 ? stepLabels[index] : "Select outline";

  return (
    <div className="flex items-center justify-between w-full py-2 cursor-pointer">
      {/* Left label */}
      <div className="text-base font-semibold text-gray-900">
        Outline
      </div>

      <button
        onClick={onOpenOutline}
        className="flex items-center gap-2 italic text-base text-gray-600 hover:text-gray-900 transition"
      >
        {/* color preview square */}
        <span
          className="h-4 w-4 rounded border border-[#D7C39A]"
          style={{ backgroundColor: borderColor }}
        />

        {label}
      </button>
    </div>
  );
}
