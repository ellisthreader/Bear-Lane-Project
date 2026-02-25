"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import ChangeProductCard from "@/Pages/Product/ChangeProductCard";
import SearchBar from "@/Pages/Design/SearchBar";

interface Product {
  id: number;
  brand?: string;
  name: string;
  slug: string;
  price?: number | string;
  original_price?: number | string | null;
  images?: any[];
  image?: string;
  colourProducts?: any[];
}

interface Category {
  id: number | string;
  name: string;
  slug: string;
  section: string;
  subsection?: string | null;
  age_group?: string | null;
  products?: Product[];
}

interface ChangeProductModalProps {
  onClose: () => void;
  currentCategory?: Category;
  onSelectProduct: (productId: number) => void;

}

export default function ChangeProductModal({
  onClose,
  currentCategory,
  onSelectProduct,
}: ChangeProductModalProps) {
  const { props } = usePage<{
    adultCategories: Category[];
    kidsCategories: Record<string, Category[]>;
  }>();

  useEffect(() => {
    console.log("🟢 Props passed to ChangeProductModal:", props);
  }, [props]);

  const adult = Array.isArray(props.adultCategories) ? props.adultCategories : [];
  const kids = typeof props.kidsCategories === "object" && props.kidsCategories !== null ? props.kidsCategories : {};

  const allCategories: Category[] = useMemo(() => {
    const kidsFlattened = Object.values(kids)
      .flat()
      .filter(Boolean);
    return [...adult, ...kidsFlattened].filter(Boolean);
  }, [adult, kids]);

  const initialCategory: Category | null = useMemo(() => {
    if (!currentCategory) {
      return adult[0] ?? Object.values(kids)[0]?.[0] ?? null;
    }

    let foundCat = adult.find(c => c.id === currentCategory.id);
    if (!foundCat) {
      foundCat = Object.values(kids)
        .flat()
        .find(c => c.id === currentCategory.id);
    }

    return foundCat ?? currentCategory;
  }, [currentCategory, adult, kids]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialCategory);
  const baseCategory = selectedCategory?.name ?? "Category";

  const handleCategoryFromSearch = (category: Category) => {
    setSelectedCategory(category);
    const productArea = document.getElementById("product-grid");
    if (productArea) productArea.scrollTop = 0;
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
  };

  // ---------- PRODUCT SELECTION ----------
const handleProductSelect = (product: Product) => {
  onSelectProduct(product); // ✅ Pass the full product
  onClose();
};

  // ---------- FILTER PRODUCTS ----------
  const filteredProducts = (selectedCategory?.products ?? []).map((p: Product) => {
    let images: string[] = [];

    if (Array.isArray(p.images) && p.images.length > 0) {
      images = p.images.map((img: any) => img.url || img.path || img);
    } else if (p.image) {
      images = [p.image];
    } else if (Array.isArray(p.colourProducts) && p.colourProducts.length > 0) {
      images = Array.isArray(p.colourProducts[0].images) ? p.colourProducts[0].images : [];
    }

    if (images.length === 0) {
      images = ["/images/no-image.png"];
    }

    return {
      ...p,
      images,
    };
  });

  // ---------- HIGHLIGHTED CATEGORIES ----------
  const highlightedAdultCategories = useMemo(() => {
    if (!selectedCategory) return adult.map(c => ({ ...c, isSelected: false }));

    const selName = (selectedCategory.name ?? "").toLowerCase().trim();
    const adultsMatching = adult
      .filter(c => (c.name ?? "").toLowerCase().trim() === selName)
      .map(c => ({ ...c, isSelected: selectedCategory.id === c.id }));

    if (!selectedCategory.age_group && !adultsMatching.some(c => c.id === selectedCategory.id)) {
      adultsMatching.push({ ...selectedCategory, isSelected: true });
    }

    return adultsMatching.length ? adultsMatching : adult.map(c => ({ ...c, isSelected: false }));
  }, [adult, selectedCategory]);

  const highlightedKidsCategories = useMemo(() => {
    if (!selectedCategory) {
      const grouped: Record<string, Category[]> = {};
      Object.entries(kids).forEach(([ageGroup, cats]) => {
        grouped[ageGroup] = Array.isArray(cats) ? cats.map(c => ({ ...c, isSelected: false })) : [];
      });
      return grouped;
    }

    const selName = (selectedCategory.name ?? "").toLowerCase().trim();
    const grouped: Record<string, Category[]> = {};

    Object.entries(kids).forEach(([ageGroup, cats]) => {
      if (!Array.isArray(cats)) return;

      const matched = cats
        .filter(c => (c.name ?? "").toLowerCase().trim() === selName)
        .map(c => ({ ...c, isSelected: selectedCategory.id === c.id }));

      if (matched.length > 0) grouped[ageGroup] = matched;
    });

    if (selectedCategory.age_group) {
      const ag = selectedCategory.age_group;
      if (!grouped[ag]) grouped[ag] = [];
      if (!grouped[ag].some(x => x.id === selectedCategory.id)) {
        grouped[ag].push({ ...selectedCategory, isSelected: true });
      }
    }

    return grouped;
  }, [kids, selectedCategory]);

  // ---------- RENDER ----------
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-10 animate-fadeIn">
      <div className="relative w-[92%] h-[90%] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {baseCategory}
          </h2>
          <div className="flex items-center gap-4">
            <SearchBar
              allAdultCategories={adult}
              allKidsCategories={kids}
              onSelectCategory={handleCategoryFromSearch}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-4xl font-bold transition-all"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-row gap-12 h-[calc(100%-90px)]">

          {/* LEFT SIDEBAR */}
          <div className="w-[270px] min-w-[270px] h-full border-r border-gray-200 dark:border-gray-700 pr-6 py-2 overflow-y-auto">

            {/* Adult */}
            <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Adult Sections</h3>
            <div className="space-y-2">
              {highlightedAdultCategories.length > 0 ? (
                highlightedAdultCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className={`block w-full px-4 py-3 rounded-xl text-left font-medium transition shadow-sm
                      ${cat.isSelected
                        ? "bg-gray-900 text-white dark:bg-gray-700 shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800"
                      }`}
                  >
                    {cat.section} — {cat.name}
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No adult sections for this category.</div>
              )}
            </div>

            {/* Kids */}
            <h3 className="text-lg font-semibold mt-8 mb-3 text-gray-700 dark:text-gray-200">Kids Sections</h3>
            {Object.keys(highlightedKidsCategories).length > 0 ? (
              Object.entries(highlightedKidsCategories).map(([ageGroup, cats]) => (
                <div key={ageGroup} className="mb-6">
                  <p className="font-semibold mb-2 text-gray-600 dark:text-gray-400">{ageGroup}</p>
                  <div className="space-y-2">
                    {cats.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat)}
                        className={`block w-full px-4 py-3 rounded-xl text-left font-medium transition shadow-sm
                          ${cat.isSelected
                            ? "bg-gray-900 text-white dark:bg-gray-700 shadow-md"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800"
                          }`}
                      >
                        {cat.age_group ? `${cat.age_group} - ${cat.section}` : cat.section} — {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No kids sections for this category.</div>
            )}

          </div>

          {/* PRODUCT GRID */}
          <div id="product-grid" className="flex-grow h-full overflow-y-auto pb-6 pr-2">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
                {filteredProducts.map(product => (
                  <div key={product.id} className="w-full max-w-[230px] h-[360px] flex flex-col">
                    <ChangeProductCard
                      product={product}
                      onSelect={() => handleProductSelect(product)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full max-w-[700px] h-[450px] border-4 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/30 mx-auto mt-10">
                <p className="text-gray-500 dark:text-gray-400 text-lg text-center">
                  No products found for this section.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
