"use client";

import React from "react";
import { Link } from "@inertiajs/react";
import {
  ShoppingCart,
  User,
  Heart,
  ChevronRight,
  Folder,
  Save,
  CircleDollarSign,
} from "lucide-react";
import { useCart } from "@/Context/CartContext";
import { useWishlist } from "@/Context/WishlistContext";
import WishlistSidebar from "@/Components/Wishlist/WishlistSidebar";

type DesignNavbarProps = {
  designName?: string;
  onOpenMyDesigns?: () => void;
  onSaveDesign?: () => void;
  onGetPrice?: () => void;
  myDesignsLabel?: string;
};

export default function DesignNavbar({
  designName = "Untitled Design",
  onOpenMyDesigns,
  onSaveDesign,
  onGetPrice,
  myDesignsLabel = "My Designs",
}: DesignNavbarProps) {
  const canOpenMyDesigns = typeof onOpenMyDesigns === "function";
  const canSave = typeof onSaveDesign === "function";
  const canGetPrice = typeof onGetPrice === "function";
  const { openCart } = useCart();
  const { openWishlist } = useWishlist();

  return (
    <>
      <nav
        className="
        fixed top-0 left-0 w-full z-50
        bg-white/95
        backdrop-blur-md
        flex items-center
        px-3 py-3 sm:py-4 sm:pr-6 lg:pr-10
        border-b border-gray-200
        shadow-sm
      "
    >
      {/* LEFT: LOGO + DESIGN BREADCRUMB */}
      <div className="flex min-w-0 items-center gap-1">
        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <div className="relative h-[40px] w-[150px] sm:h-[46px] sm:w-[185px] lg:h-[50px] lg:w-[220px]">
            <img loading="lazy" decoding="async"
              src="/images/BLText.png"
              alt="Bear Lane"
              className="w-full h-full object-contain select-none"
            />
          </div>
        </Link>

        {/* DESIGN BREADCRUMB */}
        <div
          className={`ml-3 hidden min-w-0 items-center gap-2 text-sm tracking-wide text-gray-900 md:flex lg:ml-8 lg:gap-3 lg:text-[16px] ${
            canOpenMyDesigns ? "cursor-pointer" : "cursor-default"
          }`}
          onClick={canOpenMyDesigns ? () => onOpenMyDesigns?.() : undefined}
        >
          <Folder className="h-4 w-4 text-[#8A6D2B] lg:h-5 lg:w-5" />
          <span className="uppercase text-gray-500">{myDesignsLabel}</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="truncate font-semibold text-gray-900">
            {`'${designName}'`}
          </span>
        </div>
      </div>

      {/* RIGHT: ICONS */}
      <div className="ml-auto flex items-center gap-2 text-gray-800 sm:gap-3 lg:gap-5">
        {canSave ? (
          <button
            type="button"
            onClick={() => onSaveDesign?.()}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-[#C6A75E]/45 px-2.5 py-1.5 text-[11px] font-semibold text-[#8A6D2B] transition hover:bg-[#F2EAD6] sm:text-xs"
            aria-label="Save design"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        ) : null}

        {canGetPrice ? (
          <button
            type="button"
            onClick={() => onGetPrice?.()}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-[#C6A75E]/45 px-2.5 py-1.5 text-[11px] font-semibold text-[#8A6D2B] transition hover:bg-[#F2EAD6] sm:text-xs"
            aria-label="Get price"
          >
            <CircleDollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Price</span>
          </button>
        ) : null}

        {canOpenMyDesigns ? (
          <button
            type="button"
            onClick={() => onOpenMyDesigns?.()}
            className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-800 transition hover:bg-[#F2EAD6]"
            aria-label="Open my designs"
          >
            <Folder className="h-5 w-5" />
          </button>
        ) : null}

        <Link href="/profile">
          <User className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </Link>

        <button
          type="button"
          onClick={openWishlist}
          className="hidden items-center justify-center md:inline-flex"
          aria-label="Open wishlist"
        >
          <Heart className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </button>

        <button
          onClick={openCart}
          className="hidden items-center justify-center rounded-full p-1.5 transition hover:bg-[#F2EAD6] md:flex"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-5 h-5 cursor-pointer hover:text-[#C6A75E] transition" />
        </button>
      </div>
      </nav>
      <WishlistSidebar />
    </>
  );
}
