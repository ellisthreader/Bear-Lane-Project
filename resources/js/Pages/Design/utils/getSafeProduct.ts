import type { Product } from "../types/designTypes";

export function getSafeProduct(currentProduct: Product | null): Product {
  return (
    currentProduct ?? {
      id: 0,
      name: "Unknown",
      brand: "",
      slug: "",
      images: [],
      image_boxes: {},
      sizes: [],
      colourProducts: [],
      categories: [],
    }
  );
}
