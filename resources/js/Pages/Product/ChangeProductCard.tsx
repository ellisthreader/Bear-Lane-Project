"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductBadgeChips from "@/Components/Product/ProductBadgeChips";

interface ProductImage {
  url?: string;
  path?: string;
}

interface ChangeProductCardProps {
  product: {
    id: number;
    brand: string;
    name: string;
    slug: string;
    price: number | string;
    original_price?: number | string | null;
    is_premade_design?: boolean;
    premade_quote?: string | null;
    auto_badges?: string[] | null;
    images: (string | ProductImage)[];
  };
  onSelect: (product: any) => void;
}

export default function ChangeProductCard({
  product,
  onSelect,
}: ChangeProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getImage = (img: string | ProductImage | undefined): string => {
    if (!img) return "/images/no-image.png";
    if (typeof img === "string") return img;
    return img.url ?? img.path ?? "/images/no-image.png";
  };

  const imageList = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map((img) => getImage(img))
    : ["/images/no-image.png"];
  const activeImage = imageList[currentImageIndex] ?? imageList[0];

  const price = Number(product.price ?? 0);
  const originalPrice =
    product.original_price !== null && product.original_price !== undefined
      ? Number(product.original_price)
      : null;
  const isPreMade = Boolean(product.is_premade_design);
  const autoBadges = Array.isArray(product.auto_badges) ? product.auto_badges : [];

  return (
    <motion.div
      className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-300 hover:shadow-lg sm:rounded-2xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(product)}
    >
      {/* IMAGE */}
      <div className="relative h-[100px] w-full overflow-hidden bg-gray-100 sm:h-[190px]">
        <img
          src={activeImage}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <ProductBadgeChips
          badges={autoBadges}
          isPreMade={isPreMade}
          className="absolute left-2 top-2 z-10"
        />

        {imageList.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow md:hidden"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow md:hidden"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}

        {/* HOVER OVERLAY */}
        {hovered && (
          <motion.div
            className="absolute inset-0 hidden items-center justify-center bg-black/50 md:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white text-xl font-semibold">
              Select This Product
            </p>
          </motion.div>
        )}
      </div>

      {/* INFO */}
      <div className="flex flex-grow flex-col space-y-1 p-1.5 sm:p-4">
        <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
          {product.brand}
        </p>

        <p className="flex-grow text-[11px] font-semibold leading-tight text-gray-800 sm:text-lg">
          {product.name}
        </p>
        <div className="pt-0.5 sm:pt-2">
          <span className="text-xs font-bold text-gray-900 sm:text-lg">
            £{price.toFixed(2)}
          </span>

          {originalPrice !== null && (
            <span className="ml-2 text-xs text-gray-400 line-through sm:text-sm">
              £{originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
