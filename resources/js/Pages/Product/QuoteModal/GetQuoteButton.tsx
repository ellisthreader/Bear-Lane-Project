import React, { useRef } from "react";
import { FileText } from "lucide-react";
import { useProductQuote } from "./ProductQuoteContext";

export default function GetQuoteButton() {
  const { open } = useProductQuote();
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
      className="mt-3 inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-[#D7BE84] bg-white px-6 py-3 font-semibold text-[#7B6530] transition-colors hover:bg-[#FFF6E0]"
    >
      <FileText className="h-4 w-4" />
      Get Quote Instantly
    </button>
  );
}
