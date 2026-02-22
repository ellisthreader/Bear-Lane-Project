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


import { RotateCw, Square, Trash2, Copy, RefreshCw } from "lucide-react";

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

  restrictedBox: { left: number; top: number; width: number; height: number };
  textPosition?: { x: number; y: number };
};

export default function TextProperties(props: Props) {
  const [panel, setPanel] = useState<"main" | "fonts" | "outline">("main");
  const measureRef = useRef<HTMLSpanElement>(null);
  const [maxFontSize, setMaxFontSize] = useState(() =>
    Math.max(8, Math.floor(Math.max(props.restrictedBox.width, props.restrictedBox.height)))
  );
  

  useLayoutEffect(() => {
    if (!measureRef.current || !props.restrictedBox) return;

    const span = measureRef.current;
    span.style.fontSize = "1px";

    const rect = span.getBoundingClientRect();
    const textWidth = rect.width + props.borderWidth * 2;
    const textHeight = rect.height + props.borderWidth * 2;

    if (textWidth === 0 || textHeight === 0) return;

    const rightEdge = props.restrictedBox.left + props.restrictedBox.width;
    const bottomEdge = props.restrictedBox.top + props.restrictedBox.height;
    const availableWidth = props.textPosition
      ? Math.max(1, rightEdge - props.textPosition.x)
      : props.restrictedBox.width;
    const availableHeight = props.textPosition
      ? Math.max(1, bottomEdge - props.textPosition.y)
      : props.restrictedBox.height;

    const widthLimit = availableWidth / textWidth;
    const heightLimit = availableHeight / textHeight;

    const nextMax = Math.floor(Math.min(widthLimit, heightLimit));
    if (!Number.isFinite(nextMax)) return;

    const newMax = Math.max(8, nextMax);
    setMaxFontSize(newMax);

    if (props.fontSize > newMax) {
      props.onFontSizeChange(newMax);
    }
  }, [
    props.textValue,
    props.fontFamily,
    props.borderWidth,
    props.restrictedBox,
    props.textPosition,
    props.fontSize,
    
  ]);

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
        min={8}
        max={maxFontSize}
        value={props.fontSize}
        onChange={(v) =>
          props.onFontSizeChange(Math.min(v, maxFontSize))
        }
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
