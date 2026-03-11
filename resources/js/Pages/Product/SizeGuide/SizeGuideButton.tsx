import React, { useRef } from "react";
import { Ruler } from "lucide-react";
import { useSizeGuide } from "./SizeGuideContext";

export default function SizeGuideButton() {
  const { open } = useSizeGuide();
  const pointerClickGuardRef = useRef<null | string>(null);

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    pointerClickGuardRef.current = event.pointerType;
    if (event.pointerType === "touch") {
      event.preventDefault();
      event.stopPropagation();
      open();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pointerClickGuardRef.current === "touch") {
      pointerClickGuardRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    open();
  };

  return (
    <button
      type="button"
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-3 py-1 text-xs font-semibold text-[#7B6530] transition hover:bg-[#F8E9C9]"
    >
      <Ruler className="h-3.5 w-3.5" />
      Size Guide
    </button>
  );
}
