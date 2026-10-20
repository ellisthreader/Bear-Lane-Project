import type { SectionId, SectionKey } from "./types";

// Section ids must match StoreSettingsService::HOMEPAGE_SECTIONS.

/** Desktop order as designed. */
export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "hero",
  "categories",
  "idea",
  "how",
  "featured",
  "premade",
  "reviews",
  "trust",
];

export const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero images",
  categories: "Categories",
  idea: "Intro",
  how: "How it works",
  featured: "Featured products",
  premade: "Pre-made designs",
  reviews: "Reviews",
  trust: "Why choose us",
};

/** Blank sections the owner adds are keyed "custom-xxxx" (see StoreSettingsService). */
const CUSTOM_SECTION = /^custom-[a-z0-9]{3,12}$/;
export const isCustomSection = (id: string) => CUSTOM_SECTION.test(id);
export const sectionLabel = (id: string) => SECTION_LABELS[id as SectionId] ?? "New section";

/**
 * Until the owner picks their own order, sections keep the designed layout: on phones the intro
 * sits above the category circles. Full class names so Tailwind can see them.
 */
export const DEFAULT_ORDER_CLASSES: Record<SectionId, string> = {
  hero: "order-1",
  categories: "order-3 md:order-2",
  idea: "order-2 md:order-3",
  how: "order-4",
  featured: "order-4",
  premade: "order-4",
  reviews: "order-4",
  trust: "order-4",
};

/** The built-in hero slides (paths relative to public/), used until the owner picks their own. */
export const DEFAULT_HERO_SLIDE_PATHS = [
  "hero.webp",
  "images/HeroSection/hero-clothing2.webp",
  "images/HeroSection/hero-clothing3.webp",
  "images/HeroSection/hero-clothing4.webp",
];

/** The saved order, completed with any built-in section it does not mention (in its default position). */
export function effectiveSectionOrder(sections: { order: SectionKey[] }): SectionKey[] {
  const known = (id: string) => DEFAULT_SECTION_ORDER.includes(id as SectionId) || isCustomSection(id);
  const custom = sections.order.filter(known);
  if (custom.length === 0) return DEFAULT_SECTION_ORDER;
  return [...custom, ...DEFAULT_SECTION_ORDER.filter((id) => !custom.includes(id))];
}
