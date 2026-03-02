"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";

type Variant = {
  id?: number | string;
  colour: string;
  size?: string;
  images?: Array<string | { path?: string; url?: string }>;
  [k: string]: any;
};

// Map colour names to actual color codes
const colourMap: Record<string, string> = {
  Red: "#f87171",
  Blue: "#60a5fa",
  White: "#ffffff",
  Black: "#000000",
  Green: "#34d399",
  Yellow: "#facc15",
  Grey: "#9ca3af",
  Purple: "#a78bfa",
  Orange: "#f97316",
  Brown: "#a0522d",
  Pink: "#f472b6",
  Cyan: "#22d3ee",
  Lime: "#84cc16",
  Teal: "#14b8a6",
  Indigo: "#6366f1",
  Rose: "#f43f5e",
};

const getColourCode = (colour: string) => {
  if (colourMap[colour]) return colourMap[colour];
  const normalized = String(colour || "").trim().toLowerCase();
  if (!normalized) return "#d1d5db";

  // Stable fallback colour for custom admin colours.
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
};

export default function ProductEdit({
  product,
  selectedColour,
  selectedSize,
  onColourChange,
  onSizeChange,
  onOpenChangeProductModal, // ✅ NEW PROP
}: {
  product: any;
  selectedColour: string | null;
  selectedSize: string | null;
  onColourChange: (colour: string) => void;
  onSizeChange: (size: string) => void;
  onOpenChangeProductModal: () => void; // ✅ NEW PROP TYPE
}) {
  // ---------- Build variants grouped by colour ----------
  const variantsByColour: Record<string, Variant[]> = useMemo(() => {
    const grouped: Record<string, Variant[]> = {};

    if (Array.isArray(product?.colourProducts) && product.colourProducts.length > 0) {
      product.colourProducts.forEach((cp: any) => {
        const colour = cp.colour;
        const sizes = cp.sizes ?? [];
        if (!grouped[colour]) grouped[colour] = [];
        if (sizes.length) {
          sizes.forEach((s: string) => grouped[colour].push({ colour, size: s }));
        } else {
          grouped[colour].push({ colour, size: undefined });
        }
      });
      return grouped;
    }

    (product?.variants ?? []).forEach((v: Variant) => {
      const colour = v.colour ?? "Unknown";
      if (!grouped[colour]) grouped[colour] = [];
      grouped[colour].push({ colour, size: v.size });
    });

    return grouped;
  }, [product]);

  const uniqueColours = Object.keys(variantsByColour);

  const reviewCount = useMemo(() => {
    const raw = Number(product?.review_count ?? product?.reviews_count ?? 0);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }, [product?.review_count, product?.reviews_count]);

  const ratingValue = useMemo(() => {
    const raw = Number(product?.average_rating ?? product?.rating ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(5, raw);
  }, [product?.average_rating, product?.rating]);

  // ---------- Sizes available for selected colour ----------
  const availableSizes =
    selectedColour && variantsByColour[selectedColour]
      ? Array.from(
          new Set(
            variantsByColour[selectedColour]
              .map((v) => v.size)
              .filter((size): size is string => typeof size === "string" && size.trim().length > 0)
          )
        )
      : [];


  // ---------- CLICK HANDLERS ----------
  const handleColourClick = (colour: string) => onColourChange(colour);
  const handleSizeClick = (size: string) => onSizeChange(size);

  // ---------- OPEN MODAL ----------
  const handleChangeProduct = () => {
    onOpenChangeProductModal(); // ✅ Opens the modal
  };

  return (
    <div className="p-6 w-full max-w-md mx-auto">
      {/* Product Name + Change Product Link */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-extrabold text-gray-900">
          {product?.name ?? "Unknown Product"}
        </h1>
        <button
          onClick={handleChangeProduct}
          className="text-[#8A6D2B] hover:text-[#C6A75E] hover:underline font-medium transition"
        >
          Change Product
        </button>
      </div>

      {/* Real Reviews */}
      <div className="flex items-center mb-4">
        <div className="flex items-center text-yellow-400 mr-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={18} className={i < Math.round(ratingValue) ? "fill-current" : ""} />
          ))}
        </div>
        <span className="text-gray-600 font-medium text-sm">
          {reviewCount > 0 ? `${ratingValue.toFixed(1)} stars - ${reviewCount.toLocaleString()} reviews` : "No reviews yet"}
        </span>
      </div>

      {/* Product Description */}
      {product?.description && (
        <p className="text-gray-700 mb-6 text-sm leading-relaxed">
          {product.description}
        </p>
      )}

      {/* Colours */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Colours</h2>
        <div className="grid grid-cols-6 gap-3">
          {uniqueColours.map((colour) => {
              const colorCode = getColourCode(colour);
              const isSelected = selectedColour === colour;

              return (
                <button
                  key={colour}
                  onClick={() => handleColourClick(colour)}
                  className={`w-10 h-10 rounded-md border-2 transition-all duration-200
                    ${isSelected ? "border-[#8A6D2B] shadow-md" : "border-gray-300 hover:border-[#C6A75E] hover:scale-105"}
                  `}
                  style={{ backgroundColor: colorCode }}
                  aria-label={colour}
                />
              );
            })}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Sizes</h2>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((s) => {
            const isSelected = selectedSize === s;
            return (
              <button
                key={s}
                onClick={() => handleSizeClick(s)}
                className={`px-3 py-1 rounded-lg border-2 font-medium transition-all duration-200
                  ${isSelected
                    ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#8A6D2B] shadow-sm"
                    : "border-gray-300 text-gray-700 hover:border-[#C6A75E] hover:bg-[#C6A75E]/10"
                  }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
