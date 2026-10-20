import { Move } from "lucide-react";

export default function ResizeHandle({
  onMouseDown,
  onEnter,
  onLeave
}: any) {
  return (
    <div
      className="absolute bg-white rounded-full shadow p-1 cursor-se-resize selection-button"
      style={{ right: -15, bottom: -15, zIndex: 400, pointerEvents: "auto" }}
      onMouseDown={onMouseDown}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Move size={16} />
    </div>
  );
}
