import type { SiteDesignColors, SiteDesignFonts } from "@/Theme/siteDesign";

export type ServerDesign = {
  colors: SiteDesignColors;
  fonts: SiteDesignFonts;
  images: {
    nav_logo_path: string;
    footer_logo_path: string;
    hero_slide_paths: string[];
    nav_logo_url: string | null;
    footer_logo_url: string | null;
    hero_slides: Array<{ path: string; url: string | null }>;
  };
};

export type DesignDefaults = {
  colors: SiteDesignColors;
  fonts: SiteDesignFonts;
};

export type LogoDraft = {
  /** Currently saved URL, if any. */
  url: string | null;
  /** Newly chosen file, not yet uploaded. */
  file: File | null;
  /** Staff asked to go back to the built-in logo. */
  reset: boolean;
};

export type HeroDraft = {
  id: string;
  /** Storage path for slides that are already saved. */
  path: string | null;
  url: string | null;
  file: File | null;
};

export type Draft = {
  colors: SiteDesignColors;
  fonts: SiteDesignFonts;
  navLogo: LogoDraft;
  footerLogo: LogoDraft;
  hero: HeroDraft[];
};

export type LogoKind = "navLogo" | "footerLogo";

export const DEFAULT_LOGOS: Record<LogoKind, string> = {
  navLogo: "/images/BLText.png",
  footerLogo: "/images/BL-LogoW.png",
};

let heroIdCounter = 0;
export const nextHeroId = () => `hero-${Date.now()}-${heroIdCounter++}`;

export function draftFromServer(server: ServerDesign): Draft {
  return {
    colors: { ...server.colors },
    fonts: { ...server.fonts },
    navLogo: { url: server.images.nav_logo_url, file: null, reset: false },
    footerLogo: { url: server.images.footer_logo_url, file: null, reset: false },
    hero: server.images.hero_slides.map((slide) => ({
      id: `saved-${slide.path}`,
      path: slide.path,
      url: slide.url,
      file: null,
    })),
  };
}

/** Stable representation used to detect unsaved changes. */
export function serializeDraft(draft: Draft): string {
  const fileKey = (file: File | null) => (file ? `file:${file.name}:${file.size}:${file.lastModified}` : "");
  return JSON.stringify({
    colors: draft.colors,
    fonts: draft.fonts,
    navLogo: [draft.navLogo.reset, fileKey(draft.navLogo.file)],
    footerLogo: [draft.footerLogo.reset, fileKey(draft.footerLogo.file)],
    hero: draft.hero.map((slide) => slide.path ?? fileKey(slide.file)),
  });
}
