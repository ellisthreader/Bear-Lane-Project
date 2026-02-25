"use client";

import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";

interface Props {
  closeSidebar: () => void;
}

export default function MenSidebar({ closeSidebar }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // BIG TOP LINKS
  const bigLinks = [
    { key: "new-arrivals", name: "New Arrivals" },
    { key: "bestsellers", name: "Bestsellers" },
    { key: "trending-now", name: "Trending Now" },
  ];

  // MAIN CATEGORIES + SUBCATEGORIES
  const categories: Record<string, string[]> = {
    Clothing: [
      "T-Shirts",
      "Jackets & Coats",
      "Hoodies & Sweatshirts",
      "Knitwear",
      "Shirts",
      "Polo Shirts",
      "Jeans",
      "Trousers",
      "Activewear",
      "Loungewear",
      "Tracksuits",
      "Shorts",
      "Suits",
      "Swimwear",
      "Underwear",
      "Socks",
    ],
    Shoes: [
      "Trainers",
      "Boots",
      "Loafers",
      "Dress Shoes",
      "Brogues & Oxfords",
      "Sliders & Flip Flops",
      "Sandals",
      "Slippers",
    ],
    Accessories: [
      "Hats",
      "Scarves",
      "Gloves",
      "Wallets",
      "Cardholders",
      "Belts",
      "Luxury Watches",
      "Jewellery",
      "Sunglasses",
      "Glasses",
      "Ties",
      "Men’s Grooming",
    ],
    Brands: [],
  };

  const slugify = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  // Big links (like "new-arrivals") — prepend "men" for slug
  const handleBigLink = (key: string) => {
    router.get(`/category/men-${slugify(key)}`);
    closeSidebar();
  };

  // Subcategories → generate slug: section-subsection-name
  const handleSubcategory = (cat: string, sub: string) => {
    // DB slugs: men-shoes-trainers
    const slug = `men-${slugify(cat)}-${slugify(sub)}`;
    router.get(`/category/${slug}`);
    closeSidebar();
  };

  const textClass =
    "text-black dark:text-gray-200 font-sans uppercase tracking-wide text-[14px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  const bigTextClass =
    "text-black dark:text-gray-100 font-sans font-bold uppercase tracking-wide text-[20px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  return (
    <div className="flex flex-col h-full">

      {/* SHOW "MEN" ONLY ON MAIN MENU */}
      {!selected && (
        <h2 className={bigTextClass + " mb-6"}>Men</h2>
      )}

      {/* SUBCATEGORY VIEW */}
      {selected ? (
        <>
          {/* BACK ARROW */}
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>

          {/* CATEGORY TITLE */}
          <h3 className={bigTextClass + " mb-4"}>{selected}</h3>

          {/* LIST SUBCATEGORIES */}
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
