import type { PricePreviewSnapshot } from "../Canvas/Canvas";
import { EMBROIDERY_SURCHARGE_MULTIPLIER, normalizeDesignType, type DesignType } from "@/Utils/designType";

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
  designType: DesignType | string | null | undefined = "printing"
): DesignPricingResult {
  const counts = computeCounts(previews);
  const baseUnitPrice = parsePrice(basePrice);
  const designSurchargePerItemBase =
    counts.editedSides * 1.25 +
    counts.text * 0.75 +
    counts.image * 1.5 +
    counts.clipart * 1.0;
  const multiplier = normalizeDesignType(designType) === "embroidery" ? EMBROIDERY_SURCHARGE_MULTIPLIER : 1;
  const designSurchargePerItem = designSurchargePerItemBase * multiplier;

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
  designType: DesignType | string | null | undefined = "printing"
): DesignPricingResult {
  return calculateDesignPricingFromPreviews(
    sides.map(side => side.preview),
    basePrice,
    designType
  );
}
