import { useMemo, useSyncExternalStore } from "react";
import { router } from "@inertiajs/react";
import { toast } from "react-toastify";
import { DESIGN_CHANNEL, setPreviewSiteDesign, setServerSiteDesign, type SiteDesign } from "@/Theme/siteDesign";
import { THEME_FAMILIES } from "@/Theme/themeFamilies.js";
import { DEFAULT_HERO_SLIDE_PATHS, effectiveSectionOrder, isCustomSection } from "./sections";
import {
  EMPTY_CONTENT,
  normaliseContent,
  type CategoryDraft,
  type DesignDraft,
  type ElementStyle,
  type HomepageContent,
  type LinkOption,
  type SectionKey,
  type StoredImage,
} from "./types";

/*
 * One module-level store, like Theme/siteDesign.ts, so the nav toggle, the page sections,
 * the footer and the floating editor UI can all share the editing session without a provider.
 *
 * `server` is what visitors see. While editing, `draft` (+ `design`, `categories`) holds the
 * owner's unsaved changes; everything reads through `effective()` so the page previews them live.
 */

type Snapshot = { content: HomepageContent; design: DesignDraft; categories: CategoryDraft[] };

type EditorState = {
  server: HomepageContent;
  editing: boolean;
  loading: boolean;
  ready: boolean;
  saving: boolean;
  uploads: number;
  draft: HomepageContent;
  design: DesignDraft | null;
  categories: CategoryDraft[] | null;
  categoryLinks: LinkOption[];
  limits: { categories: number; heroSlides: number };
  base: Snapshot | null;
  dirty: boolean;
  /** Undo / redo history of the working draft (newest last). */
  past: Snapshot[];
  future: Snapshot[];
};

const DEFAULT_THEME = {
  colors: {
    accent: THEME_FAMILIES.accent.anchor,
    text: THEME_FAMILIES.text.anchor,
    surface: THEME_FAMILIES.surface.anchor,
  },
  fonts: { heading: "system", body: "system" },
};

let state: EditorState = {
  server: EMPTY_CONTENT,
  editing: false,
  loading: false,
  ready: false,
  saving: false,
  uploads: 0,
  draft: EMPTY_CONTENT,
  design: null,
  categories: null,
  categoryLinks: [],
  limits: { categories: 12, heroSlides: 6 },
  base: null,
  dirty: false,
  past: [],
  future: [],
};

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getState = () => state;

function commit(partial: Partial<EditorState>) {
  state = { ...state, ...partial };
  if (state.ready && state.base) state.dirty = diffParts(state).any;
  listeners.forEach((listener) => listener());
}

function diffParts(s: EditorState) {
  const base = s.base;
  const content = !!base && JSON.stringify(s.draft) !== JSON.stringify(base.content);
  const design = !!base && !!s.design && JSON.stringify(s.design) !== JSON.stringify(base.design);
  const categories = !!base && !!s.categories && JSON.stringify(s.categories) !== JSON.stringify(base.categories);
  return { content, design, categories, any: content || design || categories };
}

/** `selector` must return values that stay referentially equal while nothing relevant changed. */
function useStore<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

const effective = (s: EditorState): HomepageContent => (s.editing && s.ready ? s.draft : s.server);

/* ----------------------------------------------------------------------------------------------
 * Read hooks used by the page
 * -------------------------------------------------------------------------------------------- */

export const useEditorState = () => useSyncExternalStore(subscribe, getState, getState);
export const useEditMode = () => useStore((s) => s.editing && s.ready);
export const useEditingRequested = () => useStore((s) => s.editing);
export const useEditorDirty = () => useStore((s) => s.dirty);
export const useText = (id: string, fallback: string) => useStore((s) => effective(s).texts[id] ?? fallback);
export const useLink = (id: string) => useStore((s) => effective(s).links[id]);
export const useImageOverride = (id: string) => useStore((s) => effective(s).images[id]);
export const useStyleEntry = (id: string) => useStore((s) => effective(s).styles[id]);
export const useListIds = (id: string, defaults: string[]) => useStore((s) => effective(s).lists[id] ?? defaults);
export const useSectionConfig = () => useStore((s) => effective(s).sections);
export const useHiddenMap = () => useStore((s) => effective(s).hidden);
export const useHidden = (id: string) => useStore((s) => id in effective(s).hidden);
export const useCanUndo = () => useStore((s) => s.past.length > 0);
export const useCanRedo = () => useStore((s) => s.future.length > 0);

