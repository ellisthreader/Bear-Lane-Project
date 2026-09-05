"use client";

import React from "react";

type Props = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
};

export default function RangeSlider({ label, min, max, value, onChange }: Props) {
  // clamp value between min and max
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const handleChange = (nextValue: number) => {
    const clamped = clamp(nextValue);
    // ✅ Only call onChange if the value is actually different
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Label */}
      <div className="text-base font-semibold w-24">{label}</div>

      {/* Slider + number */}
      <div className="flex items-center gap-3 flex-1">
        {/* Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="flex-1"
        />

        {/* Number box */}
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-20 border rounded px-2 py-1 text-base"
        />
      </div>
    </div>
  );
}
