export type ActiveTab = "profile" | "designs" | "orders";
export type ProductPanelTab = "recommended" | "wishlist";

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  is_oauth?: boolean;
  oauth_provider?: string | null;
  remaining_seconds?: number;
  cooldown_ends_at?: string | null;
  server_time?: string | null;
};

export type SavedAddress = {
  id: number;
  label?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  county?: string | null;
  postcode: string;
  is_default: boolean;
};

export type SavedPaymentMethod = {
  id: number;
  provider_type?: "card" | "paypal" | "klarna" | string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  cardholder_name?: string | null;
  is_default: boolean;
  is_active: boolean;
};

export type AddressFormState = {
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
};

export type SavedDesignItem = {
  id: number;
  name: string;
  product_name: string;
  product_slug?: string | null;
  product_price?: number | null;
  product_sizes?: string[];
  product_images?: string[];
  preview_image: string | null;
  updated_at: string | null;
  payload?: {
    currentViewKey?: "front" | "back" | "leftSleeve" | "rightSleeve";
    selectedColour?: string | null;
    selectedSize?: string | null;
    selectedDesignType?: "printing" | "embroidery" | null;
    viewImageStates?: Record<string, Record<string, any>>;
    baseViewImages?: Partial<Record<"front" | "back" | "leftSleeve" | "rightSleeve", string>>;
    compositePngByView?: Partial<Record<"front" | "back" | "leftSleeve" | "rightSleeve", string>>;
    previewByView?: Partial<
      Record<
        "front" | "back" | "leftSleeve" | "rightSleeve",
        {
          baseImage: string;
          canvasWidth: number;
          canvasHeight: number;
          layers: Array<{
            uid: string;
            type: "image" | "text" | "clipart";
            url?: string;
            text?: string;
            position: { x: number; y: number };
            size: { w: number; h: number };
            rotation: number;
            flip: "none" | "horizontal" | "vertical";
            color?: string;
            borderColor?: string;
            borderWidth?: number;
            fontFamily?: string;
            fontSize?: number;
            textAlign?: "left" | "center" | "right";
          }>;
        }
      >
    >;
  };
};

export type RecommendedProduct = {
  id: number;
  name: string;
  brand: string | null;
  price: number | null;
  image: string | null;
};

export type ProfilePageProps = {
  auth: {
    user: AuthUser;
  };
  savedDesigns?: SavedDesignItem[];
  recommendedProducts?: RecommendedProduct[];
};