/** A list's item ids in order, without the ones the owner deleted. */
export function useVisibleIds(listId: string, defaults: string[]): string[] {
  const ids = useListIds(listId, defaults);
  const hidden = useHiddenMap();
  return useMemo(() => ids.filter((id) => !(itemKey(listId, id) in hidden)), [ids, hidden, listId]);
}
export const useEditorCategories = () => useStore((s) => (s.editing && s.ready ? s.categories : null));
export const useEditorDesign = () => useStore((s) => (s.editing && s.ready ? s.design : null));

export const getEditorState = getState;

/* ----------------------------------------------------------------------------------------------
 * Server <-> client shapes
 * -------------------------------------------------------------------------------------------- */

type ServerDesign = {
  colors: DesignDraft["colors"];
  fonts: DesignDraft["fonts"];
  images: {
    nav_logo_path?: string;
    nav_logo_url?: string | null;
    footer_logo_path?: string;
    footer_logo_url?: string | null;
    hero_slides?: Array<{ path: string; url: string | null }>;
  };
};

type ServerCategory = { id: string; name: string; href: string; image_path?: string; image_url: string };

const newKey = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function designFromServer(raw: ServerDesign): DesignDraft {
  const images = raw.images ?? {};
  const logo = (path?: string, url?: string | null): StoredImage | null => (path ? { path, url: url ?? null } : null);
  const slides = (images.hero_slides ?? []).map((slide) => ({ path: slide.path, url: slide.url }));

  return {
    colors: { ...raw.colors },
    fonts: { ...raw.fonts },
    nav_logo: logo(images.nav_logo_path, images.nav_logo_url),
    footer_logo: logo(images.footer_logo_path, images.footer_logo_url),
    hero_slides: slides.length > 0 ? slides : null,
  };
}

function categoriesFromServer(raw: ServerCategory[]): CategoryDraft[] {
  return (raw ?? []).map((item) => ({
    key: item.id || newKey(),
    id: item.id,
    name: item.name,
    href: item.href,
    image_path: item.image_path ?? "",
    image_url: item.image_url,
  }));
}

export function designToPublic(design: DesignDraft): SiteDesign {
  return {
    colors: design.colors,
    fonts: design.fonts,
    images: {
      nav_logo_url: design.nav_logo?.url ?? null,
      footer_logo_url: design.footer_logo?.url ?? null,
      hero_slides: (design.hero_slides ?? []).map((slide) => slide.url).filter((url): url is string => Boolean(url)),
    },
  };
}

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

async function requestJson<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      "X-CSRF-TOKEN": csrf(),
      "X-Requested-With": "XMLHttpRequest",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const firstError = data?.errors ? (Object.values(data.errors)[0] as string[] | undefined)?.[0] : null;
    throw new Error(firstError || data?.message || `Request failed (${response.status})`);
  }
  return data as T;
}

/* ----------------------------------------------------------------------------------------------
 * Session lifecycle
 * -------------------------------------------------------------------------------------------- */

export function setServerContent(raw: unknown) {
  if (!raw) return;
  commit({ server: normaliseContent(raw) });
}

export async function startEditing() {
  if (state.editing) return;
  commit({ editing: true, loading: true });

  try {
    const data = await requestJson<{
      content: unknown;
      design: ServerDesign;
      categories: ServerCategory[];
      category_links: LinkOption[];
      max_categories: number;
      max_hero_slides: number;
    }>("/admin/homepage-editor/state");

    const content = normaliseContent(data.content);
    const design = designFromServer(data.design);
    const categories = categoriesFromServer(data.categories);

    commit({
      loading: false,
      ready: true,
      draft: content,
      design,
      categories,
      categoryLinks: data.category_links ?? [],
      limits: { categories: data.max_categories ?? 12, heroSlides: data.max_hero_slides ?? 6 },
      base: { content, design, categories },
      dirty: false,
      past: [],
      future: [],
    });
    setPreviewSiteDesign(designToPublic(design));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not open the editor.");
    commit({ editing: false, loading: false, ready: false });
  }
}

/** Leaves edit mode and throws away anything unsaved. Callers confirm with the owner first. */
export function stopEditing() {
  if (!state.editing) return;
  setPreviewSiteDesign(null);
  commit({
    editing: false,
    loading: false,
    ready: false,
    draft: EMPTY_CONTENT,
    design: null,
    categories: null,
    base: null,
    dirty: false,
    past: [],
    future: [],
  });
}

