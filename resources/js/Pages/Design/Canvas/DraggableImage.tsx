import React from "react";

type Props = {
  uid: string;
  url: string;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  rotation: number;
  flip: "none" | "horizontal" | "vertical";
  highlighted: boolean;
  onPointerDown: (e: React.PointerEvent, uid: string) => void;
  color?: string; // optional tint/color
  isClipart?: boolean;
  zIndex?: number;
};

export default function DraggableImage({
  uid,
  url,
  pos,
  size,
  rotation,
  flip,
  highlighted,
  onPointerDown,
  color = "#fff",
  isClipart = false,
  zIndex = 1,
}: Props) {
  // Flip around center without changing position
  const scaleX = flip === "horizontal" ? -1 : 1;
  const scaleY = flip === "vertical" ? -1 : 1;

  const transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
  const isSvg = /\.svg(?:[?#].*)?$/i.test(url);
  const shouldTintSvg = isClipart && isSvg;

  if (shouldTintSvg) {
    return (
      <div
        data-uid={uid}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPointerDown(e, uid);
        }}
        style={{
          position: "absolute",
          width: size.w,
          height: size.h,
          transform,
          transformOrigin: "center center",
          cursor: "grab",
          zIndex: highlighted ? zIndex + 10000 : zIndex,
          userSelect: "none",
          pointerEvents: "auto",
          backgroundColor: color || "#000000",
          WebkitMaskImage: `url("${url}")`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
          maskImage: `url("${url}")`,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
        }}
      />
    );
  }

  return (
    <img
      data-uid={uid}
      src={url}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();      // ⛔ kill browser drag
        e.stopPropagation();     // ⛔ stop bubbling
        onPointerDown(e, uid);   // ✅ your logic
      }}
      style={{
        position: "absolute",
        width: size.w,
        height: size.h,
        transform,
        transformOrigin: "center center",
        cursor: "grab",
        zIndex: highlighted ? zIndex + 10000 : zIndex,
        userSelect: "none",
        pointerEvents: "auto",
        objectFit: "contain",
      }}
      alt=""
    />
  );
}
