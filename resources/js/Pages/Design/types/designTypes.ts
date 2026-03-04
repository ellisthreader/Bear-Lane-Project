import type { PricePreviewSnapshot } from "../Canvas/Canvas";
import type { TextAlign } from "../Types/Text";

export type RestrictedBoxRatio = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ImageBoxMap = Record<string, RestrictedBoxRatio>;

export interface ColourProductOption {
  colour: string;
  slug?: string;
  sizes?: string[];
  images?: string[];
  image_boxes?: ImageBoxMap;
  size_stock?: Record<string, number>;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  brand?: string;
  price?: number | string;
  original_price?: number | string | null;
  images?: any[];
  image_boxes?: ImageBoxMap;
  image?: string;
  colourProducts?: any[];
  sizes?: string[];
  categories?: any[];
}

export type ProductVariantOption = {
  colour: string;
  size?: string;
  images?: any[];
  imageBoxes?: any;
};

export type CanvasPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  relX?: number;
  relY?: number;
  relW?: number;
  relH?: number;
};

export type ImageState = {
  url: string;
  type: "image" | "text";
  isClipart?: boolean;
  isSvg?: boolean;
  text?: string;
  fontFamily?: string;
  rotation: number;
  flip: "none" | "horizontal" | "vertical";
  size: { w: number; h: number };
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  canvasPositions?: Record<string, CanvasPosition>;
  restrictedBox?: { x: number; y: number; w: number; h: number };
  original: {
    url: string;
    rotation: number;
    flip: "none" | "horizontal" | "vertical";
    size: { w: number; h: number };
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    borderColor?: string;
    borderWidth?: number;
    color?: string;
    renderKey?: string;
    textAlign?: TextAlign;
  };
  fontSize?: number;
  textAlign?: TextAlign;
  width?: number;
  renderKey?: string;
};

export type ViewKey = "front" | "back" | "leftSleeve" | "rightSleeve";

export type SavedDesignPayload = {
  viewImageStates: Record<ViewKey, Record<string, ImageState>>;
  positions: Record<string, CanvasPosition>;
  sizes: Record<string, { w: number; h: number }>;
  uploadedImages: string[];
  currentViewKey: ViewKey;
  selectedColour: string | null;
  selectedSize: string | null;
  selectedDesignType?: "printing" | "embroidery" | null;
  baseViewImages?: Partial<Record<ViewKey, string>>;
  previewByView?: Partial<Record<ViewKey, PricePreviewSnapshot>>;
  compositePngByView?: Partial<Record<ViewKey, string>>;
};

export type SavedDesign = {
  id: number;
  name: string;
  product: {
    id: number;
    name: string;
    slug: string;
    images?: string[];
  } | null;
  previewImage?: string | null;
  updatedAt?: string;
  payload?: SavedDesignPayload;
};

export type ViewImages = Record<ViewKey, string>;

export type CanvasSnapshot = {
  positions: Record<string, CanvasPosition>;
  sizes: Record<string, { w: number; h: number }>;
  viewImageStates: Record<ViewKey, Record<string, ImageState>>;
  currentViewKey: ViewKey;
  selectedUploadedImage: string | null;
  selectedText: string | null;
};

export type HistorySnapshot = {
  product: Product | null;
  imageState: Record<string, ImageState>;
  positions: Record<string, CanvasPosition>;
  sizes: Record<string, { w: number; h: number }>;
  selectedColour: string | null;
  selectedSize: string | null;
  selectedDesignType?: "printing" | "embroidery" | null;
};

export type SidebarView =
  | "blank"
  | "product"
  | "upload"
  | "text"
  | "clipart"
  | "clipart-sections"
  | "clipart-properties"
  | "my-designs";
