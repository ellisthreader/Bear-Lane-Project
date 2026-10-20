import { GenderValue, ProductLike } from "./types";

export const formatLabel = (value: string): string =>
  value
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");

export const getNumericPrice = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export const getProductImage = (product: ProductLike): string => {
  const image = product.images?.[0];
  if (!image) return "/images/no-image.png";
  if (typeof image === "string") return image;
  return image.url || image.path || "/images/no-image.png";
};

export const getProductRating = (product: ProductLike, fallback = 0): number =>
  Number(product.average_rating ?? product.rating ?? fallback);

export const getProductReviewCount = (product: ProductLike): number => {
  const value = Number(product.review_count ?? product.reviews_count ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

export const inferGender = (
  product: ProductLike,
  fallbackSlug?: string
): GenderValue | null => {
  const parts = [
    product.slug,
    ...(product.categories || []).flatMap((category) => [
      category.slug || "",
      category.name || "",
      category.section || "",
    ]),
    fallbackSlug || "",
  ]
    .join(" ")
    .toLowerCase();

  if (parts.includes("women")) return "women";
  if (parts.includes("men")) return "men";
  if (parts.includes("kids")) return "kids";
  return null;
};
