import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@inertiajs/react";
import { toast } from "react-toastify";
import { ImagePlus, LayoutPanelTop, Search, Sparkles, Star } from "lucide-react";
import {
  AdminPage,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Notice,
  PlusMinusButton,
  SaveBar,
  SegmentedTabs,
  Select,
  adminFetch,
  formatMoney,
  inputClass,
} from "@/Components/Admin/ui";
import SortableList, { DragHandle } from "@/Components/Admin/SortableList";

type FrontPageSettings = {
  featured_product_ids: number[];
  premade_product_ids: number[];
  premade_quotes?: Record<string, string>;
};

type HomepageCategory = {
  id: string;
  name: string;
  href: string;
  image_path?: string;
  image_url: string;
};

type ProductOption = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: number;
  image_url: string;
  is_premade_design: boolean;
};

type CategoryLink = { label: string; href: string };

type Props = {
  frontPage: FrontPageSettings;
  homepageCategories: HomepageCategory[];
  products: ProductOption[];
  categoryLinks: CategoryLink[];
  maxCategories: number;
};

type Tab = "categories" | "featured" | "premade";

/** Local editing shape for a category circle; `file` holds a pending upload. */
type CategoryDraft = {
  key: string; // stable client key for sorting
  id: string; // server id ("" for new)
  name: string;
  href: string;
  image_path: string;
  image_url: string;
  file: File | null;
  preview: string;
};

const CUSTOM_LINK = "__custom__";

