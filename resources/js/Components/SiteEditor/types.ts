// Shapes shared by the on-page homepage editor. The server-side twin of these lives in
// App\Services\StoreSettingsService (normalizeHomepageContent) — keep them in step.

export type SectionId =
  | "hero"
  | "categories"
  | "idea"
  | "how"
  | "featured"
  | "premade"
  | "reviews"
  | "trust";

/** A section is one of the built-in ones, or a blank section the owner added ("custom-xxxx"). */
export type SectionKey = string;

export type StoredImage = { path: string; url: string | null };

/**
 * Per-element look: colours, font size (px) and how far the owner dragged it (px) from where the
 * layout put it. Size and position only apply from tablet width up; phones keep the built-in layout.
 */
export type ElementStyle = { color?: string; background?: string; size?: number; x?: number; y?: number };

/**
 * Everything the owner has changed on the homepage. Each map holds only overrides keyed by
 * element id (e.g. "idea.title"); anything missing falls back to the default in the component.
 */
export type HomepageContent = {
  texts: Record<string, string>;
  links: Record<string, string>;
  images: Record<string, StoredImage>;
  styles: Record<string, ElementStyle>;
  lists: Record<string, string[]>;
  /** Deleted built-in elements: id -> a readable name, so the owner can bring them back. */
  hidden: Record<string, string>;
  sections: { order: SectionKey[] };
};

export const EMPTY_CONTENT: HomepageContent = {
  texts: {},
  links: {},
  images: {},
  styles: {},
  lists: {},
  hidden: {},
  sections: { order: [] },
};

const asMap = <T,>(value: unknown): Record<string, T> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, T>) : {};
const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** PHP encodes an empty map as `[]`; coerce anything the server sends into the full shape. */
export function normaliseContent(raw: unknown): HomepageContent {
  const source = asMap<unknown>(raw);
  const sections = asMap<unknown>(source.sections);
  const hidden = asMap<string>(source.hidden);

  // Earlier versions kept deleted sections in sections.hidden.
  for (const id of asList<string>(sections.hidden)) {
    if (typeof id === "string" && !(`section.${id}` in hidden)) hidden[`section.${id}`] = `Section: ${id}`;
  }

  return {
    texts: asMap<string>(source.texts),
    links: asMap<string>(source.links),
    images: asMap<StoredImage>(source.images),
    styles: asMap<ElementStyle>(source.styles),
    lists: asMap<string[]>(source.lists),
    hidden,
    sections: { order: asList<SectionKey>(sections.order) },
  };
}

/** Theme + media that already live in Website Design; the editor writes them through the same store. */
export type DesignDraft = {
  colors: { accent: string; text: string; surface: string };
  fonts: { heading: string; body: string };
  nav_logo: StoredImage | null;
  footer_logo: StoredImage | null;
  /** null = the built-in slides; an array = the owner's own set. */
  hero_slides: StoredImage[] | null;
};

export type CategoryDraft = {
  /** Stable client key so rows can be reordered before they have a server id. */
  key: string;
  id: string;
  name: string;
  href: string;
  image_path: string;
  image_url: string;
};

export type LinkOption = { label: string; href: string };

/** What an element tells the floating toolbar it can do. Closures read live store values. */
export type EditTarget = {
  el: HTMLElement;
  label: string;
  color?: ColorCap;
  background?: ColorCap;
  link?: { get: () => string; set: (href: string) => void; suggestions?: boolean; blankHint?: string };
  image?: { replace: (file: File) => Promise<void>; reset?: () => void; canReset: () => boolean };
  /** Drag it anywhere. */
  move?: MoveCap;
  /** Make the text bigger or smaller. */
  size?: SizeCap;
  /** Delete it (the owner can undo, or restore it from "Deleted items"). */
  remove?: () => void;
  /** Put its colours, size and position back to how they were built. */
  resetLook?: { has: () => boolean; run: () => void };
};

export type ColorCap = {
  get: () => string | undefined;
  set: (hex: string | undefined) => void;
};

export type MoveCap = {
  get: () => { x: number; y: number };
  set: (x: number, y: number) => void;
};

export type SizeCap = {
  /** The owner's size in px, or undefined while the built-in size is in use. */
  get: () => number | undefined;
  set: (px: number | undefined) => void;
};
