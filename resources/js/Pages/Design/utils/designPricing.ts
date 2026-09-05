import type { PricePreviewSnapshot } from "../Canvas/Canvas";
import type { DesignType } from "@/Utils/designType";

type PreviewLike = {
  preview?: PricePreviewSnapshot;
};

export type DesignPricingCounts = {
  editedSides: number;
  text: number;
  image: number;
  clipart: number;
};

export type DesignPricingResult = {
  baseUnitPrice: number;
  designSurchargePerItem: number;
  unitPrice: number;
  counts: DesignPricingCounts;
};

export type DesignPricingTier = {
  text_price: number;
  clipart_price: number;
  image_price: number;
  per_side_price: number;
};

export type DesignPricingRules = {
  printing: DesignPricingTier;
};

const DEFAULT_PRICING_RULES: DesignPricingRules = {
  printing: {
    text_price: 0.75,
    clipart_price: 1.0,
    image_price: 1.5,
    per_side_price: 1.25,
  },
};

function parsePrice(price: number | string | undefined): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const parsed = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function computeCounts(previews: Array<PricePreviewSnapshot | undefined>): DesignPricingCounts {
  const counts: DesignPricingCounts = {
    editedSides: 0,
    text: 0,
    image: 0,
    clipart: 0,
  };

  previews.forEach(preview => {
    const layers = preview?.layers ?? [];
    if (layers.length > 0) counts.editedSides += 1;
    layers.forEach(layer => {
      if (layer.type === "text") counts.text += 1;
      if (layer.type === "image") counts.image += 1;
      if (layer.type === "clipart") counts.clipart += 1;
    });
  });

  return counts;
}

export function calculateDesignPricingFromPreviews(
  previews: Array<PricePreviewSnapshot | undefined>,
  basePrice: number | string | undefined,
  designType: DesignType | string | null | undefined = "printing",
  rules: DesignPricingRules | null | undefined = null
): DesignPricingResult {
  const counts = computeCounts(previews);
  const baseUnitPrice = parsePrice(basePrice);
  void designType;
  const mergedRules: DesignPricingRules = {
    printing: { ...DEFAULT_PRICING_RULES.printing, ...(rules?.printing ?? {}) },
  };
  const activeRules = mergedRules.printing;
  const designSurchargePerItem =
    counts.editedSides * activeRules.per_side_price +
    counts.text * activeRules.text_price +
    counts.image * activeRules.image_price +
    counts.clipart * activeRules.clipart_price;

  return {
    baseUnitPrice,
    designSurchargePerItem,
    unitPrice: baseUnitPrice + designSurchargePerItem,
    counts,
  };
}

export function calculateDesignPricingFromSides(
  sides: PreviewLike[],
  basePrice: number | string | undefined,
  designType: DesignType | string | null | undefined = "printing",
  rules: DesignPricingRules | null | undefined = null
): DesignPricingResult {
  return calculateDesignPricingFromPreviews(
    sides.map(side => side.preview),
    basePrice,
    designType,
    rules
  );
}
