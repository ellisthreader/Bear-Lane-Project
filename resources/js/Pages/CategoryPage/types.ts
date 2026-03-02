export type VariantLike = {
  colour?: string | null;
  color?: string | null;
  size?: string | null;
};

export type ProductCategoryLike = {
  name?: string | null;
  slug?: string | null;
  section?: string | null;
};

export type ProductLike = {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  price?: number | string | null;
  original_price?: number | string | null;
  rating?: number | null;
  average_rating?: number | null;
  review_count?: number | null;
  reviews_count?: number | null;
  popularity?: number | null;
  created_at?: string | null;
  images?: Array<string | { url?: string; path?: string }>;
  variants?: VariantLike[];
  categories?: ProductCategoryLike[];
};

export type CategoryPageProps = {
  heading?: string;
  category?: string;
  subcategory?: string;
  slug: string;
  category_id?: number;
  product_mode?: boolean;
  products: ProductLike[];
};

export type SortValue = "popular" | "new" | "price_desc" | "price_asc" | "rating" | "sale";
export type GenderValue = "men" | "women" | "kids";

export type BreadcrumbItem = {
  label: string;
  href: string;
  isLast: boolean;
};
