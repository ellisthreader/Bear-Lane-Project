// The storefront palette is one warm gold system. Every hard-coded colour in
// the codebase falls into one of three families, each anchored on a single
// brand colour that staff can change from Admin > Other > Website Design.
//
// Ranges are HSL windows (hue in degrees, sat/light in 0-100). They are tuned
// to catch the Bear Lane palette while leaving Tailwind's own amber/yellow
// utilities (which are far more saturated) untouched.
//
// The anchors here MUST match the defaults in
// app/Services/StoreSettingsService::defaultWebsiteDesign().

export const THEME_FAMILIES = {
  accent: { anchor: "#C6A75E", hue: [36, 48], sat: [30, 80], light: [42.5, 86] },
  text: { anchor: "#2D2515", hue: [30, 48], sat: [15, 75], light: [0, 42.5] },
  surface: { anchor: "#FFFCF4", hue: [34, 50], sat: [25, 100], light: [86, 99.9] },
};

export const THEME_FAMILY_NAMES = /** @type {Array<keyof typeof THEME_FAMILIES>} */ (
  Object.keys(THEME_FAMILIES)
);

/**
 * @param {{ h: number, s: number, l: number }} hsl
 * @returns {keyof typeof THEME_FAMILIES | null}
 */
export function classifyHsl(hsl) {
  for (const name of THEME_FAMILY_NAMES) {
    const f = THEME_FAMILIES[name];
    if (
      hsl.h >= f.hue[0] && hsl.h <= f.hue[1] &&
      hsl.s >= f.sat[0] && hsl.s <= f.sat[1] &&
      hsl.l >= f.light[0] && hsl.l <= f.light[1]
    ) {
      return name;
    }
  }
  return null;
}
