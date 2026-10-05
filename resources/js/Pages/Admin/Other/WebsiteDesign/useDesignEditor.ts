import React from "react";
import { DESIGN_CHANNEL, type SiteDesign } from "@/Theme/siteDesign";
import {
  DEFAULT_LOGOS,
  draftFromServer,
  nextHeroId,
  serializeDraft,
  type DesignDefaults,
  type Draft,
  type LogoKind,
  type ServerDesign,
} from "./types";

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

export function useDesignEditor(initial: ServerDesign, defaults: DesignDefaults, maxHeroSlides: number) {
  const [server, setServer] = React.useState<ServerDesign>(initial);
  const [draft, setDraft] = React.useState<Draft>(() => draftFromServer(initial));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Object URLs for files that have not been uploaded yet, revoked on unmount.
  const objectUrls = React.useRef(new Map<File, string>());
  const urlForFile = React.useCallback((file: File) => {
    const cached = objectUrls.current.get(file);
    if (cached) return cached;
    const url = URL.createObjectURL(file);
    objectUrls.current.set(file, url);
    return url;
  }, []);
  React.useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const isDirty = React.useMemo(
    () => serializeDraft(draft) !== serializeDraft(draftFromServer(server)),
    [draft, server],
  );

  const previewDesign = React.useMemo<SiteDesign>(() => {
    const logoUrl = (kind: LogoKind) => {
      const logo = draft[kind];
      if (logo.file) return urlForFile(logo.file);
      if (logo.reset) return null;
      return logo.url;
    };
    return {
      colors: draft.colors,
      fonts: draft.fonts,
      images: {
        nav_logo_url: logoUrl("navLogo"),
        footer_logo_url: logoUrl("footerLogo"),
        hero_slides: draft.hero
          .map((slide) => (slide.file ? urlForFile(slide.file) : slide.url))
          .filter((url): url is string => Boolean(url)),
      },
    };
  }, [draft, urlForFile]);

  const touch = React.useCallback((updater: (prev: Draft) => Draft) => {
    setMessage(null);
    setError(null);
    setDraft(updater);
  }, []);

  const setColor = (key: keyof Draft["colors"], value: string) =>
    touch((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  const setColors = (colors: Draft["colors"]) => touch((prev) => ({ ...prev, colors: { ...colors } }));
  const setFont = (key: keyof Draft["fonts"], value: string) =>
    touch((prev) => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));

  const setLogoFile = (kind: LogoKind, file: File | null) =>
    touch((prev) => ({ ...prev, [kind]: { ...prev[kind], file, reset: false } }));
  const resetLogo = (kind: LogoKind) =>
    touch((prev) => ({ ...prev, [kind]: { url: prev[kind].url, file: null, reset: true } }));
  const logoPreviewUrl = (kind: LogoKind) => previewDesign.images[kind === "navLogo" ? "nav_logo_url" : "footer_logo_url"] ?? DEFAULT_LOGOS[kind];

  const addHeroFiles = (files: FileList | File[]) =>
    touch((prev) => {
      const room = Math.max(0, maxHeroSlides - prev.hero.length);
      const added = Array.from(files)
        .slice(0, room)
        .map((file) => ({ id: nextHeroId(), path: null, url: null, file }));
      return { ...prev, hero: [...prev.hero, ...added] };
    });
  const removeHero = (id: string) => touch((prev) => ({ ...prev, hero: prev.hero.filter((slide) => slide.id !== id) }));
  const moveHero = (id: string, delta: -1 | 1) =>
    touch((prev) => {
      const index = prev.hero.findIndex((slide) => slide.id === id);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= prev.hero.length) return prev;
      const hero = [...prev.hero];
      [hero[index], hero[target]] = [hero[target], hero[index]];
      return { ...prev, hero };
    });
  const clearHero = () => touch((prev) => ({ ...prev, hero: [] }));

  const resetToDefaults = () =>
    touch((prev) => ({
      colors: { ...defaults.colors },
      fonts: { ...defaults.fonts },
      navLogo: { url: prev.navLogo.url, file: null, reset: true },
      footerLogo: { url: prev.footerLogo.url, file: null, reset: true },
      hero: [],
    }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = new FormData();
      (Object.keys(draft.colors) as Array<keyof Draft["colors"]>).forEach((key) => payload.append(`colors[${key}]`, draft.colors[key]));
      payload.append("fonts[heading]", draft.fonts.heading);
      payload.append("fonts[body]", draft.fonts.body);
      if (draft.navLogo.file) payload.append("nav_logo", draft.navLogo.file);
      payload.append("nav_logo_reset", draft.navLogo.reset ? "1" : "0");
      if (draft.footerLogo.file) payload.append("footer_logo", draft.footerLogo.file);
      payload.append("footer_logo_reset", draft.footerLogo.reset ? "1" : "0");

      let uploadIndex = 0;
      const order = draft.hero.map((slide) => {
        if (slide.file) {
          payload.append(`hero_uploads[${uploadIndex}]`, slide.file);
          return `upload:${uploadIndex++}`;
        }
        return slide.path ?? "";
      });
      payload.append("hero_order", JSON.stringify(order.filter(Boolean)));

      const response = await fetch("/admin/other/website-design", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": getCsrfToken(), "X-Requested-With": "XMLHttpRequest" },
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstError = data.errors ? (Object.values(data.errors)[0] as string[] | undefined)?.[0] : null;
        throw new Error(firstError || data.message || "Unable to save website design.");
      }

      const saved = data.design as ServerDesign;
      setServer(saved);
      setDraft(draftFromServer(saved));
      setMessage(data.message || "Website design saved.");

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(DESIGN_CHANNEL);
        channel.postMessage({
          design: {
            colors: saved.colors,
            fonts: saved.fonts,
            images: {
              nav_logo_url: saved.images.nav_logo_url,
              footer_logo_url: saved.images.footer_logo_url,
              hero_slides: saved.images.hero_slides.map((slide) => slide.url).filter((url): url is string => Boolean(url)),
            },
          } satisfies SiteDesign,
        });
        channel.close();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save website design.");
    } finally {
      setSaving(false);
    }
  };

  return {
    draft, previewDesign, isDirty, saving, message, error,
    setColor, setColors, setFont,
    setLogoFile, resetLogo, logoPreviewUrl,
    addHeroFiles, removeHero, moveHero, clearHero,
    resetToDefaults, save,
    heroRoom: Math.max(0, maxHeroSlides - draft.hero.length),
  };
}

export type DesignEditor = ReturnType<typeof useDesignEditor>;
