"use client";

import React from "react";
import { CreditCard } from "lucide-react";

interface GetPriceButtonProps {
  onClick: () => void;
}

export default function GetPriceButton({ onClick }: GetPriceButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-2
        px-4 py-2 md:px-6 md:py-3
        bg-white text-[#8A6D2B]
        border border-[#C6A75E]/50
        rounded-xl
        shadow-md
        hover:bg-[#C6A75E]/10
        hover:border-[#C6A75E]
        active:translate-y-[1px]
        transition-all duration-200
      "
    >
      <CreditCard size={18} />
      <span className="text-sm font-medium md:text-base">Get Price</span>
    </button>
  );
}
