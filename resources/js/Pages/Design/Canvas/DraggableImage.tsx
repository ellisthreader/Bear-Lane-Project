import React from "react";
import InlineSvg from "../Components/InlineSvg";

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

function DraggableImage({
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
        }}
      >
        <InlineSvg src={url} color={color || "#000000"} />
      </div>
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

export default React.memo(DraggableImage, (prev, next) => {
  return (
    prev.uid === next.uid &&
    prev.url === next.url &&
    prev.pos.x === next.pos.x &&
    prev.pos.y === next.pos.y &&
    prev.size.w === next.size.w &&
    prev.size.h === next.size.h &&
    prev.rotation === next.rotation &&
    prev.flip === next.flip &&
    prev.highlighted === next.highlighted &&
    prev.color === next.color &&
    prev.isClipart === next.isClipart &&
    prev.zIndex === next.zIndex
  );
});