export function discardChanges() {
  const base = state.base;
  if (!base) return;
  lastRecord = { key: "", at: 0 };
  commit({ draft: base.content, design: base.design, categories: base.categories, past: [], future: [] });
  syncPreview();
}

/* ----------------------------------------------------------------------------------------------
 * Undo / redo
 * -------------------------------------------------------------------------------------------- */

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;
let lastRecord = { key: "", at: 0 };

const snapshot = (): Snapshot | null =>
  state.ready && state.design && state.categories ? { content: state.draft, design: state.design, categories: state.categories } : null;

function syncPreview() {
  setPreviewSiteDesign(state.design ? designToPublic(state.design) : null);
}

/**
 * Remembers the draft as it is *before* a change so it can be undone. Edits that share a `key`
 * and follow each other quickly (typing, dragging a colour slider) count as one step.
 */
function record(key?: string) {
  const snap = snapshot();
  if (!snap) return;
  const now = Date.now();
  if (key && key === lastRecord.key && now - lastRecord.at < COALESCE_MS) {
    lastRecord.at = now;
    return;
  }
  lastRecord = { key: key ?? "", at: now };
  state = { ...state, past: [...state.past.slice(-(HISTORY_LIMIT - 1)), snap], future: [] };
}

export function undo() {
  const previous = state.past[state.past.length - 1];
  const current = snapshot();
  if (!previous || !current) return;
  lastRecord = { key: "", at: 0 };
  commit({
    past: state.past.slice(0, -1),
    future: [current, ...state.future],
    draft: previous.content,
    design: previous.design,
    categories: previous.categories,
  });
  syncPreview();
}

export function redo() {
  const next = state.future[0];
  const current = snapshot();
  if (!next || !current) return;
  lastRecord = { key: "", at: 0 };
  commit({
    past: [...state.past, current],
    future: state.future.slice(1),
    draft: next.content,
    design: next.design,
    categories: next.categories,
  });
  syncPreview();
}

export async function saveChanges(): Promise<boolean> {
  if (!state.ready || !state.base || state.saving) return false;
  const parts = diffParts(state);
  if (!parts.any) return true;

  commit({ saving: true });
  try {
    const payload: Record<string, unknown> = {};
    if (parts.content) payload.content = state.draft;
    if (parts.design && state.design) {
      payload.design = {
        colors: state.design.colors,
        fonts: state.design.fonts,
        nav_logo_path: state.design.nav_logo?.path ?? "",
        footer_logo_path: state.design.footer_logo?.path ?? "",
        hero_slide_paths: (state.design.hero_slides ?? []).map((slide) => slide.path),
      };
    }
    if (parts.categories && state.categories) {
      payload.categories = state.categories.map(({ id, name, href, image_path }) => ({ id, name, href, image_path }));
    }

    const data = await requestJson<{
      message?: string;
      content: unknown;
      design: ServerDesign;
      public_design: SiteDesign;
      categories: ServerCategory[];
    }>("/admin/homepage-editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const content = normaliseContent(data.content);
    const design = designFromServer(data.design);
    const categories = categoriesFromServer(data.categories);

    setServerSiteDesign(data.public_design);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(DESIGN_CHANNEL);
      channel.postMessage({ design: data.public_design });
      channel.close();
    }

    commit({ saving: false, server: content, draft: content, design, categories, base: { content, design, categories } });
    setPreviewSiteDesign(designToPublic(design));
    toast.success(data.message || "Saved. Your changes are live.");

    // Refresh shared props (category circles, nav logo, etc.) for the rest of the site.
    router.reload({ only: ["storeSettings"] });
    return true;
  } catch (error) {
    commit({ saving: false });
    toast.error(error instanceof Error ? error.message : "Could not save your changes.");
    return false;
  }
}

/** Clears every text, image, colour, list and section change (theme and category circles are kept). */
export function resetContent() {
  if (!state.ready) return;
  record();
  commit({ draft: EMPTY_CONTENT });
}

/* ----------------------------------------------------------------------------------------------
 * Uploads
 * -------------------------------------------------------------------------------------------- */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadImage(file: File, kind: "image" | "logo" = "image"): Promise<StoredImage> {
  const allowed = file.type.startsWith("image/") && (kind === "logo" || file.type !== "image/svg+xml");
  if (!allowed) {
    const message = "Please choose a JPG, PNG, WebP or GIF image.";
    toast.error(message);
    throw new Error(message);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const message = "That image is over 8 MB. Please choose a smaller one.";
    toast.error(message);
    throw new Error(message);
  }

  commit({ uploads: state.uploads + 1 });
  try {
    const body = new FormData();
    body.append("image", file);
    body.append("kind", kind);
    const data = await requestJson<{ path: string; url: string | null }>("/admin/homepage-editor/upload", {
      method: "POST",
      body,
    });
    return { path: data.path, url: data.url };
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Upload failed.");
    throw error;
  } finally {
    commit({ uploads: Math.max(0, state.uploads - 1) });
  }
}

