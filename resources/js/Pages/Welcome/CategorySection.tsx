"use client";

import React from "react";

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
  return (
    <div className="pt-16 pb-8 bg-white w-full">
      <div className="flex gap-10 overflow-x-auto w-full px-6 no-scrollbar justify-between">

        {categories.map((category) => (
          <div
            key={category.name}
            className="flex flex-col items-center min-w-[128px] cursor-pointer group"
          >
            {/* Gold Gradient Ring */}
            <div className="p-[2px] rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>

            {/* Clean Solid Gold Text */}
            <span className="mt-3 text-center text-sm md:text-base font-semibold text-[#C9A227] tracking-wide group-hover:text-[#E3C55A] transition-colors">
              {category.name}
            </span>
          </div>
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
