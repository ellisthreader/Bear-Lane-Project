"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import {
  ShoppingCart,
  User,
  Folder,
  Save,
  CircleDollarSign,
  ChevronRight,
  Heart,
  ArrowLeft,
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
  isUserSignedIn?: boolean;
};

export default function DesignNavbar({
  designName = "Untitled Design",
  onOpenMyDesigns,
  onSaveDesign,
  onGetPrice,
  myDesignsLabel = "My Designs",
  isUserSignedIn = false,
}: DesignNavbarProps) {
  const canOpenMyDesigns = typeof onOpenMyDesigns === "function";
  const canSave = typeof onSaveDesign === "function";
  const canGetPrice = typeof onGetPrice === "function";
  const { openCart } = useCart();
  const { openWishlist } = useWishlist();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileViewport(query.matches);
    sync();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }

    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  const handleMobileGoBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/";
  };

  if (isMobileViewport) {
    return (
      <>
        <nav className="fixed left-0 top-0 z-50 w-full border-b border-gray-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleMobileGoBack}
              aria-label="Go back"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#6D6452] transition hover:bg-[#F2EAD6]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="grid flex-1 grid-cols-4 gap-2">
              <MobileNavButton
                label="Designs"
                ariaLabel="Open my designs"
                onClick={canOpenMyDesigns ? () => onOpenMyDesigns?.() : undefined}
              >
                <Folder className="h-5 w-5" />
              </MobileNavButton>

              <MobileNavButton
                label="Save"
                ariaLabel="Save design"
                onClick={canSave ? () => onSaveDesign?.() : undefined}
              >
                <Save className="h-5 w-5" />
              </MobileNavButton>

              <Link
                href={isUserSignedIn ? "/profile" : "/login"}
                aria-label={isUserSignedIn ? "Open profile" : "Sign in"}
                className="inline-flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-1 text-center text-[11px] font-semibold text-gray-700 transition hover:bg-[#F2EAD6]"
              >
                <User className="h-5 w-5" />
                <span className="mt-1 leading-none">{isUserSignedIn ? "Profile" : "Sign in"}</span>
              </Link>

              <MobileNavButton label="Cart" ariaLabel="Open cart" onClick={openCart}>
                <ShoppingCart className="h-5 w-5" />
              </MobileNavButton>
            </div>

            {canGetPrice ? (
              <button
                type="button"
                onClick={() => onGetPrice?.()}
                className="inline-flex h-[48px] min-w-[78px] items-center justify-center rounded-lg border border-[#C6A75E]/60 bg-[#FAF3E2] px-2 text-xs font-semibold text-[#7A6130] transition hover:bg-[#F2E5C6]"
                aria-label="Get price"
              >
                Get price £
              </button>
            ) : null}
          </div>
        </nav>
        <WishlistSidebar />
      </>
    );
  }

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

function MobileNavButton({
  label,
  ariaLabel,
  onClick,
  children,
}: {
  label: string;
  ariaLabel: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex min-h-[54px] flex-col items-center justify-center rounded-xl px-2 py-1 text-center text-[11px] font-semibold text-gray-700 transition hover:bg-[#F2EAD6]"
    >
      {children}
      <span className="mt-1 leading-none">{label}</span>
    </button>
  );
}
