"use client";

import React, { useRef, useLayoutEffect, useState } from "react";

type Props = {
  uid: string;
  text: string;
  pos?: { x: number; y: number };
  restrictedBox?: { left: number; top: number; width: number; height: number };
  fontSize: number;
  rotation?: number;
  flip?: "none" | "horizontal" | "vertical";
  fontFamily?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  highlighted: boolean;
  selected?: string[];
  onPointerDown: (e: React.PointerEvent, uid: string, multi: boolean) => void;
  onMeasure?: (uid: string, w: number, h: number) => void;
};

export default function DraggableText({
  uid,
  text,
  pos,
  restrictedBox,
  fontSize,
  rotation = 0,
  flip = "none",
  fontFamily = "Arial",
  color = "#000",
  borderColor = "#000",
  borderWidth = 0,
  highlighted,
  selected = [],
  onPointerDown,
  onMeasure,
}: Props) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const isMultiSelected = selected.includes(uid);

  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const lastMeasured = useRef<{ w: number; h: number } | null>(null);

  const x = pos?.x ?? 200;
  const y = pos?.y ?? 200;
  const maxTextWidth = restrictedBox
    ? Math.max(1, restrictedBox.left + restrictedBox.width - x)
    : undefined;

  const scaleX = flip === "horizontal" ? -1 : 1;
  const scaleY = flip === "vertical" ? -1 : 1;






  // ----------------- MEASURE -----------------
useLayoutEffect(() => {
  const el = measureRef.current;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const extraStroke = borderWidth * 2;
  const w = Math.round((rect.width + extraStroke) * 10) / 10;
  const h = Math.round((rect.height + extraStroke) * 10) / 10;

  if (
    !lastMeasured.current ||
    lastMeasured.current.w !== w ||
    lastMeasured.current.h !== h
  ) {
    lastMeasured.current = { w, h };
    setMeasured({ w, h });
    onMeasure?.(uid, w, h);
  }
}, [text, fontSize, fontFamily, borderWidth, rotation, flip]);




  // ----------------- RENDER -----------------
  return (
    <>
      {/* Hidden measurer */}

      {/* Draggable container */}
      <div
        data-uid={uid}
        data-type="text"
        onPointerDown={(e) => onPointerDown(e, uid, isMultiSelected)}
        className="absolute cursor-move select-none"
        style={{
          left: x,
          top: y,
          width: measured.w > 0 ? measured.w : "auto",
          height: measured.h > 0 ? measured.h : "auto",
          zIndex: highlighted ? 200 : 50,
          userSelect: "none",
        }}
      >
        {/* Rotated / flipped visual */}
        <div
          style={{
            transform: `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
            transformOrigin: "center center", // ✅ rotate around center
            display: "inline-block",
          }}
        >
          <span
            ref={measureRef}
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              maxWidth: maxTextWidth,
              color,
              display: "block",
              WebkitTextStrokeWidth: `${borderWidth}px`,
              WebkitTextStrokeColor: borderColor,
              WebkitTextFillColor: color,
            }}
          >
            {text || "Text"}
          </span>
        </div>
      </div>
    </>
  );
}
