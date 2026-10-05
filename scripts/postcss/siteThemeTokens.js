// PostCSS plugin: rewrites the Bear Lane palette into CSS custom properties so
// the storefront can be re-coloured at runtime from the admin Website Design
// page without touching the ~150 components that hard-code hex values.
//
// Every palette colour becomes `hsl(var(--bl-c-<hex>))`, where the variable is
// defined once per stylesheet as an HSL triple derived from its family anchor
// (--bl-accent-*, --bl-text-*, --bl-surface-*). With the anchors at their
// defaults every colour resolves to exactly its original value.

import { hexToHsl, rgbToHsl } from "../../resources/js/Theme/colorMath.js";
import { THEME_FAMILIES, THEME_FAMILY_NAMES, classifyHsl } from "../../resources/js/Theme/themeFamilies.js";

const HEX_RE = /#([0-9a-f]{8}|[0-9a-f]{6})(?![0-9a-f])/gi;

const num = (value) => {
  const fixed = Number(value.toFixed(3));
  return String(fixed);
};

function componentExpression(family, hsl) {
  const anchor = hexToHsl(THEME_FAMILIES[family].anchor);
  const prefix = `--bl-${family}`;

  const dh = hsl.h - anchor.h;
  const hue = Math.abs(dh) < 0.0005
    ? `var(${prefix}-h)`
    : `calc(var(${prefix}-h) ${dh < 0 ? "-" : "+"} ${num(Math.abs(dh))})`;

  const ratio = anchor.s === 0 ? 1 : hsl.s / anchor.s;
  const sat = Math.abs(ratio - 1) < 0.0005
    ? `var(${prefix}-s)`
    : `calc(var(${prefix}-s) * ${num(ratio)})`;

  let light;
  if (Math.abs(hsl.l - anchor.l) < 0.0005) {
    light = `var(${prefix}-l)`;
  } else if (hsl.l > anchor.l) {
    const p = (hsl.l - anchor.l) / (100 - anchor.l);
    light = `calc(var(${prefix}-l) + var(${prefix}-lt) * ${num(p)})`;
  } else {
    light = `calc(var(${prefix}-l) * ${num(hsl.l / anchor.l)})`;
  }

  return `${hue} ${sat} ${light}`;
}

function anchorDeclarations() {
  const out = [];
  for (const family of THEME_FAMILY_NAMES) {
    const { h, s, l } = hexToHsl(THEME_FAMILIES[family].anchor);
    out.push(`--bl-${family}-h:${num(h)}`);
    out.push(`--bl-${family}-s:${num(s)}%`);
    out.push(`--bl-${family}-l:${num(l)}%`);
    out.push(`--bl-${family}-lt:calc(100% - var(--bl-${family}-l))`);
  }
  return out;
}

function findClosingParen(value, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    if (value[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function rewriteRgbFunctions(value, register) {
  const re = /rgba?\(/gi;
  let out = "";
  let cursor = 0;
  let match;
  while ((match = re.exec(value)) !== null) {
    const open = match.index + match[0].length - 1;
    const close = findClosingParen(value, open);
    if (close === -1) break;
    const inner = value.slice(open + 1, close).trim();
    const replacement = rgbInnerToToken(inner, register);
    out += value.slice(cursor, match.index) + (replacement ?? value.slice(match.index, close + 1));
    cursor = close + 1;
    re.lastIndex = cursor;
  }
  return out + value.slice(cursor);
}

function rgbInnerToToken(inner, register) {
  let channels;
  let alpha = null;
  if (inner.includes("/")) {
    const [rgbPart, alphaPart] = inner.split("/");
    channels = rgbPart.trim().split(/\s+/);
    alpha = alphaPart.trim();
  } else {
    const parts = inner.split(",").map((p) => p.trim());
    channels = parts.slice(0, 3);
    if (parts.length === 4) alpha = parts[3];
  }
  if (channels.length !== 3 || channels.some((c) => !/^\d{1,3}$/.test(c))) return null;
  const [r, g, b] = channels.map((c) => Number(c));
  if ([r, g, b].some((c) => c > 255)) return null;
  const hex = [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
  return tokenFor(hex, rgbToHsl(r / 255, g / 255, b / 255), alpha, register);
}

function tokenFor(hex6, hsl, alpha, register) {
  const family = classifyHsl(hsl);
  if (!family) return null;
  const name = `--bl-c-${hex6.toLowerCase()}`;
  register(name, componentExpression(family, hsl));
  return alpha === null ? `hsl(var(${name}))` : `hsl(var(${name}) / ${alpha})`;
}

function rewriteValue(value, register) {
  const withHex = value.replace(HEX_RE, (full, digits) => {
    const hex6 = digits.slice(0, 6);
    let alpha = null;
    if (digits.length === 8) {
      alpha = num(parseInt(digits.slice(6, 8), 16) / 255);
    }
    return tokenFor(hex6, hexToHsl(hex6), alpha, register) ?? full;
  });
  return rewriteRgbFunctions(withHex, register);
}

export default function siteThemeTokens() {
  return {
    postcssPlugin: "bear-lane-site-theme-tokens",
    OnceExit(root, { Rule, Declaration }) {
      const definitions = new Map();
      const register = (name, expr) => {
        if (!definitions.has(name)) definitions.set(name, expr);
      };

      root.walkDecls((decl) => {
        const value = decl.value;
        if (!value || value.includes("url(") || value.includes('"') || value.includes("'")) return;
        if (!/#[0-9a-f]{6}|rgba?\(/i.test(value)) return;
        const next = rewriteValue(value, register);
        if (next !== value) decl.value = next;
      });

      if (definitions.size === 0) return;

      const rule = new Rule({ selector: ":root" });
      for (const text of anchorDeclarations()) {
        const [prop, ...rest] = text.split(":");
        rule.append(new Declaration({ prop, value: rest.join(":") }));
      }
      for (const [prop, value] of definitions) {
        rule.append(new Declaration({ prop, value }));
      }
      root.prepend(rule);
    },
  };
}

siteThemeTokens.postcss = true;
