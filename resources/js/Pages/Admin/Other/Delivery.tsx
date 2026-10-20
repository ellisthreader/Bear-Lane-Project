import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Check, ChevronDown, Plus, RefreshCw, Truck } from "lucide-react";
import {
  AdminPage,
  Button,
  Card,
  Chip,
  Input,
  Notice,
  PlusMinusButton,
  SaveBar,
  SectionLabel,
  Select,
  Toggle,
  adminFetch,
  toMoney,
} from "@/Components/Admin/ui";
import SortableList, { DragHandle } from "@/Components/Admin/SortableList";

/*
 * Delivery — deliberately the simplest admin screen in the console.
 *
 *   1. A price list: every delivery option on one row (on/off · name · price).
 *   2. A grid of carrier tiles pulled from Shippo: tick the ones you use.
 *   3. Parcel sizes hidden under "Advanced" for the rare time they need changing.
 */

type MethodKind = "standard" | "next_day" | "timed" | "collection";
type PriceMode = "fixed" | "live";

type Carrier = {
  key: string;
  name: string;
  enabled: boolean;
  match: string[];
  logo: string;
  logo_url?: string | null;
  notes: string;
};

type DeliveryMethod = {
  key: string;
  label: string;
  description: string;
  kind: MethodKind;
  enabled: boolean;
  price: number;
  price_mode: PriceMode;
  carrier_key: string;
  service_name: string;
  eta_min_days: number;
  eta_max_days: number;
  cutoff_hour: number;
  free_for_members: boolean;
  require_carrier_service: boolean;
  sort_order?: number;
  _id?: string;
};

type ParcelOption = {
  key: string;
  carrier_key: string;
  label: string;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  price_label: string;
  description: string;
  _id?: string;
};

type DeliverySettings = {
  carriers: Carrier[];
  methods: DeliveryMethod[];
  parcel_options: ParcelOption[];
};

type CatalogueCarrier = {
  key: string;
  name: string;
  match: string[];
  logo: string;
  logo_url?: string | null;
  connected: boolean;
};

type Props = {
  delivery: DeliverySettings;
  kinds: MethodKind[];
  priceModes: PriceMode[];
};

const KIND_LABELS: Record<MethodKind, string> = {
  standard: "Standard speed",
  next_day: "Next day",
  timed: "Choose a date",
  collection: "Collection (no post)",
};

let counter = 0;
const localId = () => `local-${Date.now()}-${counter++}`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const withIds = (settings: DeliverySettings): DeliverySettings => ({
  carriers: settings.carriers.map((carrier) => ({ ...carrier, match: [...(carrier.match ?? [])] })),
  methods: settings.methods.map((method) => ({ ...method, _id: method._id ?? localId() })),
  parcel_options: settings.parcel_options.map((option) => ({ ...option, _id: option._id ?? localId() })),
});

const serialize = (settings: DeliverySettings) =>
  JSON.stringify({
    carriers: settings.carriers.map(({ logo_url, ...rest }) => rest),
    methods: settings.methods.map(({ _id, sort_order, ...rest }) => rest),
    parcel_options: settings.parcel_options.map(({ _id, ...rest }) => rest),
  });

const defaultParcelSizes = (carrierKey: string): ParcelOption[] => [
  { key: `${carrierKey}_small`, carrier_key: carrierKey, label: "Small", max_weight_kg: 2, length_cm: 45, width_cm: 35, height_cm: 16, price_label: "", description: "", _id: localId() },
  { key: `${carrierKey}_medium`, carrier_key: carrierKey, label: "Medium", max_weight_kg: 5, length_cm: 60, width_cm: 50, height_cm: 50, price_label: "", description: "", _id: localId() },
  { key: `${carrierKey}_large`, carrier_key: carrierKey, label: "Large", max_weight_kg: 15, length_cm: 120, width_cm: 63, height_cm: 63, price_label: "", description: "", _id: localId() },
];

