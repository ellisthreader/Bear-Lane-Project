// resources/js/types/Product.ts

export interface Product {
  id: number;
  slug: string;
  brand: string;
  name: string;
  price: number;
  original_price?: number | null;
  description: string;
  images: string[];
  colors?: string[];
  sizes?: string[];
  type: string; // "Shoes", "Hoodies", etc.
}
