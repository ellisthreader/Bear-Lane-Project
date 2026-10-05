import React from "react";
import { FileText } from "lucide-react";
import { useProductQuote } from "./ProductQuoteContext";

export default function GetQuoteButton() {
  const { open } = useProductQuote();

  return (
    <button
      type="button"
      onClick={open}
      className="mt-3 inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-[#D7BE84] bg-white px-6 py-3 font-semibold text-[#7B6530] transition-colors hover:bg-[#FFF6E0]"
    >
      <FileText className="h-4 w-4" />
      Get Quote Instantly
    </button>
  );
}
