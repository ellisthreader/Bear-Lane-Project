"use client";

import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { motion, useReducedMotion } from "framer-motion";
import { Pencil } from "lucide-react";

type HomepageCategory = {
  id: string;
  name: string;
  href: string;
  image_url: string;
};

type PageProps = {
  auth?: { user?: { is_admin?: boolean } };
  storeSettings?: { homepage_categories?: HomepageCategory[] };
};

const FALLBACK_CATEGORIES: HomepageCategory[] = [
  { id: "new-in", name: "New In", href: "/category/new-in", image_url: "/images/Category/new-in.jpg" },
  { id: "pre-made", name: "Pre made", href: "/category/pre-made", image_url: "/images/Category/premade.jpg" },
  { id: "sale", name: "Sale", href: "/category/sale", image_url: "/images/Category/sale.jpeg" },
  { id: "kids-clothing", name: "Kids Clothing", href: "/category/kids-clothing", image_url: "/images/Category/kids.jpeg" },
  { id: "teddies", name: "Teddies", href: "/category/teddies", image_url: "/images/Category/teddies.jpg" },
  { id: "t-shirts", name: "T-Shirts", href: "/category/t-shirts", image_url: "/images/Category/tshirts.jpeg" },
];

const openHref = (href: string) => {
  if (/^https?:\/\//i.test(href)) {
    window.location.href = href;
    return;
  }
  router.get(href);
};

export default function CategorySection() {
  const reduceMotion = useReducedMotion();
  const { props } = usePage<PageProps>();
  const isAdmin = Boolean(props.auth?.user?.is_admin);

  const categories = useMemo(() => {
    const fromSettings = props.storeSettings?.homepage_categories;
    if (Array.isArray(fromSettings) && fromSettings.length > 0) {
      return fromSettings.filter((item) => item && item.name);
    }
    return FALLBACK_CATEGORIES;
  }, [props.storeSettings?.homepage_categories]);

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
    <div id="shop-by-category" className="relative pt-10 pb-2 bg-white w-full">
      {isAdmin ? (
        <div className="absolute right-4 top-2 z-10 sm:right-6">
          <Link
            href="/admin/other/homepage?tab=categories"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6A6252] underline decoration-[#DCD5C7] decoration-1 underline-offset-4 transition hover:text-[#1F1A13] hover:decoration-[#1F1A13]"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            Edit categories
          </Link>
        </div>
      ) : null}

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
            key={`mobile-${category.id}`}
            onClick={() => openHref(category.href)}
            className="group flex flex-col items-center"
          >
            <div className="h-[150px] w-full overflow-hidden rounded-2xl border border-[#E6D8B7] bg-white shadow-sm transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(45,34,15,0.12)]">
              <img
                src={category.image_url}
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
              key={`desktop-${category.id}`}
              onClick={() => openHref(category.href)}
              className="group flex shrink-0 flex-col items-center cursor-pointer text-left"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]">
                <div className="w-32 h-32 lg:w-36 lg:h-36 xl:w-44 xl:h-44 2xl:w-52 2xl:h-52 rounded-full overflow-hidden bg-white">
                  <img
                    src={category.image_url}
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
