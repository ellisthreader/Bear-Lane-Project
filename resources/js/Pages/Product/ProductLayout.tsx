"use client";

import React, { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useCart } from "@/Context/CartContext";

interface ColourProduct {
  colour: string;
  slug: string;
  sizes: string[];
  images: string[];
}

interface Product {
  brand: string;
  name: string;
  slug: string;
  price: number | string;
  original_price?: number | string | null;
  description?: string;
  images: string[];
  sizes: string[];
  colourProducts: ColourProduct[];
  specifications?: string;
}

interface Props {
  product: Product;
}

export default function ProductLayout({ product }: Props) {
  const Layout = AuthenticatedLayout;
  const { addToCart } = useCart();

  // ---------------------------------------------
  // STATE
  // ---------------------------------------------
  const [selectedColour, setSelectedColour] = useState(
    product.colourProducts[0]?.colour ?? ""
  );

  const [currentVariant, setCurrentVariant] = useState<ColourProduct>(
    product.colourProducts[0]
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showSizeError, setShowSizeError] = useState(false);

  const [displayImages, setDisplayImages] = useState<string[]>(
    product.colourProducts[0]?.images ?? product.images ?? []
  );

  // ---------------------------------------------
  // When colour changes -> update variant + images + sizes
  // ---------------------------------------------
  useEffect(() => {
    const variant = product.colourProducts.find(
      (v) => v.colour === selectedColour
    );

    if (variant) {
      setCurrentVariant(variant);
      setDisplayImages(variant.images ?? []);
      setSelectedSize(variant.sizes[0] ?? null);
    }
  }, [selectedColour]);

  const sizes = currentVariant?.sizes ?? [];

  // ---------------------------------------------
  // ACTIONS
  // ---------------------------------------------
  const handleAddToBag = () => {
    if (!selectedSize) {
      setShowSizeError(true);
      return;
    }

    addToCart({
      id: currentVariant.slug,
      title: product.name,
      brand: product.brand,
      price: Number(product.price ?? 0),
      image: displayImages[0] ?? "",
      colour: selectedColour,
      size: selectedSize,
      availableSizes: sizes,
      slug: currentVariant.slug,
    });

    setShowSizeError(false);
  };

  // ⭐⭐⭐ FIXED ⭐⭐⭐
  const handleStartDesigning = () => {
    if (!selectedSize) {
      setShowSizeError(true);
      return;
    }

    // We now use product.slug instead of variant slug
    router.get(`/design/${product.slug}`, {
      colour: selectedColour,
      size: selectedSize,
    });
  };

  return (
    <Layout>
      <Head title={product.name} />

      <div className="pt-[80px] flex flex-col md:flex-row gap-10 p-8">
        {/* LEFT — IMAGES */}
        <div className="flex-[3]">
          <div className="grid grid-cols-2 gap-1">
            {displayImages.length > 0 ? (
              displayImages.map((img, i) => (
                <div key={i} className="w-full h-[600px] relative bg-gray-100">
                  <img
                    src={img}
                    alt={`${product.name}-${i}`}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  />
                </div>
              ))
            ) : (
              <p>No images available</p>
            )}
          </div>
        </div>

        {/* RIGHT — DETAILS */}
        <div className="flex-[1] pr-4">
          <p className="uppercase text-gray-500">{product.brand}</p>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

          <p className="text-2xl font-semibold">
            £{Number(product.price ?? 0).toFixed(2)}
            {product.original_price && (
              <span className="text-gray-400 line-through ml-2">
                £{Number(product.original_price).toFixed(2)}
              </span>
            )}
          </p>

          {/* COLOUR SELECTION */}
          {product.colourProducts.length > 0 && (
            <div className="mt-6">
              <p className="font-semibold mb-2 text-lg">
                Colour:{" "}
                <span className="font-bold text-gray-900">{selectedColour}</span>
              </p>

              <div className="flex gap-3 mt-3">
                {product.colourProducts.map((cp) => (
                  <div
                    key={cp.colour}
                    onClick={() => setSelectedColour(cp.colour)}
                    className={`w-16 h-16 border cursor-pointer flex items-center justify-center overflow-hidden rounded-lg
                      ${
                        selectedColour === cp.colour
                          ? "border-black scale-105 shadow-md"
                          : "border-gray-300 hover:scale-105 hover:shadow-sm"
                      } transition-transform`}
                  >
                    <img
                      src={cp.images?.[0] ?? product.images?.[0] ?? ""}
                      alt={cp.colour}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIZE SELECTION */}
          {sizes.length > 0 && (
            <div className="mt-6">
              <p className="font-semibold mb-3 text-lg">Size</p>
              <div className="flex flex-wrap gap-3">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedSize(s);
                      setShowSizeError(false);
                    }}
                    className={`px-5 py-3 rounded-lg font-medium border transition-all duration-200
                      ${
                        selectedSize === s
                          ? "bg-black text-white border-black shadow-lg scale-105"
                          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:scale-105"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {showSizeError && (
                <p className="mt-2 text-red-500 font-medium">
                  Please select a size
                </p>
              )}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <button
            onClick={handleStartDesigning}
            className="bg-blue-600 text-white px-6 py-3 rounded-full mt-6 hover:bg-blue-700 transition-colors w-full"
          >
            Start Designing
          </button>

          <button
            onClick={handleAddToBag}
            className="bg-black text-white px-6 py-3 rounded-full mt-4 hover:bg-gray-900 transition-colors w-full"
          >
            Add to Bag
          </button>

          <p className="mt-8 text-gray-700 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>
    </Layout>
  );
}
