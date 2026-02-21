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
    <div className="absolute top-1/2 right-6 transform -translate-y-1/2 flex flex-col gap-4 bg-white dark:bg-gray-900 p-3 rounded-xl shadow-lg z-40">
      {Object.entries(images).map(([key, src]) => {
        const viewKey = key as keyof typeof images;
        const isSelected = selected === viewKey;

        return (
          <button
            key={key}
            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
              isSelected
                ? "border-gold-500 scale-105 shadow-xl"
                : "border-gray-300 hover:border-gold-300"
            }`}
            onClick={() => handleClick(viewKey)}
          >
            <img src={src} alt={key} className="w-full h-full object-cover" />
          </button>
        );
      })}
    </div>
  );
};

export default ProductViewSelector;
