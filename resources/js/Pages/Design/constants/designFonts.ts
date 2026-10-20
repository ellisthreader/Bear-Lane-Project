// Single source of truth for fonts available in the design editor.
//
// Every entry with a `file` is served through an @font-face rule in
// resources/css/design-fonts.css (the TTF lives in resources/fonts). "Inter" is
// pulled from Google Fonts because it is not shipped as a TTF.
//
// Text is measured (DOM + canvas) and rasterised (renderSnapshotToPng) using the
// same family string produced here, so what the customer sees is what is
// printed.

export type DesignFontCategory = "sans" | "serif" | "display" | "script" | "mono";

export type DesignFont = {
  name: string;
  file?: string;
  category: DesignFontCategory;
  fallback: string;
};

export const DEFAULT_DESIGN_FONT = "Inter";

export const DESIGN_FONTS: DesignFont[] = [
  { name: "Inter", category: "sans", fallback: "sans-serif" },
  { name: "Abril Fatface", file: "AbrilFatface-Regular.ttf", category: "serif", fallback: "serif" },
  { name: "Amaranth", file: "Amaranth-Regular.ttf", category: "sans", fallback: "sans-serif" },
  { name: "Anton", file: "Anton-Regular.ttf", category: "display", fallback: "sans-serif" },
  { name: "BBH Bogle", file: "BBHBogle-Regular.ttf", category: "display", fallback: "sans-serif" },
  { name: "Bebas Neue", file: "BebasNeue-Regular.ttf", category: "display", fallback: "sans-serif" },
  { name: "Caveat Brush", file: "CaveatBrush-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "Changa", file: "Changa-VariableFont_wght.ttf", category: "sans", fallback: "sans-serif" },
  { name: "Chewy", file: "Chewy-Regular.ttf", category: "display", fallback: "cursive" },
  { name: "Comfortaa", file: "Comfortaa-VariableFont_wght.ttf", category: "sans", fallback: "sans-serif" },
  { name: "Comic Neue", file: "ComicNeue-Regular.ttf", category: "sans", fallback: "cursive" },
  { name: "Courgette", file: "Courgette-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "DM Mono", file: "DMMono-Regular.ttf", category: "mono", fallback: "monospace" },
  { name: "Exo", file: "Exo-VariableFont_wght.ttf", category: "sans", fallback: "sans-serif" },
  { name: "Great Vibes", file: "GreatVibes-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "Indie Flower", file: "IndieFlower-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "Kaushan Script", file: "KaushanScript-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "Lobster", file: "Lobster-Regular.ttf", category: "display", fallback: "cursive" },
  { name: "Merienda", file: "Merienda-VariableFont_wght.ttf", category: "script", fallback: "cursive" },
  { name: "Reenie Beanie", file: "ReenieBeanie-Regular.ttf", category: "script", fallback: "cursive" },
  { name: "Satisfy", file: "Satisfy-Regular.ttf", category: "script", fallback: "cursive" },
];

export const DESIGN_FONT_CATEGORY_LABELS: Record<DesignFontCategory, string> = {
  sans: "Sans serif",
  serif: "Serif",
  display: "Display",
  script: "Script & handwritten",
  mono: "Monospace",
};

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"]);

export const findDesignFont = (name: string | null | undefined): DesignFont | undefined =>
  DESIGN_FONTS.find((font) => font.name.toLowerCase() === String(name ?? "").trim().toLowerCase());

const normaliseName = (name: string | null | undefined): string => {
  const trimmed = String(name ?? "").trim().replace(/^["']|["']$/g, "");
  return trimmed || DEFAULT_DESIGN_FONT;
};

/** CSS font-family value: quoted family plus a generic fallback, e.g. `"Abril Fatface", serif`. */
export const toCssFontFamily = (name: string | null | undefined): string => {
  const family = normaliseName(name);
  if (family.includes(",")) return family; // already a stack
  if (GENERIC_FAMILIES.has(family.toLowerCase())) return family;
  const known = findDesignFont(family);
  const fallback = known?.fallback ?? "sans-serif";
  return `"${known?.name ?? family}", ${fallback}`;
};

/** Canvas `ctx.font` shorthand for the given size + family. */
export const toCanvasFont = (sizePx: number, name: string | null | undefined, weight: string | number = "normal"): string =>
  `${weight} ${Math.max(1, Number(sizePx) || 1)}px ${toCssFontFamily(name)}`;

const hasFontApi = (): boolean =>
  typeof document !== "undefined" && typeof (document as any).fonts?.load === "function";

export const isDesignFontLoaded = (name: string | null | undefined, sizePx = 24): boolean => {
  if (!hasFontApi()) return false;
  try {
    return (document as any).fonts.check(toCanvasFont(sizePx, name));
  } catch {
    return false;
  }
};

const loadCache = new Map<string, Promise<void>>();

/** Loads the font (idempotent). Always resolves, even if the font fails to load. */
export const loadDesignFont = (name: string | null | undefined, sizePx = 24): Promise<void> => {
  if (!hasFontApi()) return Promise.resolve();
  const family = normaliseName(name);
  const key = family.toLowerCase();
  const cached = loadCache.get(key);
  if (cached) return cached;

  const promise = Promise.resolve()
    .then(() => (document as any).fonts.load(toCanvasFont(sizePx, family)))
    .then(() => undefined)
    .catch(() => {
      loadCache.delete(key);
    });
  loadCache.set(key, promise);
  return promise;
};

/** Preloads every editor font so the font picker previews render immediately. */
export const loadAllDesignFonts = (): Promise<void> =>
  Promise.all(DESIGN_FONTS.map((font) => loadDesignFont(font.name))).then(() => undefined);
