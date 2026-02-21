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
        px-6 py-3
        bg-white text-black
        border border-gray-300
        rounded-xl
        shadow-lg
        hover:scale-105
        active:scale-95
        transition-all duration-200
      "
    >
      <CreditCard size={18} />
      <span className="font-medium">Get Price</span>
    </button>
  );
}