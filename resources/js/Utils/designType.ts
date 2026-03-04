export type DesignType = "printing" | "embroidery";

export const EMBROIDERY_SURCHARGE_MULTIPLIER = 1.5;

export const DESIGN_TYPE_OPTIONS: Array<{ value: DesignType; label: string; helper: string }> = [
  {
    value: "printing",
    label: "Printing",
    helper: "Best value for full-colour designs.",
  },
  {
    value: "embroidery",
    label: "Embroidery",
    helper: "Premium stitched finish. Design extras are priced at 1.5x.",
  },
];

export const normalizeDesignType = (value: unknown, fallback: DesignType = "printing"): DesignType => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "embroidery" ? "embroidery" : fallback;
};

export const designTypeLabel = (value: unknown): string =>
  normalizeDesignType(value) === "embroidery" ? "Embroidery" : "Printing";
