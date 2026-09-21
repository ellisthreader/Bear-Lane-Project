import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Images, Layers, Package, Palette, Plus, Ruler, Trash2, Upload, X } from "lucide-react";
import { Button, Chip, IconButton, Input, PlusMinusButton, Select, Stepper } from "@/Components/Admin/ui";
import {
  COMMON_COLOURS,
  MANUAL_PARCEL_KEY,
  SIZE_GROUPS,
  colourHex,
  defaultParcelKey,
  findParcelOption,
  newColourDraft,
  newVariantDraft,
  type AdminColourDraft,
  type AdminVariantDraft,
  type CarrierOption,
  type ParcelOption,
  type RestrictedBoxRatio,
} from "./variantOptions";

/*
 * Variant Studio — the admin editor for a product's colours, sizes, quantities
 * and parcel options. Designed from scratch around three ideas:
 *   1. one colour at a time (left rail), so the screen never gets crowded;
 *   2. every list is "+ add / − remove" with no forms to open;
 *   3. parcel presets come from Delivery & Carriers, chosen with a click and
 *      applied to one size or all sizes at once.
 */

type ErrorMap = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;
  colours: AdminColourDraft[];
  onChange: (updater: (prev: AdminColourDraft[]) => AdminColourDraft[]) => void;
  parcelOptions: ParcelOption[];
  carriers: CarrierOption[];
  isPremade: boolean;
  errors: ErrorMap;
  onUploadImages: (colourId: string) => void;
  uploading: boolean;
  onRemoveImage: (colourId: string, imageUrl: string) => void;
  onEditRestrictedBox: (colourId: string, imageUrl: string) => void;
  isValidRestrictedBox: (box: RestrictedBoxRatio | undefined) => boolean;
  onOpenDeliverySettings?: () => void;
};

const panelClass = "rounded-2xl border border-[#EBE2CF] bg-white p-4 sm:p-5";

const normalizeSize = (value: string) => value.trim().toUpperCase();

