"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <motion.div
      className="relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden cursor-pointer h-full flex flex-col"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(product)}
    >
      {/* IMAGE */}
      <div className="relative w-full h-[230px] bg-gray-100 overflow-hidden">
        <img
          src={activeImage}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {imageList.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow md:hidden"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow md:hidden"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
              }}
            >
              <ChevronRight className="h-4 w-4" />
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
      <div className="p-4 space-y-1 flex-grow flex flex-col">
        <p className="text-sm uppercase tracking-wide text-gray-500 font-medium">
          {product.brand}
        </p>

        <p className="text-lg font-semibold text-gray-800 leading-tight flex-grow">
          {product.name}
        </p>

        <div className="pt-2">
          <span className="text-lg font-bold text-gray-900">
            £{price.toFixed(2)}
          </span>

          {originalPrice !== null && (
            <span className="text-gray-400 line-through ml-2 text-sm">
              £{originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
