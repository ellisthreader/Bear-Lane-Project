"use client";

import React from "react";
import { router } from "@inertiajs/react";

const categories = [
  { name: "New In", image: "/images/Category/new-in.jpg" },
  { name: "Winter", image: "/images/Category/winter.jpg" },
  { name: "Sale", image: "/images/Category/sale.jpeg" },
  { name: "Shoes", image: "/images/Category/shoes.jpg" },
  { name: "Bags", image: "/images/Category/bags.jpg" },
  { name: "Teddies", image: "/images/Category/teddies.jpg" },
  { name: "T-Shirts", image: "/images/Category/tshirts.jpeg" },
  { name: "Jumpers", image: "/images/Category/jumpers.jpg" },
  { name: "Trousers", image: "/images/Category/trousers.jpg" },
  { name: "Accessories", image: "/images/Category/accessories.jpg" },
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
      <div className="flex gap-4 md:gap-10 overflow-x-auto w-full px-4 md:px-6 no-scrollbar justify-between">

        {categories.map((category) => (
          <button
            type="button"
            key={category.name}
            onClick={() => router.get(`/category/${toSlug(category.name)}`)}
            className="group flex min-w-[120px] flex-col items-center cursor-pointer text-left md:min-w-[128px]"
          >
            {/* Mobile box style */}
            <div className="md:hidden w-[108px] h-[108px] rounded-2xl overflow-hidden border border-[#E6D8B7] bg-white shadow-sm transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(45,34,15,0.12)]">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            {/* Desktop circle style */}
            <div className="hidden md:block p-[2px] rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>

            {/* Clean Solid Gold Text */}
            <span className="mt-3 text-center text-sm md:text-base font-semibold text-[#6A531E] md:text-[#C9A227] tracking-wide transition-colors group-hover:text-[#A8842A] md:group-hover:text-[#E3C55A]">
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
