import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useWishlist } from "@/Context/WishlistContext";
import ProductBadgeChips from "@/Components/Product/ProductBadgeChips";

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
    is_sale?: boolean;
    is_premade_design?: boolean;
    premade_quote?: string | null;
    auto_badges?: string[] | null;
    images: (string | ProductImage)[];
  };
  compact?: boolean;
  showPremadeQuoteInside?: boolean;
}

export default function ProductCard({
  product,
  compact = false,
  showPremadeQuoteInside = true,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const { toggleWishlistItem, isInWishlist } = useWishlist();

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
  const wishlistId = String(product.id);
  const inWishlist = isInWishlist(wishlistId);

  const firstImage = getImage(product.images?.[0]);
  const secondImage =
    product.images?.length > 1 ? getImage(product.images[1]) : firstImage;

  const price = Number(product.price ?? 0);
  const originalPrice =
    product.original_price !== null && product.original_price !== undefined
      ? Number(product.original_price)
      : null;
  const onSale = Boolean(
    originalPrice !== null &&
      originalPrice > 0 &&
      (Boolean(product.is_sale) || originalPrice > price)
  );
  const preMadeQuote = String(product.premade_quote || "").trim();
  const autoBadges = Array.isArray(product.auto_badges) ? product.auto_badges : [];

  return (
    <Link
      href={href}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* IMAGE WRAPPER */}
        <div
          className={`relative w-full bg-gray-100 overflow-hidden ${
            compact ? "h-64 md:h-72" : "h-96"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlistItem({
                id: wishlistId,
                name: product.name,
                brand: product.brand,
                price: product.price,
                image: firstImage,
                slug,
              });
            }}
            className="absolute right-3 top-3 z-10 rounded-full border border-[#E3D3AC] bg-white/95 p-2 text-[#8A6D2B] shadow-sm transition hover:bg-[#FFF8E8]"
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
          </button>

          {product.is_premade_design ? (
            <span className="absolute left-3 top-3 z-10 rounded-full border border-[#D8BF7E] bg-[#FFF3D4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7B5D1A] shadow-sm">
              Pre-made design
            </span>
          ) : null}
          <ProductBadgeChips
            badges={autoBadges}
            compact={compact}
            className={`absolute left-3 z-10 ${product.is_premade_design ? "top-11" : "top-3"}`}
          />

          {/* MAIN IMAGE */}
          <motion.img
            key="frontImage"
            src={firstImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered ? "opacity-0" : "opacity-100"
            } pointer-events-none select-none`}
          />

          {/* SECOND IMAGE ON HOVER */}
          <motion.img
            key="hoverImage"
            src={secondImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered ? "opacity-100" : "opacity-0"
            } pointer-events-none select-none`}
          />
        </div>

        <div className={`space-y-1 bg-white ${compact ? "p-4" : "p-5"}`}>
          <p className="text-sm uppercase tracking-wide text-gray-500 font-medium">
            {product.brand}
          </p>

          <p className={`${compact ? "text-base" : "text-lg"} font-semibold text-gray-800 leading-tight`}>
            {product.name}
          </p>

          {product.is_premade_design && showPremadeQuoteInside && preMadeQuote ? (
            <p className="line-clamp-2 rounded-lg border border-[#EAD9B2] bg-[#FFF9EA] px-2.5 py-1.5 text-xs leading-relaxed text-[#6A5320]">
              {preMadeQuote}
            </p>
          ) : null}

          <div className="pt-2">
            <span className={`text-lg font-bold ${onSale ? "text-[#B42318]" : "text-gray-900"}`}>
              £{price.toFixed(2)}
            </span>

            {onSale && originalPrice !== null && (
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