/* ----------------------------------------------------------------------------------------------
 * Content edits
 * -------------------------------------------------------------------------------------------- */

function editContent(change: (content: HomepageContent) => HomepageContent, coalesce?: string) {
  if (!state.ready) return;
  record(coalesce);
  commit({ draft: change(state.draft) });
}

const without = <T>(map: Record<string, T>, id: string): Record<string, T> => {
  if (!(id in map)) return map;
  const { [id]: _removed, ...rest } = map;
  return rest;
};

/** Stores `value` unless it matches the built-in default, in which case the override is dropped. */
export function setText(id: string, value: string, fallback: string) {
  editContent(
    (c) => ({ ...c, texts: value === fallback ? without(c.texts, id) : { ...c.texts, [id]: value } }),
    `text:${id}`,
  );
}

export function setLink(id: string, href: string | undefined) {
  editContent((c) => ({ ...c, links: href === undefined ? without(c.links, id) : { ...c.links, [id]: href } }), `link:${id}`);
}

/** Setting a picture also brings back one that was deleted. */
export function setImage(id: string, image: StoredImage | null) {
  editContent((c) => ({
    ...c,
    images: image ? { ...c.images, [id]: image } : without(c.images, id),
    hidden: image ? without(c.hidden, id) : c.hidden,
  }));
}

type StylePatch = { [K in keyof ElementStyle]?: ElementStyle[K] | undefined };

/** Merges colour / size / position changes for one element; an undefined (or zero offset) removes that bit. */
export function setStyle(id: string, patch: StylePatch, coalesce?: string) {
  editContent((c) => {
    const next: Record<string, string | number> = { ...c.styles[id] };
    (Object.keys(patch) as Array<keyof ElementStyle>).forEach((key) => {
      const value = patch[key];
      const empty = value === undefined || value === "" || ((key === "x" || key === "y") && value === 0);
      if (empty) delete next[key];
      else next[key] = value as string | number;
    });
    return { ...c, styles: Object.keys(next).length > 0 ? { ...c.styles, [id]: next as ElementStyle } : without(c.styles, id) };
  }, coalesce);
}

/** Back to the built-in colours, size and position (the text itself is left alone). */
export function resetLook(id: string) {
  editContent((c) => ({ ...c, styles: without(c.styles, id) }));
}

export const getStyle = (id: string): ElementStyle | undefined => state.draft.styles[id];

