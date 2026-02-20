"use client";

import React from "react";
import { Link } from "@inertiajs/react";
import { ShoppingCart, User, Heart, ChevronRight, Folder } from "lucide-react";

type DesignNavbarProps = {
  designName?: string;
  onOpenMyDesigns?: () => void; // ✅ callback to open "my-designs" in main sidebar
};

export default function DesignNavbar({
  designName = "Untitled Design",
  onOpenMyDesigns,
}: DesignNavbarProps) {
  return (
    <nav
      className="
        fixed top-0 left-0 w-full z-50
        bg-white dark:bg-gray-900
        backdrop-blur-xl
        flex items-center
        pl-3 pr-10 py-4
        border-b border-gray-200 dark:border-gray-700
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
          className="flex items-center gap-3 ml-8 text-[16px] tracking-wide text-black dark:text-gray-200 cursor-pointer"
          onClick={() => onOpenMyDesigns?.()} // 🔹 Use the prop callback
        >
          <Folder className="w-5 h-5 text-gray-500" />
          <span className="uppercase text-gray-500">My Designs</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-black dark:text-white">
            {designName}
          </span>
        </div>
      </div>

      {/* RIGHT: ICONS */}
      <div className="ml-auto flex items-center gap-6 text-black dark:text-gray-200">
        <Link href="/profile">
          <User className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
        </Link>

        <Link href="/wishlist">
          <Heart className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
        </Link>

        <Link href="/cart">
          <ShoppingCart className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
        </Link>
      </div>
    </nav>
  );
}