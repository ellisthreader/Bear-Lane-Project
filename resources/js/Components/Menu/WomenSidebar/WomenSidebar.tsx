"use client";

import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react"; // ← added icon

interface Props {
  closeSidebar: () => void;
}

export default function WomenSidebar({ closeSidebar }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const bigLinks = [
    { key: "new-arrivals", name: "New Arrivals" },
    { key: "bestsellers", name: "Bestsellers" },
    { key: "trending-now", name: "Trending Now" },
  ];

  const categories: Record<string, string[]> = {
    Clothing: [
      "Jackets & Coats",
      "Hoodies & Sweatshirts",
      "Shirts & Blouses",
      "Knitwear",
      "Tops",
      "Dresses",
      "Activewear",
      "Tracksuits",
      "Loungewear",
      "Jeans",
      "Trousers",
      "Skirts",
      "Bodysuits",
      "Shorts",
      "Lingerie",
      "Nightwear",
      "Swimwear",
    ],
    Shoes: [
      "Trainers",
      "Boots",
      "Heels",
      "Flats",
      "Sliders & Flip Flops",
      "Sandals",
      "Wedding Shoes",
      "Mules",
      "Loafers",
      "Slippers",
    ],
    Accessories: [
      "Scarves",
      "Hats",
      "Gloves",
      "Umbrellas",
      "Watches",
      "Fine Jewellery",
      "Luxury Watches",
      "Purses & Pouches",
      "Cardholders",
      "Sunglasses",
      "Eyewear",
      "Hair Accessories",
      "Belts",
      "Keyrings",
      "Tech Accessories",
    ],
    Brands: [],
  };

  const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const handleBigLink = (key: string) => {
    router.get(`/category/women/${key}`);
    closeSidebar();
  };

  const handleSubcategory = (cat: string, sub: string) => {
    router.get(`/category/women/${slugify(cat)}/${slugify(sub)}`);
    closeSidebar();
  };

  const textClass =
    "text-black dark:text-gray-200 font-sans uppercase tracking-wide text-[14px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  const bigTextClass =
    "text-black dark:text-gray-100 font-sans font-bold uppercase tracking-wide text-[20px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  return (
    <div className="flex flex-col h-full">
      {/* TITLE */}
      <h2 className={bigTextClass + " mb-6"}>Women</h2>

      {/* SUBCATEGORY VIEW */}
      {selected ? (
        <>
          {/* BIG ARROW BUTTON */}
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>

          {/* CATEGORY TITLE */}
          <h3 className={bigTextClass + " mb-4"}>{selected}</h3>

          {/* SUBCATEGORIES */}
          {categories[selected].map((sub, i) => (
            <button
              key={i}
              onClick={() => handleSubcategory(selected, sub)}
              className={textClass}
            >
              {sub}
            </button>
          ))}
        </>
      ) : (
        <>
          {/* BIG LINKS */}
          <div className="space-y-3 mb-10">
            {bigLinks.map((l) => (
              <button
                key={l.key}
                onClick={() => handleBigLink(l.key)}
                className={bigTextClass}
              >
                {l.name}
              </button>
            ))}
          </div>

          {/* CATEGORY LIST */}
          <div className="space-y-2">
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className={textClass}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
