export type DesignType = "printing";

export const DESIGN_TYPE_OPTIONS: Array<{ value: DesignType; label: string; helper: string }> = [
  {
    value: "printing",
    label: "Printing",
    helper: "Full-colour garment printing for text, artwork, and logos.",
  },
];

export const normalizeDesignType = (_value: unknown, _fallback: DesignType = "printing"): DesignType => "printing";

export const designTypeLabel = (_value: unknown): string => "Printing";
