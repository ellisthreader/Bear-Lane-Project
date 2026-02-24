"use client";

import React, { useState, useRef, useLayoutEffect } from "react";

import TextArea from "./TextArea";
import FontSelector from "./FontSelector";
import FontPage from "./FontPage";
import ColorPicker from "./ColorPicker";
import RangeSlider from "./RangeSlider";
import OutlineProperties from "./OutlineProperties";
import OutlinePage from "./OutlinePage";
import FlipControls from "./FlipControls";


import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  Square,
  Trash2,
  Copy,
  RefreshCw,
} from "lucide-react";

import type { TextAlign } from "../../../../Types/Text";

type Props = {
  textValue: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  rotation: number;
  borderWidth: number;
  borderColor: string;
  flip: "none" | "horizontal" | "vertical";

  onTextChange: (v: string) => void;
  onFontChange: (v: string) => void;
  onFontSizeChange: (v: number) => void;
  onColorChange: (v: string) => void;
  onRotationChange: (v: number) => void;
  onBorderWidthChange: (v: number) => void;
  onBorderColorChange: (v: string) => void;
  onFlipChange: (v: "none" | "horizontal" | "vertical") => void;
  onReset: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  textAlign: TextAlign;
  onTextAlignChange: (align: TextAlign) => void;

  restrictedBox: { left: number; top: number; width: number; height: number };
  textPosition?: { x: number; y: number };
};

