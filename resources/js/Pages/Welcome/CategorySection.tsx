"use client";

import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { announceDeleted } from "@/Components/SiteEditor/actions";
import { PickableImage, RawEditable } from "@/Components/SiteEditor/primitives";
import { selectTarget } from "@/Components/SiteEditor/selection";
import {
  addCategory,
  getEditorState,
  moveCategory,
  removeCategory,
  updateCategory,
  uploadImage,
  useEditMode,
  useEditorCategories,
  useEditorState,
} from "@/Components/SiteEditor/store";
import type { CategoryDraft } from "@/Components/SiteEditor/types";

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
  const editing = useEditMode();
  const draftCategories = useEditorCategories();

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

  if (editing && draftCategories) {
    return (
      <div id="shop-by-category" className="relative w-full pb-2 pt-14">
        <EditableCategories items={draftCategories} />
      </div>
    );
  }

  return (
    <div id="shop-by-category" className="relative pt-10 pb-2 w-full">
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

/** Edit mode: the same circles, but every one can be renamed, re-imaged, re-linked, moved or removed. */
function EditableCategories({ items }: { items: CategoryDraft[] }) {
  const { limits } = useEditorState();

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-10 px-4 py-6">
      {items.map((item, index) => (
        <EditableCircle key={item.key} item={item} index={index} count={items.length} />
      ))}

      {items.length < limits.categories ? (
        <div className="flex w-full justify-center">
          <button
            type="button"
            data-editor-ui
            onClick={addCategory}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-blue-400 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Add a category
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EditableCircle({ item, index, count }: { item: CategoryDraft; index: number; count: number }) {
  const key = item.key;

  // Reads the live draft (not this render's `item`) so the toolbar's link box is never stale.
  const linkAccess = () => ({
    link: {
      get: () => getEditorState().categories?.find((category) => category.key === key)?.href ?? "",
      set: (href: string) => updateCategory(key, { href }),
      suggestions: true,
    },
  });

  const image = {
    replace: async (file: File) => {
      const uploaded = await uploadImage(file);
      updateCategory(key, { image_path: uploaded.path, image_url: uploaded.url ?? "" });
    },
    canReset: () => false,
  };

  return (
    <div className="group/item relative flex shrink-0 flex-col items-center">
      <div
        data-editor-ui
        className="absolute -top-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-gray-900/90 p-0.5 text-white opacity-0 shadow-lg transition focus-within:opacity-100 group-hover/item:opacity-100"
      >
        <CirclePill title="Move earlier" disabled={index === 0} onClick={() => moveCategory(key, -1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </CirclePill>
        <CirclePill title="Move later" disabled={index === count - 1} onClick={() => moveCategory(key, 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </CirclePill>
        <CirclePill
          title={count <= 1 ? "Keep at least one category" : "Delete this category"}
          disabled={count <= 1}
          onClick={() => {
            const name = `category “${item.name}”`;
            removeCategory(key);
            announceDeleted(name);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </CirclePill>
      </div>

      <div className="rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] p-[2px]">
        <div className="h-32 w-32 overflow-hidden rounded-full bg-white lg:h-36 lg:w-36 xl:h-44 xl:w-44">
          <PickableImage
            url={item.image_url}
            editing
            label="Category image"
            image={image}
            extraTarget={linkAccess}
            imgProps={{ alt: item.name, className: "h-full w-full object-cover" }}
          />
        </div>
      </div>

      <RawEditable
        value={item.name}
        onValue={(name) => updateCategory(key, { name })}
        as="span"
        placeholder="Name"
        className="mt-3 text-center text-sm font-semibold tracking-wide text-[#C9A227] md:text-base lg:text-lg"
        onSelect={(el) => selectTarget({ el, label: "Category name", ...linkAccess() })}
      />
    </div>
  );
}

function CirclePill({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
