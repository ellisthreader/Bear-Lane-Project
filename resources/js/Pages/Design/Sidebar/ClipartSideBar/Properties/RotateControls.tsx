"use client";

type RotateControlsProps = {
  value: number;
  onRotate: (v: number) => void;
};

export default function RotateControls({
  value,
  onRotate,
}: RotateControlsProps) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-lg text-gray-900">Rotate</p>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={-180}
          max={180}
          value={value}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="flex-1"
        />

        <input
          type="number"
          min={-180}
          max={180}
          value={value}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="w-20 border rounded-lg px-3 py-2 tabular-nums text-right focus:ring-2 focus:ring-[#C6A75E]"
        />
      </div>
    </div>
  );
}
