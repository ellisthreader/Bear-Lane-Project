import type { Product, ProductVariantOption } from "../types/designTypes";

export const buildVariantsByColour = (product: Product | null): Record<string, ProductVariantOption[]> => {
  const grouped: Record<string, ProductVariantOption[]> = {};
  if (!product) return grouped;

  (product.colourProducts ?? []).forEach(cp => {
    const colour = cp.colour;
    const sizes = cp.sizes ?? [];
    const images = cp.images ?? product.images ?? [];
    const imageBoxes = cp.image_boxes ?? product.image_boxes ?? {};
    if (!grouped[colour]) grouped[colour] = [];

    if (sizes.length) {
      sizes.forEach((size: unknown) =>
        grouped[colour].push({
          colour,
          size: typeof size === "string" ? size : undefined,
          images,
          imageBoxes,
        })
      );
      return;
    }

    grouped[colour].push({ colour, size: undefined, images, imageBoxes });
  });

  return grouped;
};

export const getPricePanelAvailableSizes = (
  selectedColour: string | null,
  uniqueColours: string[],
  variantsByColour: Record<string, ProductVariantOption[]>,
  fallbackProductSizes: string[] = []
): string[] => {
  const effectiveColour =
    selectedColour && variantsByColour[selectedColour]?.length
      ? selectedColour
      : uniqueColours[0];

  if (effectiveColour && variantsByColour[effectiveColour]?.length) {
    const sizesForColour = variantsByColour[effectiveColour]
      .map(v => v.size)
      .filter((size): size is string => typeof size === "string" && size.trim().length > 0);
    const deduped = Array.from(new Set(sizesForColour));
    if (deduped.length > 0) return deduped;
  }

  const fallbackSizes = fallbackProductSizes.filter(
    (size): size is string => typeof size === "string" && size.trim().length > 0
  );
  return Array.from(new Set(fallbackSizes));
};