const newMethod = (): DeliveryMethod => ({
  key: "",
  label: "New delivery option",
  description: "",
  kind: "standard",
  enabled: true,
  price: 4.95,
  price_mode: "fixed",
  carrier_key: "",
  service_name: "",
  eta_min_days: 2,
  eta_max_days: 4,
  cutoff_hour: 22,
  free_for_members: true,
  require_carrier_service: false,
  _id: localId(),
});

export default function Delivery({ delivery, kinds }: Props) {
  const [settings, setSettings] = useState<DeliverySettings>(() => withIds(delivery));
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(withIds(delivery)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAdvanced, setOpenAdvanced] = useState<string | null>(null);
  const [showParcels, setShowParcels] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueCarrier[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [shippoConnected, setShippoConnected] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const dirty = useMemo(() => serialize(settings) !== savedSnapshot, [settings, savedSnapshot]);

  const loadCarriers = async () => {
    setCatalogueLoading(true);
    try {
      const data = await adminFetch<{ carriers: CatalogueCarrier[]; shippo_connected: boolean }>("/admin/other/delivery/carriers");
      setCatalogue(Array.isArray(data.carriers) ? data.carriers : []);
      setShippoConnected(Boolean(data.shippo_connected));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Unable to load carriers.");
    } finally {
      setCatalogueLoading(false);
    }
  };

  useEffect(() => {
    void loadCarriers();
  }, []);

  /* ---------------- delivery options ---------------- */

  const updateMethod = (id: string, patch: Partial<DeliveryMethod>) =>
    setSettings((prev) => ({ ...prev, methods: prev.methods.map((m) => (m._id === id ? { ...m, ...patch } : m)) }));

  const addMethod = () => {
    const method = newMethod();
    setSettings((prev) => ({ ...prev, methods: [...prev.methods, method] }));
    setOpenAdvanced(method._id ?? null);
  };

  const removeMethod = (id: string) => {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      return;
    }
    setConfirmRemove(null);
    setSettings((prev) => ({ ...prev, methods: prev.methods.filter((m) => m._id !== id) }));
  };

  /* ---------------- carriers ---------------- */

  const carrierEnabled = (key: string) => settings.carriers.some((c) => c.key === key && c.enabled);

  const toggleCarrier = (entry: CatalogueCarrier) => {
    setSettings((prev) => {
      const existing = prev.carriers.find((c) => c.key === entry.key);
      if (existing) {
        return { ...prev, carriers: prev.carriers.map((c) => (c.key === entry.key ? { ...c, enabled: !c.enabled } : c)) };
      }
      const hasSizes = prev.parcel_options.some((o) => o.carrier_key === entry.key);
      return {
        ...prev,
        carriers: [...prev.carriers, { key: entry.key, name: entry.name, enabled: true, match: entry.match ?? [entry.name.toLowerCase()], logo: entry.logo ?? "", logo_url: entry.logo_url, notes: "" }],
        parcel_options: hasSizes ? prev.parcel_options : [...prev.parcel_options, ...defaultParcelSizes(entry.key)],
      };
    });
  };

  // Carriers saved earlier that Shippo no longer lists still need a tile.
  const tiles = useMemo<CatalogueCarrier[]>(() => {
    const known = new Set(catalogue.map((c) => c.key));
    const extras = settings.carriers
      .filter((c) => !known.has(c.key))
      .map((c) => ({ key: c.key, name: c.name, match: c.match, logo: c.logo, logo_url: c.logo_url, connected: false }));
    return [...catalogue, ...extras];
  }, [catalogue, settings.carriers]);

  const enabledCarriers = settings.carriers.filter((c) => c.enabled);

  /* ---------------- parcel sizes ---------------- */

  const updateParcel = (id: string, patch: Partial<ParcelOption>) =>
    setSettings((prev) => ({ ...prev, parcel_options: prev.parcel_options.map((o) => (o._id === id ? { ...o, ...patch } : o)) }));

  const addParcel = (carrierKey: string) =>
    setSettings((prev) => ({
      ...prev,
      parcel_options: [
        ...prev.parcel_options,
        { key: "", carrier_key: carrierKey, label: "New size", max_weight_kg: 1, length_cm: 30, width_cm: 20, height_cm: 10, price_label: "", description: "", _id: localId() },
      ],
    }));

  const removeParcel = (id: string) => setSettings((prev) => ({ ...prev, parcel_options: prev.parcel_options.filter((o) => o._id !== id) }));

  /* ---------------- save ---------------- */

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await adminFetch<{ delivery: DeliverySettings; message?: string }>("/admin/other/delivery", {
        method: "PUT",
        body: {
          carriers: settings.carriers.map(({ logo_url, ...carrier }) => carrier),
          methods: settings.methods.map(({ _id, sort_order, ...method }) => method),
          parcel_options: settings.parcel_options.map(({ _id, ...option }) => option),
        },
      });
      const next = withIds(data.delivery);
      setSettings(next);
      setSavedSnapshot(serialize(next));
      toast.success(data.message || "Delivery settings saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save delivery settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    const reset = withIds(delivery);
    setSettings(reset);
    setSavedSnapshot(serialize(reset));
    setError(null);
  };

  return (
    <AdminPage
      eyebrow="Other / Delivery"
      title="Delivery"
      description="Set the price of each delivery option and tick the carriers you post with. That's it."
      backHref="/admin/other"
      backLabel="Back to Other"
    >
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* 1. Delivery options ------------------------------------------------ */}
      <Card
        title="1 · Delivery options & prices"
        description="What customers see at checkout. Switch an option off to hide it, change the price, drag to reorder."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={addMethod}>
            Add option
          </Button>
        }
      >
        <SortableList
          items={settings.methods}
          getKey={(m) => m._id ?? m.key}
          onReorder={(next) => setSettings((prev) => ({ ...prev, methods: next }))}
          renderItem={(method, { dragHandleProps }) => {
            const id = method._id ?? method.key;
            const advancedOpen = openAdvanced === id;
            return (
              <div className={`rounded-2xl border bg-white transition ${method.enabled ? "border-[#EBE2CF]" : "border-dashed border-[#E3D8BE] opacity-70"}`}>
                <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
                  <DragHandle handleProps={dragHandleProps} />
                  <Toggle checked={method.enabled} onChange={(next) => updateMethod(id, { enabled: next })} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Input
                      value={method.label}
                      onChange={(event) => updateMethod(id, { label: event.target.value })}
                      className="h-10 border-transparent bg-transparent px-2 text-base font-bold shadow-none hover:border-[#DCCFB4] focus:bg-white"
                      aria-label="Delivery option name"
                    />
                    <Input
                      value={method.description}
                      onChange={(event) => updateMethod(id, { description: event.target.value })}
                      placeholder="Short note, e.g. Delivered in 2–3 days"
                      className="h-8 border-transparent bg-transparent px-2 py-1 text-xs text-[#6B5A34] shadow-none hover:border-[#DCCFB4] focus:bg-white"
                      aria-label="Delivery option note"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {method.kind === "collection" ? <Chip>No post</Chip> : method.kind === "timed" ? <Chip>Date picker</Chip> : method.kind === "next_day" ? <Chip>Next day</Chip> : null}
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-[#8A6D2B]">£</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={method.price}
                        onChange={(event) => updateMethod(id, { price: toMoney(event.target.value, 0) })}
                        className="h-11 w-32 pl-7 text-lg font-bold"
                        aria-label={`${method.label} price`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenAdvanced(advancedOpen ? null : id)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#8A6D2B] hover:bg-[#F6EFDF]"
                      aria-expanded={advancedOpen}
                    >
                      More
                      <ChevronDown className={`h-3.5 w-3.5 transition ${advancedOpen ? "rotate-180" : ""}`} />
                    </button>
                    {confirmRemove === id ? (
                      <Button variant="danger" size="xs" onClick={() => removeMethod(id)} onBlur={() => setConfirmRemove(null)}>
                        Remove?
                      </Button>
                    ) : (
                      <PlusMinusButton mode="remove" size="sm" label={`Remove ${method.label}`} onClick={() => removeMethod(id)} disabled={settings.methods.length <= 1} />
                    )}
                  </div>
                </div>

                {advancedOpen ? (
                  <div className="grid gap-3 border-t border-[#F0E8D8] bg-[#FFFDF8] px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Type</span>
                      <Select value={method.kind} onChange={(event) => updateMethod(id, { kind: event.target.value as MethodKind })}>
                        {kinds.map((kind) => (
                          <option key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    {method.kind === "standard" || method.kind === "next_day" ? (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Arrives in (working days)</span>
                        <div className="flex items-center gap-2">
                          <Input type="number" min={0} max={60} value={method.eta_min_days} onChange={(event) => updateMethod(id, { eta_min_days: Math.max(0, Number(event.target.value) || 0) })} aria-label="From days" />
                          <span className="text-xs text-[#8F8060]">to</span>
                          <Input type="number" min={0} max={60} value={method.eta_max_days} onChange={(event) => updateMethod(id, { eta_max_days: Math.max(0, Number(event.target.value) || 0) })} aria-label="To days" />
                        </div>
                      </label>
                    ) : null}
                    {method.kind !== "collection" ? (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Carrier</span>
                        <Select value={method.carrier_key} onChange={(event) => updateMethod(id, { carrier_key: event.target.value })}>
                          <option value="">Any ticked carrier</option>
                          {enabledCarriers.map((carrier) => (
                            <option key={carrier.key} value={carrier.key}>
                              {carrier.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                    ) : null}
                    {method.kind === "next_day" ? (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Order before</span>
                        <Select value={method.cutoff_hour} onChange={(event) => updateMethod(id, { cutoff_hour: Number(event.target.value) })}>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <option key={hour} value={hour}>
                              {String(hour).padStart(2, "0")}:00
                            </option>
                          ))}
                        </Select>
                      </label>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
                      <Toggle size="sm" checked={method.free_for_members} onChange={(next) => updateMethod(id, { free_for_members: next })} label="Free for members" />
                      {method.kind !== "collection" && method.kind !== "timed" ? (
                        <Toggle
                          size="sm"
                          checked={method.price_mode === "live"}
                          onChange={(next) => updateMethod(id, { price_mode: next ? "live" : "fixed" })}
                          label="Charge the carrier's live rate instead of the price above"
                          description="Uses Shippo's quote for the address; falls back to your price if none is returned."
                        />
                      ) : null}
                      {method.kind === "next_day" ? (
                        <Toggle
                          size="sm"
                          checked={method.require_carrier_service}
                          onChange={(next) => updateMethod(id, { require_carrier_service: next })}
                          label="Only offer when a carrier confirms a next-day service"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
        <p className="mt-3 text-xs text-[#8F8060]">Members see "Free with membership" on any option marked free for members. Prices apply the moment you save.</p>
      </Card>

      {/* 2. Carriers ---------------------------------------------------------- */}
      <Card
        title="2 · Carriers you post with"
        description={
          shippoConnected
            ? "Pulled from your Shippo account. Tick a carrier to use it for labels and live rates."
            : "Tick the carriers you use. Connect a Shippo key to see the accounts linked to it."
        }
        actions={
          <Button variant="ghost" size="sm" icon={<RefreshCw className={`h-4 w-4 ${catalogueLoading ? "animate-spin" : ""}`} />} onClick={loadCarriers} disabled={catalogueLoading}>
            Refresh
          </Button>
        }
      >
        {catalogueLoading && tiles.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-[#F3EDDF]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((entry) => {
              const on = carrierEnabled(entry.key);
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => toggleCarrier(entry)}
                  aria-pressed={on}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
                    on ? "border-[#1F1A12] bg-[#FFF8E7] shadow-sm" : "border-[#EBE2CF] bg-white hover:border-[#C6A75E]"
                  }`}
                >
                  <span
                    className={`absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                      on ? "border-[#1F1A12] bg-[#1F1A12] text-white" : "border-[#DCCFB4] bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  {entry.logo_url ? (
                    <img src={entry.logo_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain" />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F6EFDF] text-sm font-black text-[#8A6D2B]">{initials(entry.name)}</span>
                  )}
                  <span className="text-sm font-bold text-[#1F1A13]">{entry.name}</span>
                  {entry.connected ? <Chip tone="success">Shippo</Chip> : null}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* 3. Parcel sizes (advanced) ------------------------------------------ */}
      <Card padding="sm">
        <button type="button" onClick={() => setShowParcels((v) => !v)} className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left" aria-expanded={showParcels}>
          <span>
            <span className="block text-base font-bold text-[#1F1A13]">Advanced · Parcel sizes</span>
            <span className="block text-sm text-[#6B5A34]">The parcel sizes you can pick when adding a product. Sensible defaults are set for every carrier.</span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-[#8A6D2B] transition ${showParcels ? "rotate-180" : ""}`} />
        </button>

        {showParcels ? (
          <div className="mt-4 space-y-5">
            {enabledCarriers.length === 0 ? <Notice>Tick a carrier above first.</Notice> : null}
            {enabledCarriers.map((carrier) => {
              const options = settings.parcel_options.filter((o) => o.carrier_key === carrier.key);
              return (
                <div key={carrier.key}>
                  <div className="mb-2 flex items-center justify-between">
                    <SectionLabel>{carrier.name}</SectionLabel>
                    <Button size="xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addParcel(carrier.key)}>
                      Add size
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[#EBE2CF]">
                    <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1.2fr_40px] gap-2 bg-[#FAF6EC] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7A6742] sm:grid">
                      <span>Name</span>
                      <span>Max kg</span>
                      <span>Length cm</span>
                      <span>Width cm</span>
                      <span>Height cm</span>
                      <span>Price note</span>
                      <span />
                    </div>
                    {options.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-[#8F8060]">No sizes yet.</p>
                    ) : (
                      options.map((option) => (
                        <div key={option._id} className="grid grid-cols-2 gap-2 border-t border-[#F0E8D8] px-3 py-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1.2fr_40px] sm:items-center">
                          <Input value={option.label} onChange={(event) => updateParcel(option._id!, { label: event.target.value })} className="h-9 py-1.5" aria-label="Size name" />
                          <Input type="number" min={0.01} step={0.01} value={option.max_weight_kg} onChange={(event) => updateParcel(option._id!, { max_weight_kg: Number(event.target.value) || 0 })} className="h-9 py-1.5" aria-label="Max kg" />
                          <Input type="number" min={0.1} step={0.1} value={option.length_cm} onChange={(event) => updateParcel(option._id!, { length_cm: Number(event.target.value) || 0 })} className="h-9 py-1.5" aria-label="Length cm" />
                          <Input type="number" min={0.1} step={0.1} value={option.width_cm} onChange={(event) => updateParcel(option._id!, { width_cm: Number(event.target.value) || 0 })} className="h-9 py-1.5" aria-label="Width cm" />
                          <Input type="number" min={0.1} step={0.1} value={option.height_cm} onChange={(event) => updateParcel(option._id!, { height_cm: Number(event.target.value) || 0 })} className="h-9 py-1.5" aria-label="Height cm" />
                          <Input value={option.price_label} onChange={(event) => updateParcel(option._id!, { price_label: event.target.value })} placeholder="e.g. £2.62" className="h-9 py-1.5" aria-label="Price note" />
                          <div className="flex justify-end">
                            <PlusMinusButton mode="remove" size="sm" label={`Remove ${option.label}`} onClick={() => removeParcel(option._id!)} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

      <div className="flex items-center gap-2 text-xs text-[#8F8060]">
        <Truck className="h-4 w-4" />
        Checkout shows the options above in this order. Live carrier rates and labels only use ticked carriers.
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} label="Save delivery" note="Prices update at checkout immediately." />
    </AdminPage>
  );
}
