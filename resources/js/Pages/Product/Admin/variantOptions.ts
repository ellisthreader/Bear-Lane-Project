/*
 * Shared option lists for the admin product editor (colours, sizes, parcels).
 * Parcel presets and carriers are NOT hard-coded any more: they arrive from
 * Admin › Other › Delivery & Carriers as `parcelSettings` page props.
 */

export type ParcelOption = {
  key: string;
  carrier_key: string;
  label: string;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  price_label?: string;
  description?: string;
};

export type CarrierOption = {
  key: string;
  name: string;
  enabled: boolean;
  logo_url?: string | null;
};

export type ParcelSettings = {
  carriers: CarrierOption[];
  parcel_options: ParcelOption[];
};

export const MANUAL_PARCEL_KEY = "manual";

export type RestrictedBoxRatio = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type AdminVariantDraft = {
  id: string;
  size: string;
  stock: string;
  /** Parcel option key from delivery settings, or "manual". */
  parcelSize: string;
  manualWeightKg: string;
  manualLengthCm: string;
  manualWidthCm: string;
  manualDepthCm: string;
};

export type AdminColourDraft = {
  id: string;
  name: string;
  imageUrls: string[];
  imageBoxes: Record<string, RestrictedBoxRatio>;
  variants: AdminVariantDraft[];
};

export const SIZE_GROUPS = [
  { key: "adult", label: "Adult", options: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { key: "junior", label: "Junior", options: ["12-13 years", "13-14 years", "14-15 years"] },
  { key: "kids", label: "Kids", options: ["7-8 years", "8-9 years", "9-10 years", "10-11 years", "11-12 years"] },
  { key: "little", label: "Little kids", options: ["4-5 years", "5-6 years", "6-7 years"] },
  { key: "toddler", label: "Toddler", options: ["12-18 months", "18-24 months", "2-3 years (2T-3T)", "3-4 years (3T-4T)"] },
  {
    key: "baby",
    label: "Babies",
    options: ["Newborn (0-1 month)", "0-3 months", "3-6 months", "6-9 months", "9-12 months", "12-18 months", "18-24 months"],
  },
  { key: "other", label: "Other", options: ["One Size"] },
] as const;

export const COMMON_COLOURS: Array<{ name: string; hex: string }> = [
  { name: "Black", hex: "#1C1B1A" },
  { name: "White", hex: "#F7F5F0" },
  { name: "Grey", hex: "#9A9A98" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Blue", hex: "#3B74C4" },
  { name: "Red", hex: "#C8352B" },
  { name: "Green", hex: "#4E8A5B" },
  { name: "Yellow", hex: "#F2C94C" },
  { name: "Orange", hex: "#EE8B3A" },
  { name: "Purple", hex: "#7A4E9E" },
  { name: "Pink", hex: "#F4B6C6" },
  { name: "Lilac", hex: "#CBB6E6" },
  { name: "Brown", hex: "#7B4A2E" },
  { name: "Beige", hex: "#D9C7A6" },
  { name: "Cream", hex: "#FFF7DE" },
  { name: "Burgundy", hex: "#7A1F35" },
  { name: "Olive", hex: "#7C8144" },
  { name: "Khaki", hex: "#B8A776" },
  { name: "Teal", hex: "#2F8A88" },
  { name: "Peach", hex: "#FFD1B0" },
  { name: "Rust", hex: "#B7410E" },
];

export const colourHex = (name: string): string | null => {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const match = COMMON_COLOURS.find((colour) => colour.name.toLowerCase() === needle);
  return match ? match.hex : null;
};

export const isCommonColour = (name: string) => colourHex(name) !== null;

export const findParcelOption = (options: ParcelOption[], key: string | null | undefined) =>
  options.find((option) => option.key === String(key ?? "")) ?? null;

/**
 * Maps what is stored on a variant (parcel_courier + parcel_size_tier) back to a
 * parcel option key. Older rows stored tier names such as "small" next to the
 * courier, newer rows store the option key itself.
 */
export const resolveStoredParcelKey = (
  options: ParcelOption[],
  courier: string | null | undefined,
  tier: string | null | undefined
): string => {
  const courierKey = String(courier ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const tierKey = String(tier ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (courierKey === MANUAL_PARCEL_KEY || tierKey === MANUAL_PARCEL_KEY) return MANUAL_PARCEL_KEY;

  const candidates = [tierKey, `${courierKey}_${tierKey}`].filter(Boolean);
  for (const candidate of candidates) {
    const match = options.find((option) => option.key === candidate);
    if (match) return match.key;
  }

  const sameCarrier = options.find((option) => option.carrier_key === courierKey);
  if (sameCarrier) return sameCarrier.key;

  return options[0]?.key ?? MANUAL_PARCEL_KEY;
};

export const defaultParcelKey = (options: ParcelOption[]) =>
  options.find((option) => option.key === "evri_small")?.key ?? options[0]?.key ?? MANUAL_PARCEL_KEY;

export const newVariantDraft = (size: string, parcelKey: string, seed = Date.now()): AdminVariantDraft => ({
  id: `variant-${seed}-${Math.random().toString(36).slice(2, 7)}`,
  size: size.toUpperCase(),
  stock: "0",
  parcelSize: parcelKey,
  manualWeightKg: "",
  manualLengthCm: "",
  manualWidthCm: "",
  manualDepthCm: "",
});

export const newColourDraft = (parcelKey: string, seed = Date.now()): AdminColourDraft => ({
  id: `colour-${seed}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  imageUrls: [],
  imageBoxes: {},
  variants: [newVariantDraft("M", parcelKey, seed)],
});

export type VariantShippingMetrics = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  depthCm: number;
  manualValid: boolean;
  option: ParcelOption | null;
};

export const variantShippingMetrics = (variant: AdminVariantDraft, options: ParcelOption[]): VariantShippingMetrics => {
  if (variant.parcelSize !== MANUAL_PARCEL_KEY) {
    const option = findParcelOption(options, variant.parcelSize) ?? options[0] ?? null;
    if (option) {
      return {
        weightKg: option.max_weight_kg,
        lengthCm: option.length_cm,
        widthCm: option.width_cm,
        depthCm: option.height_cm,
        manualValid: true,
        option,
      };
    }
  }

  const weightKg = Number(variant.manualWeightKg);
  const lengthCm = Number(variant.manualLengthCm);
  const widthCm = Number(variant.manualWidthCm);
  const depthCm = Number(variant.manualDepthCm);
  const manualValid = [weightKg, lengthCm, widthCm, depthCm].every((value) => Number.isFinite(value) && value > 0);

  return { weightKg, lengthCm, widthCm, depthCm, manualValid, option: null };
};

export const variantShippingPayload = (variant: AdminVariantDraft, options: ParcelOption[]) => {
  const metrics = variantShippingMetrics(variant, options);
  if (!metrics.option) {
    return {
      weight: metrics.weightKg,
      parcel_courier: MANUAL_PARCEL_KEY,
      parcel_size_tier: MANUAL_PARCEL_KEY,
      parcel_length_cm: metrics.lengthCm,
      parcel_width_cm: metrics.widthCm,
      parcel_height_cm: metrics.depthCm,
    };
  }

  const option = metrics.option;
  const tier = option.key.startsWith(`${option.carrier_key}_`)
    ? option.key.slice(option.carrier_key.length + 1)
    : option.key;

  return {
    weight: metrics.weightKg,
    parcel_courier: option.carrier_key,
    parcel_size_tier: tier,
    parcel_length_cm: metrics.lengthCm,
    parcel_width_cm: metrics.widthCm,
    parcel_height_cm: metrics.depthCm,
  };
};
