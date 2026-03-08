// components/ProductViewSelector.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, Image as ImageIcon } from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  const handleClick = (view: keyof typeof images) => {
    setSelected(view);
    onSelectView(images[view], view);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsMobileViewport(query.matches);
    syncViewport();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", syncViewport);
      return () => query.removeEventListener("change", syncViewport);
    }

    query.addListener(syncViewport);
    return () => query.removeListener(syncViewport);
  }, []);

  if (isMobileViewport) {
    return (
      <div data-export-ignore="true" className="fixed right-3 top-[84px] z-[72] md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white/95 px-2.5 py-2 text-xs font-semibold text-gray-700 shadow-md backdrop-blur"
          aria-label="Toggle product views"
        >
          <ImageIcon className="h-4 w-4" />
          Sides
          <ChevronDown className={`h-3.5 w-3.5 transition ${mobileMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {mobileMenuOpen ? (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur">
            {Object.entries(images).map(([key, src]) => {
              const viewKey = key as keyof typeof images;
              const isSelected = selected === viewKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClick(viewKey)}
                  className={`relative h-12 w-12 overflow-hidden rounded-lg border-2 transition ${
                    isSelected ? "border-[#C6A75E] shadow-md" : "border-gray-300"
                  }`}
                >
                  <img loading="lazy" decoding="async" src={src} alt={key} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

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
