import { useSyncExternalStore } from "react";
import { hexToHsl, isHexColor } from "./colorMath.js";
import { THEME_FAMILY_NAMES } from "./themeFamilies.js";
import { ensureGoogleFontsLoaded, findFont } from "./fonts";

export type SiteDesignColors = { accent: string; text: string; surface: string };
export type SiteDesignFonts = { heading: string; body: string };
export type SiteDesignImages = {
  nav_logo_url: string | null;
  footer_logo_url: string | null;
  hero_slides: string[];
};
export type SiteDesign = {
  colors: SiteDesignColors;
  fonts: SiteDesignFonts;
  images: SiteDesignImages;
};

export const PREVIEW_QUERY_PARAM = "design_preview";
export const PREVIEW_MESSAGE = "bear-lane:design-preview";
export const PREVIEW_READY_MESSAGE = "bear-lane:design-preview-ready";
export const DESIGN_CHANNEL = "bear-lane:site-design";

type StoreState = { server: SiteDesign | null; preview: SiteDesign | null };

const state: StoreState = { server: null, preview: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSiteDesign(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEffectiveSiteDesign(): SiteDesign | null {
  return state.preview ?? state.server;
}

export function isPreviewingSiteDesign(): boolean {
  return state.preview !== null;
}

export function setServerSiteDesign(design: SiteDesign | null | undefined): void {
  if (!design) return;
  state.server = design;
  emit();
}

export function setPreviewSiteDesign(design: SiteDesign | null): void {
  state.preview = design;
  emit();
}

export function useSiteDesign(): SiteDesign | null {
  return useSyncExternalStore(subscribeSiteDesign, getEffectiveSiteDesign, getEffectiveSiteDesign);
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

const COLOR_KEYS = THEME_FAMILY_NAMES as Array<keyof SiteDesignColors>;

/**
 * Writes the theme onto <html> as CSS variables. Passing null clears every
 * variable so the stylesheet defaults (the original Bear Lane palette) apply.
 */
export function applySiteDesignToDocument(doc: Document, design: SiteDesign | null): void {
  const style = doc.documentElement.style;

  for (const key of COLOR_KEYS) {
    const hex = design?.colors?.[key];
    if (hex && isHexColor(hex)) {
      const { h, s, l } = hexToHsl(hex);
      style.setProperty(`--bl-${key}-h`, h.toFixed(3));
      style.setProperty(`--bl-${key}-s`, `${s.toFixed(3)}%`);
      style.setProperty(`--bl-${key}-l`, `${l.toFixed(3)}%`);
    } else {
      style.removeProperty(`--bl-${key}-h`);
      style.removeProperty(`--bl-${key}-s`);
      style.removeProperty(`--bl-${key}-l`);
    }
  }

  const body = findFont(design?.fonts?.body);
  const heading = findFont(design?.fonts?.heading);
  if (design && body.category !== "system") style.setProperty("--bl-font-body", body.stack);
  else style.removeProperty("--bl-font-body");
  if (design && heading.category !== "system") style.setProperty("--bl-font-heading", heading.stack);
  else style.removeProperty("--bl-font-heading");
  if (design) ensureGoogleFontsLoaded(doc, [body, heading]);
}
