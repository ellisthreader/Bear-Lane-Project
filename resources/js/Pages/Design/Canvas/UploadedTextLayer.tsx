import DraggableText from "./DraggableText";

type Props = {
  uids: string[];
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  imageState: any;
  selected: string[];
  hovered: Record<string, boolean>;
  onPointerDown: (e: React.MouseEvent, uid: string) => void;
};

export default function UploadedTextLayer({
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
      {uids.map(uid => {
        const layer = imageState[uid];

        if (!layer || layer.type !== "text") return null;

        const s = sizes[uid];
        const p = positions[uid];
        if (!s || !p) return null;

        return (
          <DraggableText
            key={uid}
            uid={uid}
            text={layer.text ?? ""}
            fontFamily={layer.fontFamily ?? "Arial"}
            color={layer.color ?? "#000000"}
            borderColor={layer.borderColor ?? "#000000"}
            borderWidth={layer.borderWidth ?? 0}
            pos={p}
            size={s}
            rotation={layer.rotation ?? 0}
            flip={layer.flip ?? "none"}
            highlighted={selected.includes(uid) || hovered[uid]}
            onPointerDown={onPointerDown}
            fontSize={layer.fontSize}
          />
        );
      })}
    </>
  );
}
