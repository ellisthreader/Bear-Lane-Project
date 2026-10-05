export type QuoteSource = {
  productName: string;
  productSlug: string;
  colour: string;
  size: string;
  sizeCategory: string;
  basePrice: number;
  previewImage: string;
  isLoggedIn: boolean;
  accountEmail: string;
  accountName: string;
};

export type PrintType =
  | "Logo"
  | "Personalised Text"
  | "Image"
  | "Image & Text"
  | "Complex Pattern"
  | "Event / Team Branding";
