"use client";

import React from "react";

interface ImageProps {
  productImage: string;
  safeName: string;
  productImages?: string[];
  onSelectImage?: (img: string) => void;
}

const labels = ["Front", "Back", "R.Sleeve", "L.Sleeve"];

export default function DesignImage({
  productImage,
  safeName,
  productImages = [],
  onSelectImage,
}: ImageProps) {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Main Product Image */}
      {productImage ? (
        <img
          src={productImage}
          alt={safeName}
          className="object-contain w-full h-full pointer-events-none"
        />
      ) : (
        <span className="text-gray-500">No product image available</span>
      )}

      {/* Right-side thumbnails */}
      {productImages.length > 0 && (
        <div className="absolute top-4 right-4 bg-white shadow rounded-xl p-3 flex flex-col gap-3 max-h-[65%] overflow-y-auto items-center border border-gray-200">
          {productImages.slice(0, 4).map((img, index) => {
            const isSelected = productImage === img;
            return (
              <div key={index} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    console.log("📸 Thumbnail clicked:", img, "Selected?", isSelected);
                    onSelectImage?.(img);
                  }}
                  className={`transition-all duration-200 rounded-lg border
                    ${isSelected
                      ? "border-[#C6A75E] scale-110 shadow-md"
                      : "border-gray-300 hover:border-[#C6A75E] hover:scale-105 shadow-sm"}
                  `}
                >
                  <img
                    src={img}
                    alt={`Product ${index + 1}`}
                    className="h-14 w-14 object-contain rounded-lg"
                  />
                </button>
                <span
                  className={`text-xs font-medium text-gray-600 ${
                    isSelected ? "text-[#8A6D2B]" : ""
                  }`}
                >
                  {labels[index]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
