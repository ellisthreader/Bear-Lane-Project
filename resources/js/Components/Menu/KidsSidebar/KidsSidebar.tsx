"use client";

import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";

interface Props {
  closeSidebar: () => void;
}

export default function KidsSidebar({ closeSidebar }: Props) {
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMain, setSelectedMain] = useState<string | null>(null); // girl/boy

  // ------------------ TOP LEVEL LINKS ------------------
  const mainLinks = [
    { key: "girl", name: "Girl" },
    { key: "boy", name: "Boy" },
    { key: "bears", name: "Bears" }, // direct link
  ];

  const ageGroups: Record<string, string[]> = {
    girl: ["Baby & Newborn", "2-8 Years", "9-14 Years"],
    boy: ["Baby & Newborn", "2-8 Years", "9-14 Years"],
  };

  const categoryOptions = ["Clothing", "Shoes", "Accessories", "Brands"];

  const clothingSubs = [
    "Nightwear",
    "Jackets & Coats",
    "Jumpers",
    "Tops & T-shirts",
    "Dresses",
    "Trousers & Jeans",
    "Swimwear",
    "Shorts",
    "Socks",
  ];

  const shoesSubs = ["Trainers", "Sandals & Flip-Flops", "Boots", "Slippers"];

  const accessoriesSubs = ["Hats", "Scarves & Gloves", "Bibs"];

  const categoryMap: Record<string, string[]> = {
    Clothing: clothingSubs,
    Shoes: shoesSubs,
    Accessories: accessoriesSubs,
    Brands: [],
  };

  const bigLinks = [
    { key: "bestsellers", name: "Bestsellers" },
    { key: "trending-now", name: "Trending Now" },
    { key: "personalised-teddies", name: "PERSONALISED TEDDIES", color: "text-red-500" },
  ];

  const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const textClass =
    "text-black dark:text-gray-200 font-sans uppercase tracking-wide text-[14px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  const bigTextClass =
    "text-black dark:text-gray-100 font-sans font-bold uppercase tracking-wide text-[20px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  // ------------------ NAVIGATION ------------------
  const goToBears = () => {
    router.get("/category/kids/bears");
    closeSidebar();
  };

  const goToFinal = (main: string, age: string, category: string, sub: string) => {
    const pathParts = [
      slugify(main),
      slugify(category),
      slugify(age),
    ];
    if (sub) pathParts.push(slugify(sub));

    const url = `/category/kids/${pathParts.join("/")}`;
    console.log("Navigating to:", url);

    router.get(url);
    closeSidebar();
  };

  const handleBigLink = (key: string) => {
    if (key === "personalised-teddies") {
      router.get("/category/kids/personalised-teddies");
    } else {
      router.get(`/category/kids/${key}`);
    }
    closeSidebar();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ------------------ TOP LEVEL ------------------ */}
      {!selectedAge && !selectedCategory && (
        <>
          <h2 className={bigTextClass + " mb-6"}>Kids</h2>

          {/* BIG LINKS */}
          <div className="space-y-3 mb-6">
            {bigLinks.map((l) => (
              <button
                key={l.key}
                onClick={() => handleBigLink(l.key)}
                className={bigTextClass + " " + (l.color || "")}
              >
                {l.name}
              </button>
            ))}
          </div>

          {/* MAIN LINKS */}
          {mainLinks.map((m) =>
            m.key === "girl" || m.key === "boy" ? (
              <div key={m.key} className="mb-4">
                <div className={bigTextClass + " mb-2"}>{m.name}</div>
                <div className="space-y-2 ml-4">
                  {ageGroups[m.key].map((age) => (
                    <button
                      key={age}
                      className={textClass}
                      onClick={() => {
                        setSelectedMain(m.key);
                        setSelectedAge(age);
                      }}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button key={m.key} className={textClass} onClick={goToBears}>
                {m.name}
              </button>
            )
          )}
        </>
      )}

      {/* ------------------ CATEGORY OPTIONS ------------------ */}
      {selectedAge && !selectedCategory && (
        <>
          <button
            onClick={() => {
              setSelectedAge(null);
              setSelectedMain(null);
            }}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>

          <h3 className={bigTextClass + " mb-4"}>{selectedAge}</h3>

          <div className="space-y-3">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  categoryMap[cat].length === 0
                    ? goToFinal(selectedMain!, selectedAge, cat, "")
                    : setSelectedCategory(cat)
                }
                className={textClass}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ------------------ SUBCATEGORY SCREEN ------------------ */}
      {selectedCategory && selectedAge && selectedMain && (
        <>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>

          <h3 className={bigTextClass + " mb-4"}>{selectedCategory}</h3>

          <div className="space-y-3">
            {categoryMap[selectedCategory].map((sub) => (
              <button
                key={sub}
                onClick={() =>
                  goToFinal(selectedMain!, selectedAge, selectedCategory, sub)
                }
                className={textClass}
              >
                {sub}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
