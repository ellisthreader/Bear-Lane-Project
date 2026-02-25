"use client";

import React, { useState } from "react";
import ProductCard from "../Product/ProductCard";

interface Product {
  id: number;
  slug: string;
  brand: string;
  name: string;
  price: number;
  original_price?: number | null;
  images: string[];
  category_id: number;
}

interface TrendingNowProps {
  products: Product[];
}

const CATEGORIES = ["Shoes", "Coats & Jackets", "Hoodies"] as const;

// Map backend category_id to frontend category names
const CATEGORY_MAP: Record<number, string> = {
  1: "Shoes",
  2: "Coats & Jackets",
  3: "Hoodies",
};

export default function TrendingNowPage({ products }: TrendingNowProps) {
  console.log("🔥 TrendingNowPage received products:", products);

  const [activeCategory, setActiveCategory] = useState<string>(
    CATEGORY_MAP[products?.[0]?.category_id] || "Shoes"
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group products by category name
  const groupedProducts: Record<string, Product[]> = {
    Shoes: [],
    "Coats & Jackets": [],
    Hoodies: [],
  };

  products.forEach((p) => {
    const cat = CATEGORY_MAP[p.category_id];
    if (cat && groupedProducts[cat]) groupedProducts[cat].push(p);
  });

  console.log("🔥 Grouped products:", groupedProducts);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 w-full pt-6 pb-12 px-4 md:px-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-12">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-6 md:mb-0">
          Trending Now
        </h2>

        <div className="flex gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-4 rounded-2xl shadow-md transition-all duration-300 font-semibold ${
                activeCategory === cat
                  ? "bg-gray-800 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:shadow-xl"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="flex flex-wrap justify-start gap-4">
        {(groupedProducts[activeCategory] ?? []).map((product, idx) => (
          <div
            key={product.id}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="
              flex-shrink-0 
              w-[calc(50%-0.8rem)]        /* 2 per row on small screens */
              sm:w-[calc(33.333%-0.8rem)] /* 3 per row on small-medium screens */
              md:w-[calc(25%-0.8rem)]     /* 4 per row on medium screens */
              lg:w-[calc(20%-0.8rem)]     /* 5 per row on large screens */
            "
          >
            <ProductCard product={product} hovered={hoveredIndex === idx} />
          </div>
        ))}
      </div>
    </div>
  );
}