export default function TextProperties(props: Props) {
  const [panel, setPanel] = useState<"main" | "fonts" | "outline">("main");
  const measureRef = useRef<HTMLSpanElement>(null);
  const [measuredSize, setMeasuredSize] = useState({ w: 0.5, h: 0.5 });
  const MIN_FONT_SIZE = 4;
  const MAX_FONT_SIZE_CAP = 600;
  const alignmentOptions: {
    value: TextAlign;
    Icon: React.ComponentType<{ size?: number }>;
    label: string;
  }[] = [
    { value: "left", Icon: AlignLeft, label: "Align left" },
    { value: "center", Icon: AlignCenter, label: "Align center" },
    { value: "right", Icon: AlignRight, label: "Align right" },
  ];

  useLayoutEffect(() => {
    const span = measureRef.current;
    if (!span) return;

    span.style.fontSize = "1px";
    span.style.whiteSpace = "pre";
    span.style.display = "block";
    span.style.visibility = "hidden";

    const rect = span.getBoundingClientRect();
    setMeasuredSize({
      w: Math.max(0.5, rect.width + props.borderWidth * 2),
      h: Math.max(0.5, rect.height + props.borderWidth * 2),
    });
  }, [props.textValue, props.fontFamily, props.borderWidth]);

  const { availableWidth, availableHeight } = React.useMemo(() => {
    const rightEdge = props.restrictedBox.left + props.restrictedBox.width;
    const bottomEdge = props.restrictedBox.top + props.restrictedBox.height;
    const startX = props.textPosition?.x ?? props.restrictedBox.left;
    const startY = props.textPosition?.y ?? props.restrictedBox.top;
    return {
      availableWidth: Math.max(1, rightEdge - startX),
      availableHeight: Math.max(1, bottomEdge - startY),
    };
  }, [props.restrictedBox, props.textPosition]);

  const derivedMaxFontSize = React.useMemo(() => {
    const widthLimit = availableWidth / Math.max(measuredSize.w, 0.01);
    const heightLimit = availableHeight / Math.max(measuredSize.h, 0.01);
    const candidate = Math.min(widthLimit, heightLimit, MAX_FONT_SIZE_CAP);
    if (!Number.isFinite(candidate) || candidate <= 0) return MAX_FONT_SIZE_CAP;
    return Math.max(MIN_FONT_SIZE, candidate);
  }, [availableWidth, availableHeight, measuredSize]);

  const clampFontSize = React.useCallback(
    (value: number) => {
      const next = Math.max(MIN_FONT_SIZE, Math.min(value, derivedMaxFontSize));
      return Math.round(next * 100) / 100;
    },
    [derivedMaxFontSize]
  );

  React.useEffect(() => {
    const clamped = clampFontSize(props.fontSize);
    if (clamped !== props.fontSize) {
      props.onFontSizeChange(clamped);
    }
  }, [clampFontSize, props.fontSize, props.onFontSizeChange]);

  const sliderMax = Math.max(MIN_FONT_SIZE, Math.ceil(derivedMaxFontSize));
  const sliderDisplayMax = Math.max(sliderMax, Math.ceil(props.fontSize));
  const handleFontSizeChange = React.useCallback(
    (value: number) => props.onFontSizeChange(clampFontSize(value)),
    [clampFontSize, props.onFontSizeChange]
  );

  if (panel === "fonts") {
    return (
      <div className="px-6 py-4 overflow-hidden w-full h-full">
        <FontPage
          fontFamily={props.fontFamily}
          textValue={props.textValue}
          onFontChange={props.onFontChange}
          onBack={() => setPanel("main")}
        />
      </div>
    );
  }

  if (panel === "outline") {
    return (
      <div className="px-6 py-4 overflow-hidden w-full h-full">
        <OutlinePage
          borderColor={props.borderColor}
          onBorderColorChange={props.onBorderColorChange}
          borderWidth={props.borderWidth}
          onBorderWidthChange={props.onBorderWidthChange}
          onBack={() => setPanel("main")}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden w-full h-full flex flex-col gap-4 px-6 pb-6 pt-0">
      {/* Text Box at top */}
      <TextArea
        textValue={props.textValue}
        onTextChange={props.onTextChange}
      />

      {/* Font Selector */}
      <FontSelector
        fontFamily={props.fontFamily}
        onOpenFonts={() => setPanel("fonts")}
      />

      {/* Color Picker */}
      <ColorPicker
        color={props.color}
        onColorChange={props.onColorChange}
      />

      {/* Rotation Slider */}
      <RangeSlider
        label="Rotation"
        min={-180}
        max={180}
        value={props.rotation}
        onChange={props.onRotationChange}
        icon={<RotateCw size={20} />}
      />

      {/* Text Size Slider */}
      <RangeSlider
        label="Text Size"
        min={MIN_FONT_SIZE}
        max={sliderDisplayMax}
        value={props.fontSize}
        onChange={handleFontSizeChange}
        icon={<Square size={20} />}
      />

      {/* Hidden span for measuring text */}
      <span
        ref={measureRef}
        style={{
          fontFamily: props.fontFamily,
          borderWidth: props.borderWidth,
          visibility: "hidden",
          position: "absolute",
          whiteSpace: "pre-wrap",
          transform: "none",
          rotate: "0deg",
        }}
      >
        {props.textValue || "Text"}
      </span>

      {/* Outline Properties */}
      <OutlineProperties
        onOpenOutline={() => setPanel("outline")}
        borderWidth={props.borderWidth}
        borderColor={props.borderColor}
      />

      {/* Alignment controls */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">
          Alignment
        </div>
        <div className="flex gap-2">
          {alignmentOptions.map(option => {
            const isActive = props.textAlign === option.value;
            return (
              <button
                key={option.value}
                type="button"
                title={option.label}
                onClick={() => props.onTextAlignChange(option.value)}
                className={`w-10 h-10 rounded-xl border transition flex items-center justify-center ${
                  isActive
                    ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#8A6D2B]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <option.Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls: Flip + Duplicate + Delete */}
      <div className="flex flex-col gap-3">
        <FlipControls
          value={props.flip}
          onFlip={props.onFlipChange}
        />

        <button
          onClick={props.onDuplicate}
          className="w-full max-w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold flex items-center justify-center gap-2 transition"
        >
          <Copy size={18} />
          Duplicate Text
        </button>

        <button
          onClick={props.onReset}
          className="w-full py-3 bg-red-100 text-red-700 rounded-xl flex items-center justify-center gap-2 hover:bg-red-200"
        >
          <RefreshCw size={18} />
          Reset To Original
        </button>

        <button
          onClick={props.onDelete}
          className="w-full max-w-full py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold flex items-center justify-center gap-2 transition"
        >
          <Trash2 size={18} />
          Delete Text
        </button>
      </div>
    </div>
  );
}
