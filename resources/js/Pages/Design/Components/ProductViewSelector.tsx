// components/ProductViewSelector.tsx
"use client";

import React, { useState } from "react";

export type ProductViewSelectorProps = {
  images: {
    front: string;
    back: string;
    leftSleeve: string;
    rightSleeve: string;
  };
  onSelectView: (
    imageSrc: string,
    view: keyof ProductViewSelectorProps["images"]
  ) => void;
};

const ProductViewSelector: React.FC<ProductViewSelectorProps> = ({
  images,
  onSelectView,
}) => {
  const [selected, setSelected] = useState<keyof typeof images>("front");

  const handleClick = (view: keyof typeof images) => {
    setSelected(view);
    onSelectView(images[view], view);
  };

  return (
    <div
      data-export-ignore="true"
      className="absolute bottom-4 left-1/2 z-40 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-md md:left-auto md:right-6 md:top-1/2 md:max-w-none md:translate-x-0 md:-translate-y-1/2 md:flex-col md:overflow-visible md:p-3"
    >
      {Object.entries(images).map(([key, src]) => {
        const viewKey = key as keyof typeof images;
        const isSelected = selected === viewKey;

        return (
          <button
            key={key}
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-16 sm:w-16 md:h-20 md:w-20 ${
              isSelected
                ? "border-[#C6A75E] scale-105 shadow-md"
                : "border-gray-300 hover:border-[#C6A75E]/70"
            }`}
            onClick={() => handleClick(viewKey)}
          >
            <img loading="lazy" decoding="async" src={src} alt={key} className="w-full h-full object-cover" />
          </button>
        );
      })}
    </div>
  );
};

export default ProductViewSelector;
