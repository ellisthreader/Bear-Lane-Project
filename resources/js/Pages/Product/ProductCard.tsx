import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

interface ProductImage {
  url?: string;
  path?: string;
}

interface ProductCardProps {
  product: {
    id: number;
    brand: string;
    name: string;
    slug: string | { slug: string };
    price: number | string;
    original_price?: number | string | null;
    images: (string | ProductImage)[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);

  // Normalize image getter
  const getImage = (img: string | ProductImage | undefined): string => {
    if (!img) return "/images/no-image.png";
    if (typeof img === "string") return img;
    return img.url ?? img.path ?? "/images/no-image.png";
  };

  const slug =
    typeof product.slug === "string"
      ? product.slug
      : product.slug?.slug ?? "";

  const href = `/product/${encodeURIComponent(slug)}`;

  const firstImage = getImage(product.images?.[0]);
  const secondImage =
    product.images?.length > 1 ? getImage(product.images[1]) : firstImage;

  const price = Number(product.price ?? 0);
  const originalPrice =
    product.original_price !== null && product.original_price !== undefined
      ? Number(product.original_price)
      : null;

  return (
    <Link href={href}>
      <motion.div
        className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* IMAGE WRAPPER */}
        <div className="relative w-full h-96 bg-gray-100 overflow-hidden">
          {/* MAIN IMAGE */}
          <motion.img
            key="frontImage"
            src={firstImage}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* SECOND IMAGE ON HOVER */}
          <motion.img
            key="hoverImage"
            src={secondImage}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        <div className="p-5 space-y-1 bg-white">
          <p className="text-sm uppercase tracking-wide text-gray-500 font-medium">
            {product.brand}
          </p>

          <p className="text-lg font-semibold text-gray-800 leading-tight">
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
    </Link>
  );
}