export default function VariantStudio({
  open,
  onClose,
  colours,
  onChange,
  parcelOptions,
  carriers,
  isPremade,
  errors,
  onUploadImages,
  uploading,
  onRemoveImage,
  onEditRestrictedBox,
  isValidRestrictedBox,
  onOpenDeliverySettings,
}: Props) {
  const [activeColourId, setActiveColourId] = useState<string | null>(colours[0]?.id ?? null);
  const [customSize, setCustomSize] = useState("");
  const [customColour, setCustomColour] = useState("");
  const [confirmRemoveColour, setConfirmRemoveColour] = useState<string | null>(null);
  const [parcelCarrierTab, setParcelCarrierTab] = useState<string>(carriers[0]?.key ?? "");

  useEffect(() => {
    if (!colours.some((colour) => colour.id === activeColourId)) {
      setActiveColourId(colours[0]?.id ?? null);
    }
  }, [colours, activeColourId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const enabledCarriers = useMemo(() => carriers.filter((carrier) => carrier.enabled), [carriers]);
  const optionsByCarrier = useMemo(() => {
    const map = new Map<string, ParcelOption[]>();
    parcelOptions.forEach((option) => {
      const list = map.get(option.carrier_key) ?? [];
      list.push(option);
      map.set(option.carrier_key, list);
    });
    return map;
  }, [parcelOptions]);

  useEffect(() => {
    if (!enabledCarriers.some((carrier) => carrier.key === parcelCarrierTab)) {
      setParcelCarrierTab(enabledCarriers[0]?.key ?? "");
    }
  }, [enabledCarriers, parcelCarrierTab]);

  const activeColour = colours.find((colour) => colour.id === activeColourId) ?? null;
  const activeIndex = activeColour ? colours.findIndex((colour) => colour.id === activeColour.id) : -1;
  const fallbackParcel = defaultParcelKey(parcelOptions);

  const updateColour = (colourId: string, updater: (colour: AdminColourDraft) => AdminColourDraft) =>
    onChange((prev) => prev.map((colour) => (colour.id === colourId ? updater(colour) : colour)));

  const updateVariant = (colourId: string, variantId: string, updater: (variant: AdminVariantDraft) => AdminVariantDraft) =>
    updateColour(colourId, (colour) => ({
      ...colour,
      variants: colour.variants.map((variant) => (variant.id === variantId ? updater(variant) : variant)),
    }));

  const addColour = () => {
    const draft = newColourDraft(fallbackParcel);
    onChange((prev) => [...prev, draft]);
    setActiveColourId(draft.id);
    setCustomColour("");
  };

  const removeColour = (colourId: string) => {
    if (colours.length <= 1) return;
    if (confirmRemoveColour !== colourId) {
      setConfirmRemoveColour(colourId);
      return;
    }
    setConfirmRemoveColour(null);
    onChange((prev) => prev.filter((colour) => colour.id !== colourId));
  };

  const addSize = (colourId: string, size: string) => {
    const normalized = normalizeSize(size);
    if (!normalized) return;
    updateColour(colourId, (colour) => {
      if (colour.variants.some((variant) => normalizeSize(variant.size) === normalized)) return colour;
      const parcel = colour.variants[colour.variants.length - 1]?.parcelSize ?? fallbackParcel;
      return { ...colour, variants: [...colour.variants, newVariantDraft(normalized, parcel)] };
    });
  };

  const removeSize = (colourId: string, variantId: string) =>
    updateColour(colourId, (colour) => ({
      ...colour,
      variants: colour.variants.filter((variant) => variant.id !== variantId),
    }));

  const applyParcelToAll = (colourId: string, parcelKey: string) =>
    updateColour(colourId, (colour) => ({
      ...colour,
      variants: colour.variants.map((variant) => ({ ...variant, parcelSize: parcelKey })),
    }));

  const colourLabel = (colour: AdminColourDraft, index: number) => colour.name.trim() || `Colour ${index + 1}`;

  const totalSizes = colours.reduce((sum, colour) => sum + colour.variants.length, 0);
  const totalImages = colours.reduce((sum, colour) => sum + colour.imageUrls.filter(Boolean).length, 0);
  const totalStock = colours.reduce(
    (sum, colour) => sum + colour.variants.reduce((inner, variant) => inner + Math.max(0, Math.floor(Number(variant.stock) || 0)), 0),
    0
  );

  const colourErrors = (colourId: string) =>
    Object.entries(errors).filter(([key]) => key.startsWith(`colour.${colourId}.`)).map(([, message]) => message);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[125] flex items-stretch justify-center bg-[#1F1A13]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Colours, sizes and parcels">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#FAF7F0] shadow-[0_40px_90px_rgba(31,26,19,0.45)] sm:h-[min(92vh,900px)] sm:rounded-3xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-[#EBE2CF] bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A38A4F]">Product editor</p>
            <h2 className="mt-0.5 text-lg font-black text-[#1F1A13] sm:text-xl">Colours, sizes & parcels</h2>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-[#6B5A34] md:flex">
            <Chip><Palette className="h-3 w-3" /> {colours.length} colour{colours.length === 1 ? "" : "s"}</Chip>
            <Chip><Ruler className="h-3 w-3" /> {totalSizes} size{totalSizes === 1 ? "" : "s"}</Chip>
            <Chip><Images className="h-3 w-3" /> {totalImages} picture{totalImages === 1 ? "" : "s"}</Chip>
            <Chip><Layers className="h-3 w-3" /> {totalStock} in stock</Chip>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Colour rail */}
          <aside className="border-b border-[#EBE2CF] bg-white md:w-64 md:shrink-0 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between px-4 pt-4 md:px-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">Colours</p>
              <PlusMinusButton mode="add" label="Add colour" onClick={addColour} size="sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-3 md:flex-col md:overflow-visible md:px-3">
              {colours.map((colour, index) => {
                const active = colour.id === activeColourId;
                const hex = colourHex(colour.name);
                const issues = colourErrors(colour.id).length;
                return (
                  <button
                    key={colour.id}
                    type="button"
                    onClick={() => {
                      setActiveColourId(colour.id);
                      setConfirmRemoveColour(null);
                    }}
                    className={`group flex min-w-[200px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition md:min-w-0 ${
                      active
                        ? "border-[#1F1A12] bg-[#1F1A12] text-white shadow-md"
                        : "border-[#EBE2CF] bg-white text-[#1F1A13] hover:border-[#C6A75E]"
                    }`}
                  >
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10"
                      style={{ backgroundColor: hex ?? (active ? "#3A3021" : "#F1EADB") }}
                      aria-hidden="true"
                    >
                      {!hex ? <Palette className={`h-3.5 w-3.5 ${active ? "text-white/70" : "text-[#9A8C6A]"}`} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{colourLabel(colour, index)}</span>
                      <span className={`block text-[11px] ${active ? "text-white/70" : "text-[#8F8060]"}`}>
                        {colour.variants.length} size{colour.variants.length === 1 ? "" : "s"} · {colour.imageUrls.filter(Boolean).length} pic
                        {colour.imageUrls.filter(Boolean).length === 1 ? "" : "s"}
                      </span>
                    </span>
                    {issues > 0 ? (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B42318] px-1.5 text-[10px] font-bold text-white" title={`${issues} issue(s)`}>
                        {issues}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {errors.colours ? <p className="px-5 pb-4 text-xs font-medium text-[#A63D2F]">{errors.colours}</p> : null}
          </aside>

          {/* Editor */}
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {!activeColour ? (
              <div className="flex h-full items-center justify-center">
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={addColour}>
                  Add your first colour
                </Button>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {colourErrors(activeColour.id).length > 0 ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[#F0CFC8] bg-[#FFF5F3] px-3.5 py-3 text-sm text-[#A63D2F]" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <ul className="space-y-0.5">
                      {colourErrors(activeColour.id).map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* 1. Colour name */}
                <section className={panelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">1 · Colour</p>
                      <h3 className="mt-0.5 text-base font-bold text-[#1F1A13]">{colourLabel(activeColour, activeIndex)}</h3>
                    </div>
                    {colours.length > 1 ? (
                      <Button
                        variant={confirmRemoveColour === activeColour.id ? "danger" : "dangerGhost"}
                        size="xs"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => removeColour(activeColour.id)}
                        onBlur={() => setConfirmRemoveColour(null)}
                      >
                        {confirmRemoveColour === activeColour.id ? "Confirm remove" : "Remove colour"}
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {COMMON_COLOURS.map((colour) => {
                      const selected = activeColour.name.trim().toLowerCase() === colour.name.toLowerCase();
                      return (
                        <button
                          key={colour.name}
                          type="button"
                          onClick={() => {
                            updateColour(activeColour.id, (item) => ({ ...item, name: colour.name }));
                            setCustomColour("");
                          }}
                          className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition ${
                            selected ? "border-[#1F1A12] bg-[#1F1A12] text-white" : "border-[#E7DCC3] bg-white text-[#4E3F1F] hover:border-[#C6A75E]"
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="inline-block h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: colour.hex }} />
                          {colour.name}
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={colourHex(activeColour.name) ? customColour : activeColour.name}
                      onChange={(event) => {
                        setCustomColour(event.target.value);
                        updateColour(activeColour.id, (item) => ({ ...item, name: event.target.value }));
                      }}
                      placeholder="Or type a custom colour name, e.g. Sage"
                      className="sm:max-w-sm"
                    />
                    {errors[`colour.${activeColour.id}.name`] ? (
                      <p className="text-xs font-medium text-[#A63D2F] sm:self-center">{errors[`colour.${activeColour.id}.name`]}</p>
                    ) : null}
                  </div>
                </section>

                {/* 2. Pictures */}
                <section className={panelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">2 · Pictures</p>
                      <h3 className="mt-0.5 text-base font-bold text-[#1F1A13]">
                        {activeColour.imageUrls.filter(Boolean).length} uploaded
                        {!isPremade ? (
                          <span className="ml-2 text-xs font-semibold text-[#8F8060]">
                            · {activeColour.imageUrls.filter((url) => isValidRestrictedBox(activeColour.imageBoxes[url])).length} with print area
                          </span>
                        ) : null}
                      </h3>
                    </div>
                    <Button variant="gold" size="sm" icon={<Upload className="h-4 w-4" />} loading={uploading} onClick={() => onUploadImages(activeColour.id)}>
                      Upload pictures
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {activeColour.imageUrls
                      .map((url) => url.trim())
                      .filter(Boolean)
                      .map((url, index) => {
                        const hasBox = isValidRestrictedBox(activeColour.imageBoxes[url]);
                        return (
                          <div key={`${url}-${index}`} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-[#EBE2CF] bg-[#F4EFE2]">
                            <img src={url} alt={`${colourLabel(activeColour, activeIndex)} ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                            <button
                              type="button"
                              onClick={() => onRemoveImage(activeColour.id, url)}
                              className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#A63D2F] shadow transition hover:bg-white"
                              aria-label={`Remove picture ${index + 1}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {!isPremade ? (
                              <button
                                type="button"
                                onClick={() => onEditRestrictedBox(activeColour.id, url)}
                                className={`absolute inset-x-1.5 bottom-1.5 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white transition ${
                                  hasBox ? "bg-[#16A34A]/95 hover:bg-[#15803D]" : "bg-[#B45309]/95 hover:bg-[#92400E]"
                                }`}
                              >
                                {hasBox ? <Check className="h-3 w-3" /> : null}
                                {hasBox ? "Print area set" : "Set print area"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    <button
                      type="button"
                      onClick={() => onUploadImages(activeColour.id)}
                      className="flex aspect-[4/5] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#DFD3B7] bg-[#FFFDF8] text-[#8A6D2B] transition hover:border-[#C6A75E] hover:bg-[#FFF8E7]"
                    >
                      <Plus className="h-6 w-6" />
                      <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]">Add</span>
                    </button>
                  </div>
                  {errors[`colour.${activeColour.id}.images`] || errors[`colour.${activeColour.id}.image_boxes`] ? (
                    <p className="mt-2 text-xs font-medium text-[#A63D2F]">
                      {errors[`colour.${activeColour.id}.images`] || errors[`colour.${activeColour.id}.image_boxes`]}
                    </p>
                  ) : null}
                  {!isPremade ? (
                    <p className="mt-2 text-xs text-[#8F8060]">The print area is where customers can place their design on each picture.</p>
                  ) : null}
                </section>

                {/* 3. Sizes & quantities */}
                <section className={panelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">3 · Sizes & quantities</p>
                      <h3 className="mt-0.5 text-base font-bold text-[#1F1A13]">Tap a size to add it</h3>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {SIZE_GROUPS.map((group) => (
                      <div key={group.key} className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A8C6A]">{group.label}</span>
                        {group.options.map((size) => {
                          const exists = activeColour.variants.some((variant) => normalizeSize(variant.size) === normalizeSize(size));
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => (exists ? undefined : addSize(activeColour.id, size))}
                              disabled={exists}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                                exists
                                  ? "cursor-default border-[#1F1A12] bg-[#1F1A12] text-white"
                                  : "border-[#E7DCC3] bg-white text-[#4E3F1F] hover:border-[#C6A75E] hover:bg-[#FFF8E7]"
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    <form
                      className="flex items-center gap-2 pt-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addSize(activeColour.id, customSize);
                        setCustomSize("");
                      }}
                    >
                      <Input value={customSize} onChange={(event) => setCustomSize(event.target.value)} placeholder="Custom size, e.g. 4XL" className="max-w-[220px]" />
                      <Button type="submit" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!customSize.trim()}>
                        Add size
                      </Button>
                    </form>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-[#EBE2CF]">
                    <div className="hidden grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1.6fr)_44px] gap-3 bg-[#FAF6EC] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7A6742] sm:grid">
                      <span>Size</span>
                      <span>Quantity</span>
                      <span>Parcel</span>
                      <span />
                    </div>
                    {activeColour.variants.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-[#8F8060]">No sizes yet. Tap a size above to add one.</p>
                    ) : (
                      <ul className="divide-y divide-[#F0E8D8]">
                        {activeColour.variants.map((variant, index) => {
                          const option = findParcelOption(parcelOptions, variant.parcelSize);
                          const stock = Math.max(0, Math.floor(Number(variant.stock) || 0));
                          const sizeError = errors[`colour.${activeColour.id}.variant.${variant.id}.size`];
                          const stockError = errors[`colour.${activeColour.id}.variant.${variant.id}.stock`];
                          const parcelError = errors[`colour.${activeColour.id}.variant.${variant.id}.parcel`];
                          return (
                            <li key={variant.id} className="bg-white px-3 py-2.5">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1.6fr)_44px] sm:items-center sm:gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F6EFDF] text-[11px] font-bold text-[#6B5A34]">{index + 1}</span>
                                  <Input
                                    value={variant.size}
                                    onChange={(event) => updateVariant(activeColour.id, variant.id, (row) => ({ ...row, size: event.target.value.toUpperCase() }))}
                                    className="h-10 py-1.5 font-semibold"
                                    aria-label="Size"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A8C6A] sm:hidden">Qty</span>
                                  <Stepper
                                    value={stock}
                                    min={0}
                                    max={100000}
                                    label="quantity"
                                    onChange={(next) => updateVariant(activeColour.id, variant.id, (row) => ({ ...row, stock: String(next) }))}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={variant.parcelSize}
                                    onChange={(event) => updateVariant(activeColour.id, variant.id, (row) => ({ ...row, parcelSize: event.target.value }))}
                                    className="h-10 py-1.5"
                                    aria-label="Parcel option"
                                  >
                                    {enabledCarriers.map((carrier) => {
                                      const options = optionsByCarrier.get(carrier.key) ?? [];
                                      if (options.length === 0) return null;
                                      return (
                                        <optgroup key={carrier.key} label={carrier.name}>
                                          {options.map((item) => (
                                            <option key={item.key} value={item.key}>
                                              {carrier.name} · {item.label}
                                              {item.price_label ? ` · ${item.price_label}` : ""}
                                            </option>
                                          ))}
                                        </optgroup>
                                      );
                                    })}
                                    <option value={MANUAL_PARCEL_KEY}>Manual (enter weight & size)</option>
                                  </Select>
                                </div>
                                <div className="flex justify-end">
                                  <PlusMinusButton mode="remove" label={`Remove size ${variant.size}`} onClick={() => removeSize(activeColour.id, variant.id)} size="sm" />
                                </div>
                              </div>
                              {variant.parcelSize === MANUAL_PARCEL_KEY ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {(
                                    [
                                      ["manualWeightKg", "Weight (kg)"],
                                      ["manualLengthCm", "Length (cm)"],
                                      ["manualWidthCm", "Width (cm)"],
                                      ["manualDepthCm", "Depth (cm)"],
                                    ] as const
                                  ).map(([field, label]) => (
                                    <Input
                                      key={field}
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={variant[field]}
                                      onChange={(event) => updateVariant(activeColour.id, variant.id, (row) => ({ ...row, [field]: event.target.value }))}
                                      placeholder={label}
                                      className="h-10 py-1.5"
                                      aria-label={label}
                                    />
                                  ))}
                                </div>
                              ) : option ? (
                                <p className="mt-1.5 pl-9 text-[11px] text-[#8F8060]">
                                  Up to {option.max_weight_kg}kg · {option.length_cm} × {option.width_cm} × {option.height_cm} cm
                                  {option.description ? ` · ${option.description}` : ""}
                                </p>
                              ) : null}
                              {sizeError || stockError || parcelError ? (
                                <p className="mt-1.5 pl-9 text-xs font-medium text-[#A63D2F]">{sizeError || stockError || parcelError}</p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {errors[`colour.${activeColour.id}.variants`] ? (
                    <p className="mt-2 text-xs font-medium text-[#A63D2F]">{errors[`colour.${activeColour.id}.variants`]}</p>
                  ) : null}
                </section>

                {/* 4. Parcel options */}
                <section className={panelClass}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">4 · Parcel option</p>
                      <h3 className="mt-0.5 text-base font-bold text-[#1F1A13]">Pick a parcel to apply to every size</h3>
                      <p className="mt-1 text-xs text-[#8F8060]">Each size keeps its own choice above; this is the quick way to set them all at once.</p>
                    </div>
                    {onOpenDeliverySettings ? (
                      <Button variant="ghost" size="xs" icon={<Package className="h-3.5 w-3.5" />} onClick={onOpenDeliverySettings}>
                        Manage parcel options
                      </Button>
                    ) : null}
                  </div>

                  {enabledCarriers.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed border-[#DFD3B7] bg-[#FFFDF8] px-3 py-4 text-sm text-[#7A6640]">
                      No carriers are enabled. Enable one in Delivery & Carriers, or use Manual on each size.
                    </p>
                  ) : (
                    <>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {enabledCarriers.map((carrier) => (
                          <button
                            key={carrier.key}
                            type="button"
                            onClick={() => setParcelCarrierTab(carrier.key)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                              parcelCarrierTab === carrier.key ? "border-[#1F1A12] bg-[#1F1A12] text-white" : "border-[#E7DCC3] bg-white text-[#4E3F1F] hover:border-[#C6A75E]"
                            }`}
                          >
                            {carrier.logo_url ? <img src={carrier.logo_url} alt="" className="h-4 w-4 rounded-sm bg-white object-contain" /> : null}
                            {carrier.name}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(optionsByCarrier.get(parcelCarrierTab) ?? []).map((option) => {
                          const usedByAll = activeColour.variants.length > 0 && activeColour.variants.every((variant) => variant.parcelSize === option.key);
                          const usedBySome = activeColour.variants.some((variant) => variant.parcelSize === option.key);
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => applyParcelToAll(activeColour.id, option.key)}
                              className={`rounded-xl border p-3 text-left transition ${
                                usedByAll
                                  ? "border-[#1F1A12] bg-[#FFF8E7] shadow-sm"
                                  : usedBySome
                                    ? "border-[#C6A75E] bg-white"
                                    : "border-[#EBE2CF] bg-white hover:border-[#C6A75E]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-[#1F1A13]">{option.label}</p>
                                {usedByAll ? <Check className="h-4 w-4 text-[#1F1A12]" /> : null}
                              </div>
                              <p className="mt-1 text-[11px] text-[#6B5A34]">Up to {option.max_weight_kg}kg</p>
                              <p className="text-[11px] text-[#6B5A34]">
                                {option.length_cm} × {option.width_cm} × {option.height_cm} cm
                              </p>
                              {option.price_label ? <p className="mt-1 text-[11px] font-semibold text-[#8A6D2B]">{option.price_label}</p> : null}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => applyParcelToAll(activeColour.id, MANUAL_PARCEL_KEY)}
                          className={`rounded-xl border border-dashed p-3 text-left transition ${
                            activeColour.variants.length > 0 && activeColour.variants.every((variant) => variant.parcelSize === MANUAL_PARCEL_KEY)
                              ? "border-[#1F1A12] bg-[#FFF8E7]"
                              : "border-[#DFD3B7] bg-[#FFFDF8] hover:border-[#C6A75E]"
                          }`}
                        >
                          <p className="text-sm font-bold text-[#1F1A13]">Manual</p>
                          <p className="mt-1 text-[11px] text-[#6B5A34]">Enter weight and dimensions per size.</p>
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-[#EBE2CF] bg-white px-5 py-3 sm:px-6">
          <p className="text-xs text-[#8F8060]">
            {colours.length} colour{colours.length === 1 ? "" : "s"} · {totalSizes} size{totalSizes === 1 ? "" : "s"} · {totalImages} picture{totalImages === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addColour}>
              Add colour
            </Button>
            <Button variant="primary" size="md" icon={<Check className="h-4 w-4" />} onClick={onClose}>
              Done
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
