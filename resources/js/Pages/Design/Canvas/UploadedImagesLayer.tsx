import React from "react";
import DraggableImage from "./DraggableImage";

type Props = {
  uids: string[];
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  imageState: Record<string, any>;
  selected: string[];
  hovered: Record<string, boolean>;
  onPointerDown: (e: React.PointerEvent<Element>, uid: string) => void;
};

export default function UploadedImagesLayer({
  uids,
  positions,
  sizes,
  imageState,
  selected,
  hovered,
  onPointerDown,
}: Props) {
  return (
    <>
      {uids
        .filter((uid) => imageState[uid]?.type === "image")
        .map((uid) => {
          const size = sizes[uid];
          const pos = positions[uid];

          if (!size || !pos) return null;

          const layer = imageState[uid];

          return (
            <DraggableImage
              key={uid} // ✅ MUST be stable — never depend on mutable state
              uid={uid}
              url={layer?.url ?? ""}
              pos={pos}
              size={size}
              rotation={layer?.rotation ?? 0}
              flip={layer?.flip ?? "none"}
              highlighted={selected.includes(uid) || hovered[uid]}
              onPointerDown={onPointerDown}
              color={layer?.color ?? "#000000"}
              isClipart={Boolean(layer?.isClipart)}
            />
          );
        })}
    </>
  );
}
