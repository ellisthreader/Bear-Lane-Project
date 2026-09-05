import { Copy } from "lucide-react";

export default function DuplicateButton({
  onClick,
  onEnter,
  onLeave,
  stopAll
}: any) {
  return (
    <div
      className="absolute bg-white rounded-full shadow p-1 cursor-pointer selection-button"
      style={{ left: -15, bottom: -15, zIndex: 400, pointerEvents: "auto" }}
      onMouseDown={stopAll}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Copy size={16} />
    </div>
  );
}
