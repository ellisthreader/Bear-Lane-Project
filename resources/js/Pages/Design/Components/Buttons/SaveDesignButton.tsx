"use client";

import React from "react";
import { Save } from "lucide-react";

interface SaveDesignButtonProps {
  onClick: () => void;
}

export default function SaveDesignButton({ onClick }: SaveDesignButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-2
        px-6 py-3
        bg-black text-white
        rounded-xl
        shadow-lg
        hover:scale-105
        active:scale-95
        transition-all duration-200
      "
    >
      <Save size={18} />
      <span className="font-medium">Save</span>
    </button>
  );
}