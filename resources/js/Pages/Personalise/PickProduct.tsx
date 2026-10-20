import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, PenTool, Settings2, Sparkles, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";

type Colour = { name: string; image_url: string; hex?: string | null };

type CatalogueProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: number;
  description: string;
  image_url: string;
  colours: Colour[];
  sizes: string[];
  sizes_by_colour: Record<string, string[]>;
};

type CatalogueGroup = {
  key: string;
  label: string;
  description: string;
  product_ids: number[];
  products: CatalogueProduct[];
};

type PageProps = {
  auth?: { user?: { id?: number; is_admin?: boolean } };
  catalogue: { groups: CatalogueGroup[] };
};

const swatchStyle = (colour: Colour): React.CSSProperties => ({
  backgroundColor: colour.hex || "#E7DCC3",
});

const isLight = (hex?: string | null) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

export default function PickProduct() {
  const { props } = usePage<PageProps>();
  const Layout = props.auth?.user ? AuthenticatedLayout : GuestLayout;
  const isAdmin = Boolean(props.auth?.user?.is_admin);
  const reduceMotion = useReducedMotion();
  const groups = useMemo(() => (props.catalogue?.groups ?? []).filter((group) => group.products.length > 0), [props.catalogue]);

  const [activeKey, setActiveKey] = useState<string>(() => groups[0]?.key ?? "");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [colour, setColour] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!groups.some((group) => group.key === activeKey)) {
      setActiveKey(groups[0]?.key ?? "");
    }
  }, [groups, activeKey]);

  const activeGroup = groups.find((group) => group.key === activeKey) ?? groups[0] ?? null;
  const selected = useMemo(
    () => groups.flatMap((group) => group.products).find((product) => product.id === selectedId) ?? null,
    [groups, selectedId]
  );

  const sizesForSelection = useMemo(() => {
    if (!selected) return [];
    const byColour = colour ? selected.sizes_by_colour?.[colour] : undefined;
    const sizes = Array.isArray(byColour) && byColour.length > 0 ? byColour : selected.sizes;
    // "One Size" products don't need the customer to choose.
    if (sizes.length === 1 && /one size/i.test(sizes[0])) return [];
    return sizes;
  }, [selected, colour]);

  const previewImage = useMemo(() => {
    if (!selected) return "";
    const match = selected.colours.find((entry) => entry.name === colour);
    return match?.image_url || selected.image_url;
  }, [selected, colour]);

  const choose = (product: CatalogueProduct) => {
    setSelectedId(product.id);
    const firstColour = product.colours[0]?.name ?? "";
    setColour(firstColour);
    const sizes = product.sizes_by_colour?.[firstColour] ?? product.sizes;
    setSize(sizes.length === 1 ? sizes[0] : "");
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });
  };

  const clearSelection = () => {
    setSelectedId(null);
    setColour("");
    setSize("");
  };

  const needsSize = sizesForSelection.length > 0;
  const canContinue = Boolean(selected) && (!needsSize || size !== "");

  const continueToDesign = () => {
    if (!selected || !canContinue) return;
    const params = new URLSearchParams();
    if (colour) params.set("colour", colour);
    const finalSize = size || (selected.sizes.length === 1 ? selected.sizes[0] : "");
    if (finalSize) params.set("size", finalSize);
    const query = params.toString();
    router.get(`/design/${encodeURIComponent(selected.slug)}${query ? `?${query}` : ""}`);
  };

  const cardVariants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

  return (
    <Layout>
      <Head title="Pick your product" />

      <div className="bg-[#FAF7F0] text-[#1F1A13]">
        {/* Hero strip */}
        <section className="relative overflow-hidden border-b border-[#EFE4CC] bg-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F3E2B6]/50 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#FFF1D3]/70 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6D2B] transition hover:text-[#5E4A1A]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D3A5] bg-[#FFF7E4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A5C1E]">
                  Step 1 of 3
                </span>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Pick your product</h1>
                <p className="mt-3 text-sm text-[#6A5530] sm:text-base">
                  Choose what you would like to personalise, pick a colour and size, then jump straight into the design studio.
                </p>
              </div>
              {isAdmin ? (
                <Link
                  href="/admin/other/personalise"
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7B6530] transition hover:bg-[#F8E9C9]"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Manage
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E3D8BE] bg-white px-4 py-12 text-center text-sm text-[#6B5A34]">
              No personalisable products are available yet. Please check back soon.
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
                {/* Group tabs */}
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                  <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="tablist" aria-label="Product groups">
                    {groups.map((group) => {
                      const active = group.key === activeGroup?.key;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveKey(group.key)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-[#1F1A12] bg-[#1F1A12] text-white shadow-sm"
                              : "border-[#E3D6B8] bg-white text-[#5E4A1A] hover:border-[#C6A75E]"
                          }`}
                        >
                          {group.label}
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              active ? "bg-white/15 text-white" : "bg-[#F3EBDA] text-[#6B5A34]"
                            }`}
                          >
                            {group.products.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeGroup?.description ? (
                  <p className="mt-4 text-sm text-[#6A5530]">{activeGroup.description}</p>
                ) : null}

                {/* Product grid */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeGroup?.key ?? "empty"}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0 }}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } } }}
                    className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
                  >
                    {(activeGroup?.products ?? []).length === 0 ? (
                      <div className="col-span-full rounded-2xl border border-dashed border-[#E3D8BE] bg-white px-4 py-10 text-center text-sm text-[#6B5A34]">
                        No products in this group yet.
                        {isAdmin ? " Add some under Admin › Other › Personalise Products." : " Please check back soon."}
                      </div>
                    ) : null}
                    {(activeGroup?.products ?? []).map((product) => {
                      const active = product.id === selectedId;
                      return (
                        <motion.button
                          key={product.id}
                          type="button"
                          variants={cardVariants}
                          whileHover={reduceMotion ? undefined : { y: -4 }}
                          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                          onClick={() => choose(product)}
                          aria-pressed={active}
                          className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition-shadow ${
                            active
                              ? "border-[#C6A75E] shadow-[0_0_0_3px_rgba(198,167,94,0.28),0_18px_36px_rgba(93,70,20,0.16)]"
                              : "border-[#EBE2CF] shadow-sm hover:shadow-[0_16px_36px_rgba(93,70,20,0.14)]"
                          }`}
                        >
                          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#FAF7F0]">
                            <img
                              src={active ? previewImage || product.image_url : product.image_url}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {active ? (
                              <span className="absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1A12] text-white shadow">
                                <Check className="h-4 w-4" strokeWidth={2.6} />
                              </span>
                            ) : null}
                          </div>
                          <div className="p-3 sm:p-4">
                            <p className="text-sm font-semibold leading-tight text-[#1F1A13] sm:text-base">{product.name}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-[#7D5E1A]">From £{Number(product.price).toFixed(2)}</span>
                              {product.colours.length > 1 ? (
                                <span className="flex -space-x-1.5">
                                  {product.colours.slice(0, 5).map((entry) => (
                                    <span
                                      key={entry.name}
                                      title={entry.name}
                                      className="h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-[#E3D6B8]"
                                      style={swatchStyle(entry)}
                                    />
                                  ))}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Options panel: sticky on desktop, in-flow below the grid on mobile */}
              <div ref={panelRef} className="lg:sticky lg:top-24 lg:self-start">
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.aside
                      key={selected.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden rounded-3xl border border-[#E8DAB8] bg-white shadow-[0_24px_60px_rgba(63,47,17,0.14)]"
                      aria-label="Product options"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[#F0E6D2] px-5 pt-5 pb-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">Your choice</p>
                          <h2 className="mt-1 text-xl font-black text-[#271D0F]">{selected.name}</h2>
                          <p className="mt-0.5 text-sm text-[#6A5530]">From £{Number(selected.price).toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="rounded-full border border-[#E3D6B8] bg-white p-2 text-[#6B5A34] transition hover:bg-[#FFF9EA]"
                          aria-label="Clear selection"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="px-5 py-4">
                        <div className="mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-2xl bg-[#FAF7F0]">
                          <img src={previewImage} alt={`${selected.name}${colour ? ` in ${colour}` : ""}`} className="h-full w-full object-cover" />
                        </div>

                        {selected.colours.length > 0 ? (
                          <div className="mt-5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B5A34]">Colour</p>
                              <span className="text-sm font-semibold text-[#1F1A13]">{colour}</span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
                              {selected.colours.map((entry) => {
                                const active = entry.name === colour;
                                return (
                                  <button
                                    key={entry.name}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    title={entry.name}
                                    onClick={() => {
                                      setColour(entry.name);
                                      const sizes = selected.sizes_by_colour?.[entry.name] ?? selected.sizes;
                                      if (size && !sizes.includes(size)) setSize("");
                                    }}
                                    className={`relative h-10 w-10 rounded-full border-2 transition ${
                                      active ? "border-[#1F1A12] scale-105" : "border-transparent ring-1 ring-[#E3D6B8] hover:scale-105"
                                    }`}
                                    style={swatchStyle(entry)}
                                  >
                                    {active ? (
                                      <Check
                                        className={`absolute inset-0 m-auto h-4 w-4 ${isLight(entry.hex) ? "text-[#1F1A12]" : "text-white"}`}
                                        strokeWidth={3}
                                      />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {needsSize ? (
                          <div className="mt-5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B5A34]">Size</p>
                              {size ? <span className="text-sm font-semibold text-[#1F1A13]">{size}</span> : <span className="text-xs text-[#A38A4F]">Choose one</span>}
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                              {sizesForSelection.map((entry) => {
                                const active = entry === size;
                                return (
                                  <button
                                    key={entry}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setSize(entry)}
                                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                      active
                                        ? "border-[#1F1A12] bg-[#1F1A12] text-white"
                                        : "border-[#E3D6B8] bg-white text-[#4E3F1F] hover:border-[#C6A75E]"
                                    }`}
                                  >
                                    {entry}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={continueToDesign}
                          disabled={!canContinue}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C6A75E] px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(198,167,94,0.4)] transition hover:bg-[#B8964B] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
                        >
                          <PenTool className="h-4 w-4" />
                          Continue to design
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        {!canContinue && needsSize ? (
                          <p className="mt-2 text-center text-xs text-[#8F8060]">Pick a size to continue.</p>
                        ) : null}
                      </div>
                    </motion.aside>
                  ) : (
                    <motion.aside
                      key="placeholder"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hidden rounded-3xl border border-dashed border-[#E3D6B8] bg-white/70 p-6 text-center lg:block"
                    >
                      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6D3A5] bg-gradient-to-br from-[#FFF6DE] to-[#F3E2B6] text-[#7A5C12]">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <p className="mt-4 text-base font-bold text-[#2B2417]">Select a product</p>
                      <p className="mt-1 text-sm text-[#6A5530]">Choose a product on the left to pick a colour and size, then continue to the design studio.</p>
                    </motion.aside>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
