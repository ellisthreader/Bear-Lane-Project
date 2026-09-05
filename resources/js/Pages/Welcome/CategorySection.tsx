"use client";

import React from "react";
import { router } from "@inertiajs/react";
import { motion, useReducedMotion } from "framer-motion";

const categories = [
  { name: "New In", image: "/images/Category/new-in.jpg" },
  { name: "Pre made", image: "/images/Category/premade.jpg" },
  { name: "Sale", image: "/images/Category/sale.jpeg" },
  { name: "Kids Clothing", image: "/images/Category/kids.jpeg" },
  { name: "Teddies", image: "/images/Category/teddies.jpg" },
  { name: "T-Shirts", image: "/images/Category/tshirts.jpeg" },
];

export default function CategorySection() {
  const reduceMotion = useReducedMotion();

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const containerVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
    },
  };

  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 24, scale: 0.92 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring" as const, stiffness: 260, damping: 22 },
        },
      };

  return (
    <div id="shop-by-category" className="pt-10 pb-2 bg-white w-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-2 gap-3 px-4 md:hidden"
      >
        {categories.map((category) => (
          <motion.button
            type="button"
            variants={itemVariants}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            key={`mobile-${category.name}`}
            onClick={() => router.get(`/category/${toSlug(category.name)}`)}
            className="group flex flex-col items-center"
          >
            <div className="h-[150px] w-full overflow-hidden rounded-2xl border border-[#E6D8B7] bg-white shadow-sm transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(45,34,15,0.12)]">
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
          </motion.button>
        ))}
      </motion.div>

      <div className="hidden md:block w-full overflow-x-auto no-scrollbar px-4 xl:px-6 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="flex w-max mx-auto gap-4 xl:gap-6 2xl:gap-10"
        >
          {categories.map((category) => (
            <motion.button
              type="button"
              variants={itemVariants}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              key={`desktop-${category.name}`}
              onClick={() => router.get(`/category/${toSlug(category.name)}`)}
              className="group flex shrink-0 flex-col items-center cursor-pointer text-left"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]">
                <div className="w-32 h-32 lg:w-36 lg:h-36 xl:w-44 xl:h-44 2xl:w-52 2xl:h-52 rounded-full overflow-hidden bg-white">
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
              <span className="mt-3 text-center text-sm md:text-base lg:text-lg font-semibold text-[#C9A227] tracking-wide transition-colors group-hover:text-[#E3C55A]">
                {category.name}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <style>{`
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
