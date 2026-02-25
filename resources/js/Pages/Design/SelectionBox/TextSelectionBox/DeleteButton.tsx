import { X } from "lucide-react";

export default function DeleteButton({
  onClick,
  onEnter,
  onLeave,
  stopAll
}: any) {
  return (
    <div
      className="absolute bg-white rounded-full shadow p-1 cursor-pointer selection-button"
      style={{ right: -15, top: -15, zIndex: 400, pointerEvents: "auto" }}
      onMouseDown={stopAll}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <X size={16} color="red" />
    </div>
  );
}
