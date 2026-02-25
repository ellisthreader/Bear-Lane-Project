"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

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

  const getImage = (img: string | ProductImage | undefined): string => {
    if (!img) return "/images/no-image.png";
    if (typeof img === "string") return img;
    return img.url ?? img.path ?? "/images/no-image.png";
  };

  const firstImage = getImage(product.images?.[0]);
  const secondImage =
    product.images?.length > 1 ? getImage(product.images[1]) : firstImage;

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
        <motion.img
          src={firstImage}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hovered ? "opacity-0" : "opacity-100"
          }`}
        />

        <motion.img
          src={secondImage}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* HOVER OVERLAY */}
        {hovered && (
          <motion.div
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
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