/** Drops every override that belongs to a removed element (the id itself or "id.something"). */
function pruneItem(c: HomepageContent, prefix: string): HomepageContent {
  const keep = <T>(map: Record<string, T>) =>
    Object.fromEntries(Object.entries(map).filter(([key]) => key !== prefix && !key.startsWith(`${prefix}.`)));
  return { ...c, texts: keep(c.texts), links: keep(c.links), images: keep(c.images), styles: keep(c.styles), hidden: keep(c.hidden) };
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

function writeList(c: HomepageContent, listId: string, ids: string[], defaults: string[]): HomepageContent {
  return { ...c, lists: sameList(ids, defaults) ? without(c.lists, listId) : { ...c.lists, [listId]: ids } };
}

export const itemKey = (listId: string, itemId: string, field?: string) =>
  field ? `${listId}.${itemId}.${field}` : `${listId}.${itemId}`;

const newId = (prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 7)}`;

export function addListItem(listId: string, defaults: string[]): string {
  const id = newId("n");
  editContent((c) => writeList(c, listId, [...(c.lists[listId] ?? defaults), id], defaults));
  return id;
}

/**
 * Built-in items are hidden (so they can be brought back from "Deleted items"); items the owner
 * added themselves are simply removed.
 */
export function removeListItem(listId: string, itemId: string, defaults: string[], label = "") {
  if (defaults.includes(itemId)) {
    deleteElement(itemKey(listId, itemId), label || "Item");
    return;
  }
  editContent((c) => pruneItem(writeList(c, listId, (c.lists[listId] ?? defaults).filter((id) => id !== itemId), defaults), itemKey(listId, itemId)));
}

/** Swaps an item with its neighbour among the items that are still visible. */
export function moveListItem(listId: string, itemId: string, delta: -1 | 1, defaults: string[]) {
  editContent((c) => {
    const ids = [...(c.lists[listId] ?? defaults)];
    const visible = ids.filter((id) => !(itemKey(listId, id) in c.hidden));
    const target = visible[visible.indexOf(itemId) + delta];
    if (!target || !visible.includes(itemId)) return c;
    const from = ids.indexOf(itemId);
    const to = ids.indexOf(target);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    return writeList(c, listId, ids, defaults);
  });
}

/* ---- deleting and restoring anything on the page */

/** "extra.<section>.<itemId>[.field]" are blocks the owner added; they are removed for real. */
export function parseExtraId(id: string): { section: string; itemId: string } | null {
  const match = /^extra\.([a-z0-9-]+)\.([a-z0-9_-]+)(?:\.|$)/i.exec(id);
  return match ? { section: match[1], itemId: match[2] } : null;
}

export const extraList = (section: string) => `extra.${section}`;
export const extraKey = (section: string, itemId: string) => `extra.${section}.${itemId}`;

export function deleteElement(id: string, label: string) {
  const extra = parseExtraId(id);
  if (extra) {
    editContent((c) => {
      const list = extraList(extra.section);
      const ids = (c.lists[list] ?? []).filter((item) => item !== extra.itemId);
      return pruneItem({ ...c, lists: ids.length > 0 ? { ...c.lists, [list]: ids } : without(c.lists, list) }, extraKey(extra.section, extra.itemId));
    });
    return;
  }
  editContent((c) => ({ ...c, hidden: { ...c.hidden, [id]: label.slice(0, 80) || id } }));
}

export function restoreElement(id: string) {
  editContent((c) => ({ ...c, hidden: without(c.hidden, id) }));
}

/* ---- blocks and sections the owner adds */

export type ExtraKind = "text" | "button" | "image";
const EXTRA_PREFIX: Record<ExtraKind, string> = { text: "t", button: "b", image: "i" };
export const extraKindOf = (itemId: string): ExtraKind => (itemId[0] === "b" ? "button" : itemId[0] === "i" ? "image" : "text");

/** Adds a new text, button or picture to the end of a section; returns its element id. */
export function addExtra(section: string, kind: ExtraKind): string {
  const itemId = newId(EXTRA_PREFIX[kind]);
  const list = extraList(section);
  editContent((c) => ({ ...c, lists: { ...c.lists, [list]: [...(c.lists[list] ?? []), itemId] } }));
  return extraKey(section, itemId);
}

/** Adds a blank section right after `afterId` (or at the end); returns its key. */
export function addSection(afterId?: string): string {
  const id = `custom-${newId()}`;
  editContent((c) => {
    const order = [...effectiveSectionOrder(c.sections)];
    const at = afterId ? order.indexOf(afterId) + 1 : 0;
    order.splice(at > 0 ? at : order.length, 0, id);
    return { ...c, sections: { order } };
  });
  return id;
}

/** Built-in sections are hidden (restorable); the owner's own blank sections are removed with their content. */
export function deleteSection(id: SectionKey, label: string) {
  if (!isCustomSection(id)) {
    deleteElement(`section.${id}`, `Section: ${label}`);
    return;
  }
  editContent((c) => {
    const order = effectiveSectionOrder(c.sections).filter((item) => item !== id);
    return pruneItem({ ...c, lists: without(c.lists, extraList(id)), sections: { order } }, `extra.${id}`);
  });
}

/** Moves a section up or down among the sections that are still visible. */
export function moveSection(id: SectionKey, delta: -1 | 1) {
  editContent((c) => {
    const order = [...effectiveSectionOrder(c.sections)];
    const visible = order.filter((item) => !(`section.${item}` in c.hidden));
    const target = visible[visible.indexOf(id) + delta];
    if (!target || !visible.includes(id)) return c;
    const from = order.indexOf(id);
    const to = order.indexOf(target);
    [order[from], order[to]] = [order[to], order[from]];
    return { ...c, sections: { order } };
  });
}

/* ----------------------------------------------------------------------------------------------
 * Theme, logos and hero slides (stored through Website Design)
 * -------------------------------------------------------------------------------------------- */

function editDesign(change: (design: DesignDraft) => DesignDraft) {
  if (!state.ready || !state.design) return;
  record();
  const next = change(state.design);
  commit({ design: next });
  setPreviewSiteDesign(designToPublic(next));
}

export const themeDefaults = DEFAULT_THEME;

export function setThemeColor(key: keyof DesignDraft["colors"], hex: string) {
  editDesign((d) => ({ ...d, colors: { ...d.colors, [key]: hex.toUpperCase() } }));
}

export function setThemeFont(key: keyof DesignDraft["fonts"], name: string) {
  editDesign((d) => ({ ...d, fonts: { ...d.fonts, [key]: name } }));
}

export function resetTheme() {
  editDesign((d) => ({ ...d, colors: { ...DEFAULT_THEME.colors }, fonts: { ...DEFAULT_THEME.fonts } }));
}

export function setLogo(kind: "nav_logo" | "footer_logo", image: StoredImage | null) {
  editDesign((d) => ({ ...d, [kind]: image }));
}

const builtInSlides = (): StoredImage[] => DEFAULT_HERO_SLIDE_PATHS.map((path) => ({ path, url: `/${path}` }));

export function editHeroSlides(change: (slides: StoredImage[]) => StoredImage[]) {
  editDesign((d) => {
    const next = change(d.hero_slides ?? builtInSlides()).slice(0, state.limits.heroSlides);
    return { ...d, hero_slides: next.length > 0 ? next : null };
  });
}

/* ----------------------------------------------------------------------------------------------
 * Category circles
 * -------------------------------------------------------------------------------------------- */

function editCategories(change: (items: CategoryDraft[]) => CategoryDraft[], coalesce?: string) {
  if (!state.ready || !state.categories) return;
  record(coalesce);
  commit({ categories: change(state.categories) });
}

export function updateCategory(key: string, patch: Partial<Pick<CategoryDraft, "name" | "href" | "image_path" | "image_url">>) {
  editCategories((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)), `category:${key}:${Object.keys(patch).join()}`);
}

export function moveCategory(key: string, delta: -1 | 1) {
  editCategories((items) => {
    const from = items.findIndex((item) => item.key === key);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= items.length) return items;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
}

export function removeCategory(key: string) {
  editCategories((items) => (items.length > 1 ? items.filter((item) => item.key !== key) : items));
}

export function addCategory() {
  editCategories((items) =>
    items.length >= state.limits.categories
      ? items
      : [
          ...items,
          { key: newKey(), id: "", name: "New category", href: "/category/new-in", image_path: "", image_url: "/images/placeholder.jpg" },
        ],
  );
}

/* ----------------------------------------------------------------------------------------------
 * Browser wiring (call once from app.tsx)
 * -------------------------------------------------------------------------------------------- */

const isHomePath = (url: string) => url.split("?")[0].split("#")[0] === "/";

type PageProps = {
  auth?: { user?: { is_admin?: boolean } | null };
  storeSettings?: { homepage_content?: unknown };
};

/** The admin dashboard links to "/?edit=1" to open the homepage straight in edit mode. */
function startFromQuery(props: PageProps | undefined, url: string) {
  if (!props?.auth?.user?.is_admin || !isHomePath(url)) return;
  const params = new URLSearchParams(url.split("#")[0].split("?")[1] ?? "");
  if (params.get("edit") !== "1") return;

  params.delete("edit");
  const query = params.toString();
  // Inertia rewrites the URL once it has finished navigating, so tidy up after it.
  window.setTimeout(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
  }, 400);
  void startEditing();
}

export function bindEditorToInertia(initialPageProps: unknown) {
  const initial = initialPageProps as PageProps;
  setServerContent(initial?.storeSettings?.homepage_content);
  startFromQuery(initial, window.location.pathname + window.location.search);

  router.on("navigate", (event) => {
    const props = event.detail.page.props as PageProps;
    if (!state.editing) setServerContent(props.storeSettings?.homepage_content);
    if (state.editing && !isHomePath(event.detail.page.url)) stopEditing();
    startFromQuery(props, event.detail.page.url);
  });

  // Leaving the homepage (a different URL) with unsaved edits asks first; same-page reloads never do.
  router.on("before", (event) => {
    if (!state.editing || !state.dirty) return;
    const target = event.detail.visit.url as URL;
    if (target.pathname === window.location.pathname && target.search === window.location.search) return;
    if (!window.confirm("You have unsaved changes on the homepage. Leave without saving?")) event.preventDefault();
  });

  window.addEventListener("beforeunload", (event) => {
    if (state.editing && state.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}
