"use client";

import { RefreshCcw } from "lucide-react";
import { useRef } from "react";

type Props = {
  color?: string;
  onChangeColor: (color: string) => void;
};

export default function ColorPicker({
  color = "#000000",
  onChangeColor,
}: Props) {
  const lastColorRef = useRef(color);

  const handleChange = (next: string) => {
    // ✅ Prevent redundant updates (fixes update-depth issue)
    if (next === lastColorRef.current) return;

    lastColorRef.current = next;
    onChangeColor(next);
  };

  const handleReset = () => {
    if (lastColorRef.current === "#000000") return;

    lastColorRef.current = "#000000";
    onChangeColor("#000000");
  };

  return (
    <div className="space-y-2">
      <p className="font-semibold text-lg text-gray-900">Color</p>

      <div className="flex items-center gap-4">
        {/* Color swatch */}
        <label className="relative w-11 h-11 rounded-xl overflow-hidden cursor-pointer bg-gray-100 hover:ring-2 hover:ring-[#C6A75E] transition">
          <input
            type="color"
            value={color}
            onChange={(e) => handleChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div
            className="w-full h-full"
            style={{ backgroundColor: color }}
          />
        </label>

        {/* Reset button (aligned with other controls) */}
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition font-medium flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}
