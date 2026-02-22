"use client";

import React from "react";
import { Link } from "@inertiajs/react";
import { ShoppingCart, User, Heart, ChevronRight, Folder } from "lucide-react";

type DesignNavbarProps = {
  designName?: string;
  onOpenMyDesigns?: () => void; // ✅ callback to open "my-designs" in main sidebar
  myDesignsLabel?: string;
};

export default function DesignNavbar({
  designName = "Untitled Design",
  onOpenMyDesigns,
  myDesignsLabel = "My Designs",
}: DesignNavbarProps) {
  const canOpenMyDesigns = typeof onOpenMyDesigns === "function";

  return (
    <nav
      className="
        fixed top-0 left-0 w-full z-50
        bg-white/95
        backdrop-blur-md
        flex items-center
        pl-3 pr-10 py-4
        border-b border-gray-200
        shadow-sm
      "
    >
      {/* LEFT: LOGO + DESIGN BREADCRUMB */}
      <div className="flex items-center gap-1">
        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <div className="relative h-[50px] w-[220px]">
            <img
              src="/images/BLText.png"
              alt="Bear Lane"
              className="w-full h-full object-contain select-none"
            />
          </div>
        </Link>

        {/* DESIGN BREADCRUMB */}
        <div
          className={`flex items-center gap-3 ml-8 text-[16px] tracking-wide text-gray-900 ${
            canOpenMyDesigns ? "cursor-pointer" : "cursor-default"
          }`}
          onClick={canOpenMyDesigns ? () => onOpenMyDesigns?.() : undefined}
        >
          <Folder className="w-5 h-5 text-[#8A6D2B]" />
          <span className="uppercase text-gray-500">{myDesignsLabel}</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900">
            {designName}
          </span>
        </div>
      </div>

      {/* RIGHT: ICONS */}
      <div className="ml-auto flex items-center gap-6 text-gray-800">
        <Link href="/profile">
          <User className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </Link>

        <Link href="/wishlist">
          <Heart className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </Link>

        <Link href="/cart">
          <ShoppingCart className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </Link>
      </div>
    </nav>
  );
}
