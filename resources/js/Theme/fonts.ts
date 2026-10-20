// Curated font catalogue for Admin > Other > Website Design.
// Names must match StoreSettingsService::WEBSITE_DESIGN_FONTS.
// `weights` lists only weights Google Fonts actually serves for that family,
// because the css2 endpoint rejects requests for missing weights.

export type FontOption = {
  name: string;
  label: string;
  category: "system" | "sans" | "serif";
  stack: string;
  weights?: string;
};

export const SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

export const FONT_OPTIONS: FontOption[] = [
  { name: "system", label: "System default", category: "system", stack: SYSTEM_FONT_STACK },
  { name: "Inter", label: "Inter", category: "sans", stack: '"Inter", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "DM Sans", label: "DM Sans", category: "sans", stack: '"DM Sans", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Poppins", label: "Poppins", category: "sans", stack: '"Poppins", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Montserrat", label: "Montserrat", category: "sans", stack: '"Montserrat", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Nunito", label: "Nunito", category: "sans", stack: '"Nunito", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Lato", label: "Lato", category: "sans", stack: '"Lato", ' + SYSTEM_FONT_STACK, weights: "400;700;900" },
  { name: "Raleway", label: "Raleway", category: "sans", stack: '"Raleway", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Work Sans", label: "Work Sans", category: "sans", stack: '"Work Sans", ' + SYSTEM_FONT_STACK, weights: "400;500;600;700;800;900" },
  { name: "Playfair Display", label: "Playfair Display", category: "serif", stack: '"Playfair Display", Georgia, serif', weights: "400;500;600;700;800;900" },
  { name: "Lora", label: "Lora", category: "serif", stack: '"Lora", Georgia, serif', weights: "400;500;600;700" },
  { name: "Merriweather", label: "Merriweather", category: "serif", stack: '"Merriweather", Georgia, serif', weights: "400;700;900" },
  { name: "Cormorant Garamond", label: "Cormorant Garamond", category: "serif", stack: '"Cormorant Garamond", Georgia, serif', weights: "400;500;600;700" },
];

export function findFont(name: string | null | undefined): FontOption {
  return FONT_OPTIONS.find((font) => font.name === name) ?? FONT_OPTIONS[0];
}

export function googleFontHref(fonts: FontOption[]): string | null {
  const families = fonts
    .filter((font) => font.category !== "system" && font.weights)
    .map((font) => `family=${encodeURIComponent(font.name).replace(/%20/g, "+")}:wght@${font.weights}`);
  const unique = Array.from(new Set(families));
  if (unique.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${unique.join("&")}&display=swap`;
}

/** Ensures a <link> for the given fonts exists in the document head. Idempotent. */
export function ensureGoogleFontsLoaded(doc: Document, fonts: FontOption[]): void {
  const href = googleFontHref(fonts);
  if (!href) return;
  const existing = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[data-bl-font="1"]'));
  if (existing.some((link) => link.href === href)) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.blFont = "1";
  doc.head.appendChild(link);
}
