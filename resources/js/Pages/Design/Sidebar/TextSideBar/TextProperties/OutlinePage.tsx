"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import ColorPicker from "./ColorPicker";

type Props = {
  borderColor: string;
  onBorderColorChange: (v: string) => void;

  borderWidth: number;
  onBorderWidthChange: (v: number) => void;

  onBack: () => void;
};

// Subtle outline steps
const steps = [0, 0.5, 1, 1.5, 2, 2.5];

export default function OutlinePage({
  borderColor,
  onBorderColorChange,
  borderWidth,
  onBorderWidthChange,
  onBack,
}: Props) {
  const stepIndex = steps.findIndex((s) => s === borderWidth);
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-6 p-4">
      {/* Header with back arrow */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-[#8A6D2B] hover:text-[#6F5523] transition transform hover:scale-110"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Outline</h2>
      </div>

      {/* Live Preview */}
      <div className="flex justify-center items-center h-20 bg-[#FBF8F1] border border-[#E9D9B5] rounded-xl mb-4">
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#111827",
            WebkitTextStrokeWidth: `${borderWidth}px`,
            WebkitTextStrokeColor: borderColor,
            WebkitTextFillColor: "#111827",
            textShadow:
              borderWidth > 0
                ? `-${borderWidth / 2}px -${borderWidth / 2}px 0 ${borderColor},
                   ${borderWidth / 2}px -${borderWidth / 2}px 0 ${borderColor},
                  -${borderWidth / 2}px  ${borderWidth / 2}px 0 ${borderColor},
                   ${borderWidth / 2}px  ${borderWidth / 2}px 0 ${borderColor}`
                : "none",
          }}
        >
          Preview
        </span>
      </div>

      {/* Width Slider */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-700">
          Width
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>No outline</span>
          <span>Thickest</span>
        </div>

        {/* Slider track with dots */}
        <div className="relative h-6 flex items-center">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-[#E9D9B5] rounded-full" />
          <div className="absolute left-0 right-0 flex justify-between pointer-events-none top-1/2 -translate-y-1/2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full border-2 ${
                  i === stepIndex
                    ? "bg-[#8A6D2B] border-[#8A6D2B]"
                    : "bg-white border-[#D7C39A]"
                }`}
              />
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={steps.length - 1}
            step={1}
            value={Math.max(stepIndex, 0)}
            onChange={(e) => {
              onBorderWidthChange(steps[Number(e.target.value)]);
              setShowCustom(false);
            }}
            className="w-full appearance-none h-6 bg-transparent cursor-pointer relative z-10"
          />
        </div>

        {/* Custom input */}
        <div className="pt-2">
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="text-xs text-[#8A6D2B] hover:underline"
            >
              Custom…
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.1}
                value={borderWidth}
                onChange={(e) =>
                  onBorderWidthChange(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-20 px-2 py-1 text-sm border border-[#D7C39A] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C6A75E]/40"
              />
              <span className="text-xs text-gray-500">px</span>
              <button
                onClick={() => setShowCustom(false)}
                className="text-xs text-[#8A6D2B] hover:underline"
              >
                done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Color Picker */}
      <ColorPicker
        label="Colour"
        color={borderColor}
        onColorChange={onBorderColorChange}
        size="md"
      />

      {/* Buttons */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={() => onBorderWidthChange(0)}
          className="w-full py-2 text-gray-800 bg-[#FBF8F1] hover:bg-[#F4EBD7] border border-[#E9D9B5] rounded-md transition font-medium"
        >
          Remove Outline
        </button>
        <button
          onClick={onBack}
          className="w-full py-2 text-white bg-[#8A6D2B] hover:bg-[#6F5523] rounded-md transition font-medium shadow"
        >
          Done
        </button>
      </div>

      {/* Slider thumb styling */}
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #8A6D2B;
            border: 2px solid white;
            margin-top: -6px;
            cursor: pointer;
            transition: background 0.2s;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            background: #6F5523;
          }
          input[type="range"]::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #8A6D2B;
            border: 2px solid white;
            cursor: pointer;
          }
          input[type="range"]::-ms-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #8A6D2B;
            border: 2px solid white;
            cursor: pointer;
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 1px;
            background: transparent;
          }
        `}
      </style>
    </div>
  );
}
