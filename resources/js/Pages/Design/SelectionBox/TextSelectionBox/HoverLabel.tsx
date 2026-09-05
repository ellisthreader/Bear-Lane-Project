interface Props {
  text: string;
  left: number;
  top: number;
}

export default function HoverLabel({ text, left, top }: Props) {
  return (
    <div
      className="absolute bg-black text-white text-xs px-2 py-1 rounded"
      style={{
        left,
        top,
        zIndex: 9999,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transform: "translate(-50%, -100%)"
      }}
    >
      {text}
    </div>
  );
}
