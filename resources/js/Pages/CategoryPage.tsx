"use client";

import React, { useEffect } from "react";
import NavMenu from "@/Components/Menu/NavMenu";
import ProductCard from "./Product/ProductCard";
import { usePage } from "@inertiajs/react";

interface Product {
  id: number;
  brand: string;
  name: string;
  slug: string | { slug?: string };
  price: number | string;
  original_price?: number | string | null;
  images: (string | { url: string })[];
}

interface Props {
  category: string;       // e.g., "clothing", "shoes", "accessories"
  subcategory?: string;   // e.g., "jeans", "tops"
  heading: string;        // "Kids", "Women", "Men", "Sale"
  products?: Product[];
  ageRaw?: string;
  subRaw?: string;
}

export default function CategoryPage({
  category,
  subcategory,
  heading,
  products = [],
  ageRaw,
  subRaw,
}: Props) {
  const { props } = usePage();

  // LOG EVERYTHING
  useEffect(() => {
    console.log("CategoryPage Props:", { category, subcategory, heading, products });
    console.log("Query parameters:", { ageRaw, subRaw });
  }, [category, subcategory, heading, products, ageRaw, subRaw]);

  // Convert slugs to readable strings
  const deslugify = (str?: string) =>
    str
      ? str
          .split("-")
          .map((w) => (["&"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
          .join(" ")
      : "";

  // ---------- Kids Variables ----------
  const gender = deslugify(subcategory);          // GIRL / BOY
  const age = deslugify(ageRaw);                  // Baby & Newborn / 2-8 Years
  const sub = subRaw ? deslugify(subRaw) : undefined; // Nightwear, Sandals & Flip-Flops

  // ---------- Men/Women/Sale Variables ----------
  const mainCategory = deslugify(category);      // clothing / shoes / accessories
  const subCategory = subcategory ? deslugify(subcategory) : undefined; // e.g., Jeans, Tops

  // Products to display
  const displayedProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Navbar */}
      <NavMenu />

      {/* Main Content */}
      <main className="pt-24 px-6 md:px-12">
        <div className="ml-0">
          {heading.toLowerCase() === "kids" ? (
            <>
              {/* ---------------- Kids Layout (unchanged) ---------------- */}
              <h2 className="text-gray-700 dark:text-gray-300 font-bold uppercase text-sm mb-1">
                {gender && age ? `${gender} - ${age}` : gender || age || heading}
              </h2>

              {sub && (
                <h1 className="text-gray-900 dark:text-gray-100 font-extrabold uppercase text-4xl mb-2">
                  {sub}
                </h1>
              )}

              <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
                Explore all {sub ? sub.toLowerCase() : mainCategory.toLowerCase()} available for{" "}
                {gender && age ? `${gender} ${age}` : gender || age || heading}.
              </p>
            </>
          ) : (
            <>
              {/* ---------------- Men/Women/Sale Layout ---------------- */}
              <h2 className="text-gray-700 dark:text-gray-300 font-bold uppercase text-sm mb-1">
                {heading.toUpperCase()}
              </h2>

              {subCategory && (
                <h1 className="text-gray-900 dark:text-gray-100 font-extrabold uppercase text-4xl mb-2">
                  {subCategory}
                </h1>
              )}

              <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
                Explore all {subCategory ? subCategory.toLowerCase() : mainCategory.toLowerCase()} available for{" "}
                {heading.toLowerCase()}.
              </p>
            </>
          )}

          {/* ---------------- Products Grid ---------------- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
