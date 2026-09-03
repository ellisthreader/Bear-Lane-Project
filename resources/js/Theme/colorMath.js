// Shared colour maths used by both the PostCSS theme plugin (Node) and the
// browser runtime. Keep this file plain ESM JavaScript so Node can import it.

/**
 * @param {string} hex e.g. "#C6A75E"
 * @returns {{ h: number, s: number, l: number }} h in degrees, s/l in 0-100
 */
export function hexToHsl(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgbToHsl(r, g, b);
}

/**
 * @param {number} r 0-1
 * @param {number} g 0-1
 * @param {number} b 0-1
 */
export function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

/** @param {string} value */
export function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/**
 * Relative luminance for WCAG contrast (0-1).
 * @param {string} hex
 */
export function hexLuminance(hex) {
  const clean = hex.replace("#", "");
  const channel = (i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/**
 * WCAG contrast ratio between two hex colours.
 * @param {string} a
 * @param {string} b
 */
export function contrastRatio(a, b) {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
