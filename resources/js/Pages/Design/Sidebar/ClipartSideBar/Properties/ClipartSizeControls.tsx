"use client";

type ClipartSizeControlsProps = {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
};

export default function ClipartSizeControls({
  value,
  min,
  max,
  onChange,
}: ClipartSizeControlsProps) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-lg text-gray-900">Size</p>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />

        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 border rounded-lg px-3 py-2 tabular-nums text-right focus:ring-2 focus:ring-[#C6A75E]"
        />
      </div>
    </div>
  );
}