const newKey = () => `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDrafts = (items: HomepageCategory[]): CategoryDraft[] =>
  items.map((item) => ({
    key: item.id || newKey(),
    id: item.id,
    name: item.name,
    href: item.href,
    image_path: item.image_path ?? "",
    image_url: item.image_url,
    file: null,
    preview: item.image_url,
  }));

const normaliseIds = (ids: unknown): number[] =>
  Array.isArray(ids) ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) : [];

const normaliseQuotes = (value: unknown): Record<string, string> =>
  typeof value === "object" && value !== null ? (value as Record<string, string>) : {};

const initialTab = (): Tab => {
  if (typeof window === "undefined") return "categories";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab === "featured" || tab === "premade" ? tab : "categories";
};

const CIRCLE_RING = "rounded-full bg-gradient-to-br from-[#9C7C19] via-[#D4AF37] to-[#7A5C12] p-[2px]";

export default function Homepage({ frontPage, homepageCategories, products, categoryLinks, maxCategories }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // --- categories ---
  const [savedCategories, setSavedCategories] = useState<HomepageCategory[]>(homepageCategories);
  const [categories, setCategories] = useState<CategoryDraft[]>(() => toDrafts(homepageCategories));
  const [categoriesDirty, setCategoriesDirty] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // --- products ---
  const [savedFront, setSavedFront] = useState<FrontPageSettings>(frontPage);
  const [featuredIds, setFeaturedIds] = useState<number[]>(() => normaliseIds(frontPage.featured_product_ids));
  const [premadeIds, setPremadeIds] = useState<number[]>(() => normaliseIds(frontPage.premade_product_ids));
  const [premadeQuotes, setPremadeQuotes] = useState<Record<string, string>>(() => normaliseQuotes(frontPage.premade_quotes));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke object URLs when previews are replaced or the page unmounts.
  useEffect(() => {
    return () => {
      categories.forEach((c) => {
        if (c.file && c.preview.startsWith("blob:")) URL.revokeObjectURL(c.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<number, ProductOption>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const productsDirty = useMemo(() => {
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
    if (!same(featuredIds, normaliseIds(savedFront.featured_product_ids))) return true;
    if (!same(premadeIds, normaliseIds(savedFront.premade_product_ids))) return true;
    const savedQuotes = normaliseQuotes(savedFront.premade_quotes);
    const keys = new Set([...Object.keys(savedQuotes), ...Object.keys(premadeQuotes)]);
    for (const key of keys) {
      if ((savedQuotes[key] || "").trim() !== (premadeQuotes[key] || "").trim()) return true;
    }
    return false;
  }, [featuredIds, premadeIds, premadeQuotes, savedFront]);

  const dirty = categoriesDirty || productsDirty;

  /* ---------------- category handlers ---------------- */

  const updateCategory = (key: string, patch: Partial<CategoryDraft>) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
    setCategoriesDirty(true);
  };

  const addCategory = () => {
    if (categories.length >= maxCategories) {
      toast.info(`You can show up to ${maxCategories} categories.`);
      return;
    }
    setCategories((prev) => [
      ...prev,
      { key: newKey(), id: "", name: "", href: "", image_path: "", image_url: "", file: null, preview: "" },
    ]);
    setCategoriesDirty(true);
  };

  const removeCategory = (key: string) => {
    setCategories((prev) => {
      const target = prev.find((c) => c.key === key);
      if (target?.file && target.preview.startsWith("blob:")) URL.revokeObjectURL(target.preview);
      return prev.filter((c) => c.key !== key);
    });
    setCategoriesDirty(true);
  };

  const pickImage = (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setCategories((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.file && c.preview.startsWith("blob:")) URL.revokeObjectURL(c.preview);
        return { ...c, file, preview: URL.createObjectURL(file) };
      })
    );
    setCategoriesDirty(true);
  };

  const discardCategories = () => {
    categories.forEach((c) => {
      if (c.file && c.preview.startsWith("blob:")) URL.revokeObjectURL(c.preview);
    });
    setCategories(toDrafts(savedCategories));
    setCategoriesDirty(false);
  };

  /* ---------------- product handlers ---------------- */

  const listFor = (which: "featured" | "premade") => (which === "featured" ? featuredIds : premadeIds);
  const setListFor = (which: "featured" | "premade") => (which === "featured" ? setFeaturedIds : setPremadeIds);

  const addProduct = (which: "featured" | "premade", id: number) => {
    setError(null);
    setListFor(which)((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeProduct = (which: "featured" | "premade", id: number) => {
    setListFor(which)((prev) => prev.filter((item) => item !== id));
    if (which === "premade") {
      setPremadeQuotes((prev) => {
        const next = { ...prev };
        delete next[String(id)];
        return next;
      });
    }
  };

  const discardProducts = () => {
    setFeaturedIds(normaliseIds(savedFront.featured_product_ids));
    setPremadeIds(normaliseIds(savedFront.premade_product_ids));
    setPremadeQuotes(normaliseQuotes(savedFront.premade_quotes));
  };

  /* ---------------- save ---------------- */

  const save = async () => {
    setSaving(true);
    setError(null);
    const messages: string[] = [];
    try {
      if (categoriesDirty) {
        const valid = categories.filter((c) => c.name.trim() !== "");
        if (valid.length === 0) throw new Error("Add at least one category with a name.");
        const missingImage = valid.find((c) => !c.file && !c.image_path && !c.image_url);
        if (missingImage) throw new Error(`Add an image for "${missingImage.name.trim()}".`);

        const formData = new FormData();
        const items = valid.map((c, index) => {
          const uploadKey = c.file ? `u${index}` : "";
          if (c.file) formData.append(`uploads[${uploadKey}]`, c.file);
          return {
            id: c.id,
            name: c.name.trim(),
            href: c.href.trim(),
            image_path: c.image_path,
            upload_key: uploadKey,
          };
        });
        formData.append("items", JSON.stringify(items));

        const data = await adminFetch<{ homepage_categories: HomepageCategory[]; message?: string }>(
          "/admin/other/homepage/categories",
          { method: "POST", formData }
        );
        const next = Array.isArray(data.homepage_categories) ? data.homepage_categories : [];
        categories.forEach((c) => {
          if (c.file && c.preview.startsWith("blob:")) URL.revokeObjectURL(c.preview);
        });
        setSavedCategories(next);
        setCategories(toDrafts(next));
        setCategoriesDirty(false);
        messages.push(data.message || "Homepage categories saved.");
      }

      if (productsDirty) {
        const data = await adminFetch<{ front_page?: FrontPageSettings; message?: string }>(
          "/admin/other/homepage/products",
          {
            method: "PUT",
            body: {
              featured_product_ids: featuredIds,
              premade_product_ids: premadeIds,
              premade_quotes: premadeQuotes,
            },
          }
        );
        const next: FrontPageSettings = {
          featured_product_ids: normaliseIds(data.front_page?.featured_product_ids ?? featuredIds),
          premade_product_ids: normaliseIds(data.front_page?.premade_product_ids ?? premadeIds),
          premade_quotes: normaliseQuotes(data.front_page?.premade_quotes ?? premadeQuotes),
        };
        setSavedFront(next);
        setFeaturedIds(next.featured_product_ids);
        setPremadeIds(next.premade_product_ids);
        setPremadeQuotes(next.premade_quotes ?? {});
        messages.push(data.message || "Homepage products saved.");
      }

      toast.success(messages.join(" ") || "Saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save homepage settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    discardCategories();
    discardProducts();
    setError(null);
  };

  /* ---------------- derived for product tabs ---------------- */

  const activeWhich: "featured" | "premade" = tab === "premade" ? "premade" : "featured";
  const selectedIds = listFor(activeWhich);
  const selectedProducts = selectedIds.map((id) => productMap.get(id)).filter(Boolean) as ProductOption[];

  const library = useMemo(() => {
    const base = activeWhich === "premade" ? products.filter((p) => p.is_premade_design) : products;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => `${p.name} ${p.brand} ${p.slug}`.toLowerCase().includes(q));
  }, [activeWhich, products, query]);

  const linkOptions = useMemo(() => categoryLinks, [categoryLinks]);
  const isKnownLink = (href: string) => linkOptions.some((l) => l.href === href);

  return (
    <AdminPage
      eyebrow="Other / Homepage"
      title="Homepage"
      description="Choose the category circles under the hero, and which products appear in the Featured and Pre-Made rails. Drag to reorder, use + and − to add or remove."
      backHref="/admin/other"
      backLabel="Back to Other"
      actions={
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-xl border border-[#DCCFB4] bg-white px-3 text-sm font-semibold text-[#4E3F1F] transition hover:border-[#C6A75E]"
        >
          View homepage
        </Link>
      }
    >
      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "categories", label: "Category Circles", count: categories.length, icon: <LayoutPanelTop className="h-4 w-4" /> },
          { key: "featured", label: "Featured Products", count: featuredIds.length, icon: <Star className="h-4 w-4" /> },
          { key: "premade", label: "Pre-Made Designs", count: premadeIds.length, icon: <Sparkles className="h-4 w-4" /> },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {tab === "categories" ? (
        <>
          <Card tone="muted" padding="sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">Live preview</p>
            {categories.length === 0 ? (
              <p className="text-sm text-[#7A6640]">No categories yet.</p>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((c) => (
                  <div key={c.key} className="flex w-20 shrink-0 flex-col items-center">
                    <div className={CIRCLE_RING}>
                      <div className="h-16 w-16 overflow-hidden rounded-full bg-white">
                        {c.preview ? (
                          <img src={c.preview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#C6A75E]">
                            <ImagePlus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="mt-2 w-full truncate text-center text-[11px] font-semibold text-[#C9A227]">
                      {c.name.trim() || "Untitled"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Category circles"
            description={`Shown just below the hero on the homepage. Up to ${maxCategories}.`}
            actions={
              <Button variant="primary" onClick={addCategory} disabled={categories.length >= maxCategories} icon={<span className="text-base leading-none">+</span>}>
                Add category
              </Button>
            }
          >
            {categories.length === 0 ? (
              <EmptyState
                icon={<LayoutPanelTop className="h-5 w-5" />}
                title="No category circles"
                description="Add a category to show a circular shortcut on the homepage."
                action={<Button variant="gold" onClick={addCategory}>+ Add category</Button>}
              />
            ) : (
              <SortableList
                items={categories}
                getKey={(c) => c.key}
                onReorder={(next) => {
                  setCategories(next);
                  setCategoriesDirty(true);
                }}
                layout="grid"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                renderItem={(c, { index, dragHandleProps }) => {
                  const selectValue = c.href === "" ? "" : isKnownLink(c.href) ? c.href : CUSTOM_LINK;
                  return (
                    <div className="flex h-full flex-col rounded-2xl border border-[#EBE2CF] bg-[#FFFDF8] p-4">
                      <div className="flex items-start gap-3">
                        <DragHandle handleProps={dragHandleProps} />
                        <div className="flex flex-1 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputs.current[c.key]?.click()}
                            className={`${CIRCLE_RING} group shrink-0`}
                            title="Replace image"
                          >
                            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white">
                              {c.preview ? (
                                <img src={c.preview} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#C6A75E]">
                                  <ImagePlus className="h-6 w-6" />
                                </div>
                              )}
                              <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent pb-1 text-[9px] font-bold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
                                Replace
                              </span>
                            </div>
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A38A4F]">Circle {index + 1}</p>
                            <input
                              ref={(node) => {
                                fileInputs.current[c.key] = node;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => pickImage(c.key, event.target.files?.[0] ?? null)}
                            />
                            <Button size="xs" className="mt-1" onClick={() => fileInputs.current[c.key]?.click()} icon={<ImagePlus className="h-3.5 w-3.5" />}>
                              {c.preview ? "Replace image" : "Upload image"}
                            </Button>
                            {c.file ? <p className="mt-1 truncate text-[11px] text-[#8F8060]">{c.file.name}</p> : null}
                          </div>
                        </div>
                        <PlusMinusButton mode="remove" label={`Remove ${c.name || "category"}`} onClick={() => removeCategory(c.key)} size="sm" />
                      </div>

                      <div className="mt-4 space-y-3">
                        <Field label="Name">
                          <Input
                            value={c.name}
                            placeholder="e.g. T-Shirts"
                            maxLength={60}
                            onChange={(event) => updateCategory(c.key, { name: event.target.value })}
                          />
                        </Field>
                        <Field label="Links to">
                          <Select
                            value={selectValue}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === CUSTOM_LINK) {
                                updateCategory(c.key, { href: isKnownLink(c.href) || c.href === "" ? "/category/" : c.href });
                              } else {
                                updateCategory(c.key, { href: value });
                              }
                            }}
                          >
                            <option value="">Choose a page…</option>
                            {linkOptions.map((link) => (
                              <option key={link.href} value={link.href}>
                                {link.label}
                              </option>
                            ))}
                            <option value={CUSTOM_LINK}>Custom link…</option>
                          </Select>
                        </Field>
                        {selectValue === CUSTOM_LINK ? (
                          <Input
                            value={c.href}
                            placeholder="/category/your-slug or https://…"
                            onChange={(event) => updateCategory(c.key, { href: event.target.value })}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Card
            title={activeWhich === "featured" ? "On the homepage · Featured" : "On the homepage · Pre-Made"}
            description="Drag to change the order customers see. Press − to remove."
            actions={<Chip tone="gold">{selectedProducts.length} selected</Chip>}
          >
            {selectedProducts.length === 0 ? (
              <EmptyState
                compact
                icon={activeWhich === "featured" ? <Star className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                title="Nothing selected yet"
                description="Use the + buttons in the product library to add products here."
              />
            ) : (
              <SortableList
                items={selectedProducts}
                getKey={(p) => p.id}
                onReorder={(next) => setListFor(activeWhich)(next.map((p) => p.id))}
                renderItem={(p, { dragHandleProps }) => (
                  <div className="rounded-2xl border border-[#EBE2CF] bg-white p-3">
                    <div className="flex items-center gap-3">
                      <DragHandle handleProps={dragHandleProps} />
                      <img src={p.image_url} alt={p.name} className="h-14 w-14 shrink-0 rounded-xl border border-[#EFE6D3] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1F1A13]">{p.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#7A6640]">
                          <span>{formatMoney(p.price)}</span>
                          {p.is_premade_design ? <Chip tone="gold">Pre-made</Chip> : null}
                          <Link href={`/product/${encodeURIComponent(p.slug)}?product_mode=1`} className="font-semibold text-[#8A6D2B] underline-offset-2 hover:underline">
                            Edit
                          </Link>
                        </div>
                      </div>
                      <PlusMinusButton mode="remove" label={`Remove ${p.name}`} onClick={() => removeProduct(activeWhich, p.id)} />
                    </div>
                    {activeWhich === "premade" ? (
                      <div className="mt-3 rounded-xl border border-[#EFE6D3] bg-[#FFFBF1] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7A5C1E]">Card quote</p>
                          <span className="text-[10px] text-[#8F8060]">{(premadeQuotes[String(p.id)] || "").length}/220</span>
                        </div>
                        <textarea
                          value={premadeQuotes[String(p.id)] || ""}
                          maxLength={220}
                          placeholder="Short line shown under this design on the homepage…"
                          onChange={(event) =>
                            setPremadeQuotes((prev) => ({ ...prev, [String(p.id)]: event.target.value.slice(0, 220) }))
                          }
                          className={`${inputClass} mt-1.5 h-16 resize-none text-xs`}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              />
            )}
          </Card>

          <Card
            title={activeWhich === "featured" ? "Product library" : "Pre-made library"}
            description="Press + to add a product to the homepage."
            actions={
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A38A4F]" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" className="pl-9" />
              </div>
            }
          >
            {library.length === 0 ? (
              <EmptyState
                compact
                title={activeWhich === "premade" ? "No pre-made products yet" : "No products found"}
                description={
                  activeWhich === "premade"
                    ? "Mark a product as a pre-made design in Product Edit Mode and it will appear here."
                    : "Try a different search."
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {library.map((p) => {
                  const added = selectedIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-2xl border p-2.5 transition ${
                        added ? "border-[#BFE3C6] bg-[#F5FBF6]" : "border-[#EBE2CF] bg-white hover:border-[#C6A75E]"
                      }`}
                    >
                      <div className="relative">
                        <img src={p.image_url} alt={p.name} className="h-24 w-full rounded-xl object-cover" />
                        {p.is_premade_design ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-[#C6A75E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            Pre-made
                          </span>
                        ) : null}
                        <div className="absolute -bottom-2 -right-1">
                          <PlusMinusButton
                            mode={added ? "remove" : "add"}
                            label={added ? `Remove ${p.name}` : `Add ${p.name}`}
                            onClick={() => (added ? removeProduct(activeWhich, p.id) : addProduct(activeWhich, p.id))}
                          />
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs font-semibold leading-tight text-[#1F1A13]">{p.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-[#7A6640]">{formatMoney(p.price)}</p>
                        {added ? <Chip tone="success">Added</Chip> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={discard}
        label="Save homepage"
        note={[categoriesDirty ? "category circles" : null, productsDirty ? "homepage products" : null].filter(Boolean).join(" and ")}
      />
    </AdminPage>
  );
}
