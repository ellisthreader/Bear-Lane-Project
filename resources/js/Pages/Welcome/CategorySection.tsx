"use client";

import React from "react";
import { router } from "@inertiajs/react";

const categories = [
  { name: "New In", image: "/images/Category/new-in.jpg" },
  { name: "Pre made", image: "/images/Category/premade.jpg" },
  { name: "Sale", image: "/images/Category/sale.jpeg" },
  { name: "Kids Clothing", image: "/images/Category/kids.jpeg" },
  { name: "Bags", image: "/images/Category/bags.jpg" },
  { name: "Teddies", image: "/images/Category/teddies.jpg" },
  { name: "T-Shirts", image: "/images/Category/tshirts.jpeg" },
  { name: "Activewear", image: "/images/Category/sport.jpeg" },
  { name: "Trousers", image: "/images/Category/trousers.jpg" },
  { name: "Joke Products", image: "/images/Category/joke.jpeg" },
];

export default function CategorySection() {
  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    <div className="pt-16 pb-8 bg-white w-full">
      <div className="grid grid-cols-2 gap-3 px-4 md:hidden">
        {categories.map((category) => (
          <button
            type="button"
            key={`mobile-${category.name}`}
            onClick={() => router.get(`/category/${toSlug(category.name)}`)}
            className="group flex flex-col items-center"
          >
            <div className="h-[126px] w-full overflow-hidden rounded-2xl border border-[#E6D8B7] bg-white shadow-sm transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(45,34,15,0.12)]">
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="mt-2 text-center text-[13px] font-semibold tracking-wide text-[#6A531E] transition-colors group-hover:text-[#A8842A]">
              {category.name}
            </span>
          </button>
        ))}
      </div>

      <div className="hidden md:flex md:gap-10 overflow-x-auto w-full px-6 no-scrollbar justify-between">
        {categories.map((category) => (
          <button
            type="button"
            key={`desktop-${category.name}`}
            onClick={() => router.get(`/category/${toSlug(category.name)}`)}
            className="group flex min-w-[128px] flex-col items-center cursor-pointer text-left"
          >
            <div className="p-[2px] rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white">
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>
            <span className="mt-3 text-center text-sm md:text-base font-semibold text-[#C9A227] tracking-wide transition-colors group-hover:text-[#E3C55A]">
              {category.name}
            </span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
