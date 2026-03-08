"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useCart } from "@/Context/CartContext";
import { useWishlist } from "@/Context/WishlistContext";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Heart, Plus, Sparkles, Star, X } from "lucide-react";
import { toast } from "react-toastify";
import SizeGuideButton from "./SizeGuide/SizeGuideButton";
import SizeGuideModal from "./SizeGuide/SizeGuideModal";
import { SizeGuideProvider } from "./SizeGuide/SizeGuideContext";
import { inferSizeGuideGender } from "./SizeGuide/inferSizeGuideGender";
import ProductRailSection from "./components/ProductRailSection";
import { ProductQuoteProvider } from "./QuoteModal/ProductQuoteContext";
import GetQuoteButton from "./QuoteModal/GetQuoteButton";
import ProductQuoteModal from "./QuoteModal/ProductQuoteModal";
import { DESIGN_TYPE_OPTIONS, designTypeLabel, normalizeDesignType, type DesignType } from "@/Utils/designType";
import { executeRecaptcha } from "@/Utils/recaptcha";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const COMMON_COLOUR_OPTIONS = [
  "Black",
  "White",
  "Grey",
  "Navy",
  "Blue",
  "Red",
  "Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Cream",
  "Burgundy",
  "Olive",
  "Khaki",
  "Teal",
] as const;

type RestrictedBoxRatio = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type AccordionKey = "description" | "delivery" | "returns";
type AdminEditorErrorMap = Record<string, string>;
type ParcelSizeKey = "very_small" | "small" | "medium" | "large" | "manual";
type AdminVariantModalTab = "editor" | "help";

const RESTRICTED_BOX_DEFAULT: RestrictedBoxRatio = {
  left: 0.2,
  top: 0.15,
  width: 0.6,
  height: 0.7,
};
const RESTRICTED_BOX_MIN_SIZE = 0.05;

const PARCEL_SIZE_PRESETS: Record<
  Exclude<ParcelSizeKey, "manual">,
  {
    label: string;
    maxWeightKg: number;
    lengthCm: number;
    widthCm: number;
    depthCm: number;
    description: string;
  }
> = {
  very_small: {
    label: "Very Small",
    maxWeightKg: 1,
    lengthCm: 35,
    widthCm: 23,
    depthCm: 3,
    description: "Fits through a letterbox. Great for t-shirts, thin clothing, documents.",
  },
  small: {
    label: "Small",
    maxWeightKg: 2,
    lengthCm: 45,
    widthCm: 35,
    depthCm: 16,
    description: "Good for shoes, hoodies, small boxed items.",
  },
  medium: {
    label: "Medium",
    maxWeightKg: 15,
    lengthCm: 61,
    widthCm: 46,
    depthCm: 46,
    description: "Good for multiple clothing items and bulkier goods.",
  },
  large: {
    label: "Large",
    maxWeightKg: 20,
    lengthCm: 120,
    widthCm: 60,
    depthCm: 60,
    description: "Good for large multi-item orders.",
  },
};

const PARCEL_HELP_IMAGES: Record<Exclude<ParcelSizeKey, "manual">, string> = {
  very_small: "/images/Admin/parcels/Verysmall.png",
  small: "/images/Admin/parcels/Small.png",
  medium: "/images/Admin/parcels/Medium.png",
  large: "/images/Admin/parcels/Large.png",
};

interface ColourProduct {
  colour: string;
  slug: string;
  sizes: string[];
  images: string[];
  image_boxes?: Record<string, RestrictedBoxRatio>;
  size_stock?: Record<string, number>;
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

type ProductReviewRow = {
  id: number;
  rating: number;
  message: string;
  title?: string | null;
  created_at?: string | null;
  is_verified_purchase?: boolean;
  user?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  images?: string[];
};

interface Product {
  id?: number | string;
  brand: string;
  name: string;
  slug: string;
  price: number | string;
  original_price?: number | string | null;
  is_sale?: boolean;
  rating?: number | null;
  average_rating?: number | null;
  review_count?: number | null;
  reviews_count?: number | null;
  description?: string;
  images: string[];
  is_premade_design?: boolean;
  premade_quote?: string | null;
  auto_badges?: string[] | null;
  image_boxes?: Record<string, RestrictedBoxRatio>;
  sizes: string[];
  colourProducts: ColourProduct[];
  breadcrumbs?: BreadcrumbItem[];
  specifications?: string;
  reviews?: ProductReviewRow[];
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  dimension_unit?: "cm" | "in" | null;
}

interface Props {
  product: Product;
  recommendedProducts?: ProductListItem[];
  isPreMadeDesign?: boolean;
  adminEditor?: {
    enabled?: boolean;
    categoryId?: number;
    categorySlug?: string;
    categoryName?: string;
    premade?: boolean;
  };
}

type ProductListItem = {
  id: number | string;
  name: string;
  slug: string;
  brand?: string;
  price?: number;
  image?: string;
  is_premade_design?: boolean;
  premade_quote?: string | null;
  auto_badges?: string[] | null;
};

type AdminVariantDraft = {
  id: string;
  size: string;
  stock: string;
  parcelSize: ParcelSizeKey;
  manualWeightKg: string;
  manualLengthCm: string;
  manualWidthCm: string;
  manualDepthCm: string;
};

type AdminColourDraft = {
  id: string;
  name: string;
  imageUrls: string[];
  imageBoxes: Record<string, RestrictedBoxRatio>;
  variants: AdminVariantDraft[];
};

type EditableField = "name" | "price" | "description" | null;
type AdminSaveSuccess = {
  mode: "created" | "edited";
  name: string;
  slug?: string;
  changes: string[];
};

type RestrictedBoxDragMode = "move" | "resize";
type RestrictedBoxDragState = {
  colourId: string;
  imageUrl: string;
  mode: RestrictedBoxDragMode;
  startClientX: number;
  startClientY: number;
  startBox: RestrictedBoxRatio;
};

type RestrictedBoxEditorState = {
  colourId: string;
  imageUrl: string;
  imageIndex: number;
  imageCount: number;
  colourName: string;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeRestrictedBox = (box: Partial<RestrictedBoxRatio> | null | undefined): RestrictedBoxRatio => {
  const left = Number.isFinite(Number(box?.left)) ? Number(box?.left) : RESTRICTED_BOX_DEFAULT.left;
  const top = Number.isFinite(Number(box?.top)) ? Number(box?.top) : RESTRICTED_BOX_DEFAULT.top;
  const width = Number.isFinite(Number(box?.width)) ? Number(box?.width) : RESTRICTED_BOX_DEFAULT.width;
  const height = Number.isFinite(Number(box?.height)) ? Number(box?.height) : RESTRICTED_BOX_DEFAULT.height;

  const safeLeft = clampNumber(left, 0, 1);
  const safeTop = clampNumber(top, 0, 1);
  const safeWidth = clampNumber(width, RESTRICTED_BOX_MIN_SIZE, 1 - safeLeft);
  const safeHeight = clampNumber(height, RESTRICTED_BOX_MIN_SIZE, 1 - safeTop);

  return {
    left: Number(safeLeft.toFixed(6)),
    top: Number(safeTop.toFixed(6)),
    width: Number(safeWidth.toFixed(6)),
    height: Number(safeHeight.toFixed(6)),
  };
};

const isValidRestrictedBox = (box: unknown): box is RestrictedBoxRatio => {
  if (!box || typeof box !== "object") return false;
  const candidate = box as RestrictedBoxRatio;
  if (![candidate.left, candidate.top, candidate.width, candidate.height].every((value) => Number.isFinite(Number(value)))) {
    return false;
  }

  const left = Number(candidate.left);
  const top = Number(candidate.top);
  const width = Number(candidate.width);
  const height = Number(candidate.height);

  if (left < 0 || top < 0 || width <= 0 || height <= 0) return false;
  if (left >= 1 || top >= 1 || width > 1 || height > 1) return false;
  if (left + width > 1 || top + height > 1) return false;

  return true;
};

const mapRestrictedBoxes = (rawMap: unknown): Record<string, RestrictedBoxRatio> => {
  if (!rawMap || typeof rawMap !== "object") return {};

  return Object.entries(rawMap as Record<string, unknown>).reduce<Record<string, RestrictedBoxRatio>>((acc, [key, rawBox]) => {
    const imageKey = String(key || "").trim();
    if (!imageKey || !isValidRestrictedBox(rawBox)) return acc;
    acc[imageKey] = normalizeRestrictedBox(rawBox);
    return acc;
  }, {});
};

const restrictedDraftKey = (colourId: string, imageUrl: string) => `${colourId}::${imageUrl}`;

const renderRatingStars = (value: number, className = "h-4 w-4") => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  return Array.from({ length: 5 }).map((_, index) => {
    const fillRatio = Math.max(0, Math.min(1, safeValue - index));
    return (
      <span key={`rating-star-${index}`} className={`relative inline-flex ${className}`}>
        <Star className={`${className} text-[#E2D6BE]`} />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
          <Star className={`${className} fill-current text-[#C8941C]`} />
        </span>
      </span>
    );
  });
};

export default function ProductLayout({ product, recommendedProducts = [], isPreMadeDesign = false, adminEditor }: Props) {
  const page = usePage<{ auth?: { user?: { id?: number; name?: string; email?: string; is_admin?: boolean } } }>();
  const isSignedIn = Boolean(page.props.auth?.user?.id);
  const isAdminUser = Boolean(page.props.auth?.user?.is_admin);
  const { addToCart } = useCart();
  const authEmail = String(page.props.auth?.user?.email || "").trim();
  const authName = String(page.props.auth?.user?.name || "").trim();
  const { toggleWishlistItem, isInWishlist, openWishlist } = useWishlist();
  const isAdminEditor = Boolean(adminEditor?.enabled);
  const serverPremadeState = Boolean((product.is_premade_design ?? isPreMadeDesign) || adminEditor?.premade);
  const [isAdminPremadeEditor, setIsAdminPremadeEditor] = useState<boolean>(() => serverPremadeState);
  const isPremadeProduct = isAdminEditor ? isAdminPremadeEditor : serverPremadeState;

  useEffect(() => {
    if (!isAdminEditor) return;
    setIsAdminPremadeEditor(serverPremadeState);
  }, [isAdminEditor, serverPremadeState, product.id]);

  const [adminName, setAdminName] = useState(product.name || "");
  const [adminPrice, setAdminPrice] = useState(
    Number.isFinite(Number(product.price)) ? String(Number(product.price)) : ""
  );
  const [adminDescription, setAdminDescription] = useState(product.description || "");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState<AdminSaveSuccess | null>(null);
  const [adminErrors, setAdminErrors] = useState<AdminEditorErrorMap>({});
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [adminVariantModalTab, setAdminVariantModalTab] = useState<AdminVariantModalTab>("editor");
  const [openAdminColourIds, setOpenAdminColourIds] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [adminColours, setAdminColours] = useState<AdminColourDraft[]>(() => {
    const fromProduct = (product.colourProducts || []).map((cp, index) => {
      const sizeStock = cp.size_stock ?? {};
      const sizes = cp.sizes?.length ? cp.sizes : Object.keys(sizeStock);
      const variants = (sizes || []).map((size, variantIndex) => ({
        id: `variant-${index + 1}-${variantIndex + 1}`,
        size: String(size || "").toUpperCase(),
        stock: String(Number(sizeStock[String(size).toUpperCase()] ?? 0)),
        parcelSize: "small" as const,
        manualWeightKg: "",
        manualLengthCm: "",
        manualWidthCm: "",
        manualDepthCm: "",
      }));

      return {
        id: `colour-${index + 1}`,
        name: cp.colour || "",
        imageUrls: (cp.images || []).map((url) => String(url || "").trim()).filter(Boolean),
        imageBoxes: mapRestrictedBoxes(cp.image_boxes),
        variants: variants.length
          ? variants
          : [
              {
                id: `variant-${index + 1}-1`,
                size: "M",
                stock: "0",
                parcelSize: "small" as const,
                manualWeightKg: "",
                manualLengthCm: "",
                manualWidthCm: "",
                manualDepthCm: "",
              },
            ],
      };
    });

    if (fromProduct.length > 0) return fromProduct;

    return [
      {
        id: "colour-1",
        name: "",
        imageUrls: [],
        imageBoxes: {},
        variants: [
          {
            id: "variant-1-1",
            size: "M",
            stock: "0",
            parcelSize: "small" as const,
            manualWeightKg: "",
            manualLengthCm: "",
            manualWidthCm: "",
            manualDepthCm: "",
          },
        ],
      },
    ];
  });
  const [restrictedBoxDrafts, setRestrictedBoxDrafts] = useState<Record<string, RestrictedBoxRatio>>({});
  const [restrictedBoxDragState, setRestrictedBoxDragState] = useState<RestrictedBoxDragState | null>(null);
  const [restrictedBoxEditor, setRestrictedBoxEditor] = useState<RestrictedBoxEditorState | null>(null);
  const restrictedBoxCanvasRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const adminPreviewColourProducts = useMemo<ColourProduct[]>(() => {
    if (!isAdminEditor) return product.colourProducts || [];

    return adminColours.map((colour, index) => {
      const safeColourName = colour.name.trim() || `Colour ${index + 1}`;
      const images = colour.imageUrls
        .map((url) => url.trim())
        .filter(Boolean);
      const sizeStock = colour.variants.reduce<Record<string, number>>((acc, variant) => {
        const size = variant.size.trim().toUpperCase();
        if (!size) return acc;
        const stock = Number(variant.stock);
        acc[size] = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
        return acc;
      }, {});
      const sizes = Object.keys(sizeStock);

      return {
        colour: safeColourName,
        slug: `draft-${safeColourName.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
        sizes,
        size_stock: sizeStock,
        images,
        image_boxes: colour.imageBoxes,
      };
    });
  }, [adminColours, isAdminEditor, product.colourProducts]);

  const effectiveName = isAdminEditor ? adminName.trim() || "Untitled Product" : product.name;
  const effectivePrice = isAdminEditor ? Number(adminPrice || 0) : Number(product.price ?? 0);
  const effectiveDescription = isAdminEditor
    ? adminDescription.trim() || "Start describing your product so customers understand fit, material, and purpose."
    : product.description;
  const effectiveColourProducts = isAdminEditor ? adminPreviewColourProducts : product.colourProducts;
  const effectiveProductImages = useMemo(() => {
    if (!isAdminEditor) return product.images ?? [];
    const merged = adminPreviewColourProducts.flatMap((cp) => cp.images || []).filter(Boolean);
    return Array.from(new Set(merged));
  }, [adminPreviewColourProducts, isAdminEditor, product.images]);
  const basePriceForSale = Number(
    product.original_price !== null && product.original_price !== undefined ? product.original_price : product.price ?? 0
  );
  const hasAdminSalePreview =
    isAdminEditor &&
    Number.isFinite(basePriceForSale) &&
    basePriceForSale > 0 &&
    Number.isFinite(effectivePrice) &&
    effectivePrice > 0 &&
    effectivePrice < basePriceForSale;

  const [selectedColour, setSelectedColour] = useState(effectiveColourProducts[0]?.colour ?? "");
  const [currentVariant, setCurrentVariant] = useState<ColourProduct | null>(effectiveColourProducts[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedDesignType, setSelectedDesignType] = useState<DesignType>(() => {
    if (typeof window === "undefined") return "printing";
    const fromQuery = new URLSearchParams(window.location.search).get("designType");
    return normalizeDesignType(fromQuery);
  });
  const [showSizeError, setShowSizeError] = useState(false);
  const [displayImages, setDisplayImages] = useState<string[]>(
    effectiveColourProducts[0]?.images ?? effectiveProductImages ?? []
  );
  const [openAccordion, setOpenAccordion] = useState<AccordionKey | null>("description");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ProductListItem[]>([]);
  const reviewsRef = useRef<HTMLElement | null>(null);

  const reviewCount = useMemo(() => {
    const raw = Number(product.review_count ?? product.reviews_count ?? 0);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }, [product.review_count, product.reviews_count]);
  const rating = useMemo(() => {
    const raw = Number(product.average_rating ?? product.rating ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(5, raw);
  }, [product.average_rating, product.rating]);
  const publicOriginalPrice = Number(product.original_price ?? 0);
  const isPublicSale = !isAdminEditor && publicOriginalPrice > 0 && (Boolean(product.is_sale) || publicOriginalPrice > effectivePrice);

  useEffect(() => {
    if (!effectiveColourProducts.some((item) => item.colour === selectedColour)) {
      setSelectedColour(effectiveColourProducts[0]?.colour ?? "");
    }
  }, [effectiveColourProducts, selectedColour]);

  useEffect(() => {
    const variant = effectiveColourProducts.find((v) => v.colour === selectedColour) ?? effectiveColourProducts[0] ?? null;
    setCurrentVariant(variant);
    if (isAdminEditor) {
      setDisplayImages(variant?.images?.length ? variant.images : []);
    } else {
      setDisplayImages(variant?.images?.length ? variant.images : effectiveProductImages ?? []);
    }

    if (!variant) return;
    const firstInStock = STANDARD_SIZES.find((size) => {
      const stockMap = variant.size_stock ?? {};
      if (Object.keys(stockMap).length > 0) return Number(stockMap[size] ?? 0) > 0;
      return (variant.sizes ?? []).map((s) => s.toUpperCase()).includes(size);
    });
    setSelectedSize(firstInStock ?? STANDARD_SIZES[0]);
    setShowSizeError(false);
  }, [selectedColour, effectiveColourProducts, effectiveProductImages, isAdminEditor]);

  useEffect(() => {
    setMobileImageIndex(0);
  }, [displayImages]);

  const sizeStockMap = useMemo(() => {
    const map = currentVariant?.size_stock ?? {};
    const normalized: Record<string, number> = {};
    Object.entries(map).forEach(([size, stock]) => {
      normalized[String(size).toUpperCase()] = Number(stock ?? 0);
    });
    return normalized;
  }, [currentVariant]);

  const availableSizeSet = useMemo(() => {
    if (Object.keys(sizeStockMap).length > 0) {
      return new Set(Object.entries(sizeStockMap).filter(([, stock]) => Number(stock) > 0).map(([size]) => size.toUpperCase()));
    }
    return new Set((currentVariant?.sizes ?? []).map((size) => String(size).toUpperCase()));
  }, [currentVariant?.sizes, sizeStockMap]);

  const isSizeInStock = (size: string) => availableSizeSet.has(size.toUpperCase());
  const selectedSizeInStock = isSizeInStock(selectedSize);
  const canAttemptPrimaryAction = Boolean(selectedSize && selectedColour && currentVariant);

  const wishlistId = String(product.id || product.slug);
  const inWishlist = isInWishlist(wishlistId);

  const breadcrumbs = useMemo(() => {
    if (Array.isArray(product.breadcrumbs) && product.breadcrumbs.length > 0) return product.breadcrumbs;
    return [
      { label: "Men", href: "/category/men" },
      { label: "Tops & T-Shirts", href: "/category/men/tops-and-t-shirts" },
      { label: "T-Shirts", href: "/category/men/tops-and-t-shirts/t-shirts" },
      { label: "Plain T-Shirts", href: "#" },
    ];
  }, [product.breadcrumbs]);

  const breadcrumbTrailWithProduct = useMemo(() => {
    if (isAdminEditor) return breadcrumbs;
    const trail = [...breadcrumbs];
    const lastLabel = trail[trail.length - 1]?.label?.trim().toLowerCase();
    const productLabel = (effectiveName || "").trim();
    if (productLabel && lastLabel !== productLabel.toLowerCase()) {
      trail.push({ label: productLabel, href: "#" });
    }
    return trail;
  }, [breadcrumbs, effectiveName, isAdminEditor]);

  const sizeGuideGender = useMemo(
    () =>
      inferSizeGuideGender({
        breadcrumbs: breadcrumbTrailWithProduct,
        productName: effectiveName,
        productSlug: product.slug,
      }),
    [breadcrumbTrailWithProduct, effectiveName, product.slug]
  );

  const quoteSizeCategory = useMemo(() => {
    if (sizeGuideGender === "women") return "Women";
    if (sizeGuideGender === "kids") return "Junior";
    return "Men";
  }, [sizeGuideGender]);

  const handlePrimaryAction = async () => {
    if (notifyLoading) return;

    if (!canAttemptPrimaryAction) {
      setShowSizeError(true);
      toast.error("Please select an available colour and size.", {
        position: "top-center",
        autoClose: 3000,
        toastId: "product-size-selection-error",
      });
      return;
    }

    if (selectedSizeInStock) {
      if (isPremadeProduct) {
        addToCart({
          slug: product.slug,
          title: effectiveName,
          price: effectivePrice,
          colour: selectedColour || currentVariant?.colour || "Default",
          size: selectedSize,
          image: displayImages[0] ?? effectiveProductImages?.[0] ?? "/images/no-image.png",
          availableSizes: (currentVariant?.sizes || STANDARD_SIZES).map((size) => String(size).toUpperCase()),
          designType: "printing",
        });
        toast.success("Added to cart.", {
          position: "top-center",
          autoClose: 2500,
          toastId: "premade-added-to-cart",
        });
        return;
      }

      router.get(`/design/${product.slug}`, {
        colour: selectedColour,
        size: selectedSize,
        designType: selectedDesignType,
      });
      return;
    }

    if (!isSignedIn) {
      const redirectUrl = `${window.location.pathname}${window.location.search}`;
      router.get("/login", { redirect: redirectUrl });
      return;
    }

    setNotifyLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha("restock_notify");
      const response = await fetch(`/product/${encodeURIComponent(product.slug)}/notify-restock`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          colour: selectedColour,
          size: selectedSize,
          recaptcha_token: recaptchaToken,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save notification request.");
      }

      toast.success(payload?.message || "Success. You will be notified when this size is back in stock.", {
        position: "top-center",
        autoClose: 3000,
        toastId: "product-restock-notify-success",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save notification request.", {
        position: "top-center",
        autoClose: 3000,
        toastId: "product-restock-notify-error",
      });
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleWishlist = () => {
    toggleWishlistItem({
      id: wishlistId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: displayImages[0] ?? product.images?.[0] ?? null,
      slug: product.slug,
    });
    openWishlist();
  };

  const primaryCtaLabel = selectedSizeInStock
    ? isPremadeProduct
      ? "Add To Cart"
      : "Start Designing"
    : isSignedIn
      ? "Notify me when back in stock"
      : "Sign in to get notified when back in stock";

  const reviewRows = useMemo<ProductReviewRow[]>(() => {
    if (!Array.isArray(product.reviews)) return [];
    return product.reviews;
  }, [product.reviews]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isLightboxOpen]);

  useEffect(() => {
    if (isAdminEditor) return;
    const storageKey = "recently_viewed_products_v1";
    const currentProduct: ProductListItem = {
      id: product.id || product.slug,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      price: Number(product.price ?? 0),
      image: product.images?.[0] || "/images/no-image.png",
      is_premade_design: Boolean(product.is_premade_design),
      premade_quote: String(product.premade_quote || ""),
      auto_badges: Array.isArray(product.auto_badges) ? product.auto_badges : [],
    };

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const previous = Array.isArray(parsed) ? (parsed as ProductListItem[]) : [];

      const next = [
        currentProduct,
        ...previous.filter((item) => item?.slug && item.slug !== currentProduct.slug),
      ].slice(0, 12);

      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setRecentlyViewedProducts(next.filter((item) => item.slug !== currentProduct.slug).slice(0, 8));
    } catch {
      setRecentlyViewedProducts([]);
    }
  }, [isAdminEditor, product.brand, product.id, product.images, product.name, product.price, product.slug]);

  const updateAdminColour = (colourId: string, updater: (colour: AdminColourDraft) => AdminColourDraft) => {
    setAdminColours((prev) => prev.map((colour) => (colour.id === colourId ? updater(colour) : colour)));
  };

  const isCommonColourOption = (value: string) =>
    COMMON_COLOUR_OPTIONS.some((option) => option.toLowerCase() === value.trim().toLowerCase());

  const getVariantShippingMetrics = (variant: AdminVariantDraft) => {
    if (variant.parcelSize !== "manual") {
      const preset = PARCEL_SIZE_PRESETS[variant.parcelSize];
      return {
        weightKg: preset.maxWeightKg,
        lengthCm: preset.lengthCm,
        widthCm: preset.widthCm,
        depthCm: preset.depthCm,
        manualValid: true,
      };
    }

    const weightKg = Number(variant.manualWeightKg);
    const lengthCm = Number(variant.manualLengthCm);
    const widthCm = Number(variant.manualWidthCm);
    const depthCm = Number(variant.manualDepthCm);
    const manualValid =
      Number.isFinite(weightKg) &&
      weightKg > 0 &&
      Number.isFinite(lengthCm) &&
      lengthCm > 0 &&
      Number.isFinite(widthCm) &&
      widthCm > 0 &&
      Number.isFinite(depthCm) &&
      depthCm > 0;

    return {
      weightKg,
      lengthCm,
      widthCm,
      depthCm,
      manualValid,
    };
  };

  const addAdminColour = () => {
    const colourId = `colour-${Date.now()}`;
    setAdminColours((prev) => [
      ...prev,
      {
        id: colourId,
        name: "",
        imageUrls: [],
        imageBoxes: {},
        variants: [
          {
            id: `variant-${Date.now()}-1`,
            size: "M",
            stock: "0",
            parcelSize: "small" as const,
            manualWeightKg: "",
            manualLengthCm: "",
            manualWidthCm: "",
            manualDepthCm: "",
          },
        ],
      },
    ]);
    setOpenAdminColourIds((prev) => (prev.includes(colourId) ? prev : [...prev, colourId]));
  };

  const removeAdminColour = (colourId: string) => {
    const canRemove = adminColours.length > 1;
    setAdminColours((prev) => (prev.length > 1 ? prev.filter((colour) => colour.id !== colourId) : prev));
    if (!canRemove) return;
    setRestrictedBoxDrafts((prev) =>
      Object.entries(prev).reduce<Record<string, RestrictedBoxRatio>>((acc, [key, value]) => {
        if (!key.startsWith(`${colourId}::`)) {
          acc[key] = value;
        }
        return acc;
      }, {})
    );
    Object.keys(restrictedBoxCanvasRefs.current).forEach((key) => {
      if (key.startsWith(`${colourId}::`)) {
        delete restrictedBoxCanvasRefs.current[key];
      }
    });
  };

  const addAdminVariant = (colourId: string) => {
    updateAdminColour(colourId, (colour) => ({
      ...colour,
      variants: [
        ...colour.variants,
        {
          id: `variant-${Date.now()}-${colour.variants.length + 1}`,
          size: "M",
          stock: "0",
          parcelSize: "small" as const,
          manualWeightKg: "",
          manualLengthCm: "",
          manualWidthCm: "",
          manualDepthCm: "",
        },
      ],
    }));
  };

  const removeAdminVariant = (colourId: string, variantId: string) => {
    updateAdminColour(colourId, (colour) => ({
      ...colour,
      variants: colour.variants.length > 1 ? colour.variants.filter((variant) => variant.id !== variantId) : colour.variants,
    }));
  };
  const removeAdminImage = (imageIndex: number) => {
    if (!isAdminEditor || imageIndex < 0) return;
    const targetIndex = selectedAdminColourIndex >= 0 ? selectedAdminColourIndex : 0;
    const targetColour = adminColours[targetIndex];
    if (!targetColour) return;

    const currentImages = targetColour.imageUrls.map((url) => url.trim()).filter(Boolean);
    if (imageIndex >= currentImages.length) return;
    const removedImageUrl = currentImages[imageIndex];
    currentImages.splice(imageIndex, 1);
    updateAdminColour(targetColour.id, (colour) => ({
      ...colour,
      imageUrls: currentImages,
      imageBoxes: Object.entries(colour.imageBoxes).reduce<Record<string, RestrictedBoxRatio>>((acc, [key, value]) => {
        if (key !== removedImageUrl) {
          acc[key] = value;
        }
        return acc;
      }, {}),
    }));
    setRestrictedBoxDrafts((prev) =>
      Object.entries(prev).reduce<Record<string, RestrictedBoxRatio>>((acc, [key, value]) => {
        if (key !== restrictedDraftKey(targetColour.id, removedImageUrl)) {
          acc[key] = value;
        }
        return acc;
      }, {})
    );
    if (
      restrictedBoxEditor &&
      restrictedBoxEditor.colourId === targetColour.id &&
      restrictedBoxEditor.imageUrl === removedImageUrl
    ) {
      setRestrictedBoxDragState(null);
      setRestrictedBoxEditor(null);
    }
  };

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
  const getPreviewColourName = (colour: AdminColourDraft, index: number) => colour.name.trim() || `Colour ${index + 1}`;
  const selectedAdminColourIndex = useMemo(
    () => adminColours.findIndex((colour, index) => getPreviewColourName(colour, index) === selectedColour),
    [adminColours, selectedColour]
  );
  useEffect(() => {
    setOpenAdminColourIds((prev) => {
      const valid = prev.filter((id) => adminColours.some((colour) => colour.id === id));
      if (valid.length > 0) return valid;
      return adminColours.length ? [adminColours[0].id] : [];
    });
  }, [adminColours]);

  useEffect(() => {
    if (!restrictedBoxDragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const dragKey = restrictedDraftKey(restrictedBoxDragState.colourId, restrictedBoxDragState.imageUrl);
      const container = restrictedBoxCanvasRefs.current[dragKey];
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaX = (event.clientX - restrictedBoxDragState.startClientX) / rect.width;
      const deltaY = (event.clientY - restrictedBoxDragState.startClientY) / rect.height;
      const start = restrictedBoxDragState.startBox;
      let nextBox: RestrictedBoxRatio = start;

      if (restrictedBoxDragState.mode === "move") {
        const left = clampNumber(start.left + deltaX, 0, 1 - start.width);
        const top = clampNumber(start.top + deltaY, 0, 1 - start.height);
        nextBox = normalizeRestrictedBox({
          left,
          top,
          width: start.width,
          height: start.height,
        });
      } else {
        const width = clampNumber(start.width + deltaX, RESTRICTED_BOX_MIN_SIZE, 1 - start.left);
        const height = clampNumber(start.height + deltaY, RESTRICTED_BOX_MIN_SIZE, 1 - start.top);
        nextBox = normalizeRestrictedBox({
          left: start.left,
          top: start.top,
          width,
          height,
        });
      }

      const draftKey = restrictedDraftKey(restrictedBoxDragState.colourId, restrictedBoxDragState.imageUrl);
      setRestrictedBoxDrafts((prev) => ({
        ...prev,
        [draftKey]: nextBox,
      }));
    };

    const handleMouseUp = () => {
      setRestrictedBoxDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [restrictedBoxDragState]);

  const toggleAdminColourTab = (colourId: string) => {
    setOpenAdminColourIds((prev) =>
      prev.includes(colourId) ? prev.filter((id) => id !== colourId) : [...prev, colourId]
    );
  };

  const beginRestrictedBoxDrag = (
    event: React.MouseEvent,
    colourId: string,
    imageUrl: string,
    mode: RestrictedBoxDragMode,
    currentBox: RestrictedBoxRatio
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const normalized = normalizeRestrictedBox(currentBox);
    const draftKey = restrictedDraftKey(colourId, imageUrl);
    setRestrictedBoxDrafts((prev) => ({
      ...prev,
      [draftKey]: normalized,
    }));
    setRestrictedBoxDragState({
      colourId,
      imageUrl,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: normalized,
    });
  };

  const resetRestrictedBoxDraft = (colourId: string, imageUrl: string) => {
    const draftKey = restrictedDraftKey(colourId, imageUrl);
    setRestrictedBoxDrafts((prev) => ({
      ...prev,
      [draftKey]: RESTRICTED_BOX_DEFAULT,
    }));
  };

  const saveRestrictedBoxForImage = (colourId: string, imageUrl: string) => {
    const draftKey = restrictedDraftKey(colourId, imageUrl);
    const colour = adminColours.find((item) => item.id === colourId);
    if (!colour) return;
    const current = restrictedBoxDrafts[draftKey] ?? colour.imageBoxes[imageUrl] ?? RESTRICTED_BOX_DEFAULT;
    const normalized = normalizeRestrictedBox(current);

    updateAdminColour(colourId, (item) => ({
      ...item,
      imageBoxes: {
        ...item.imageBoxes,
        [imageUrl]: normalized,
      },
    }));

    setRestrictedBoxDrafts((prev) => ({
      ...prev,
      [draftKey]: normalized,
    }));
    setAdminErrors((prev) => {
      const key = `colour.${colourId}.image_boxes`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openRestrictedBoxEditor = (imageIndex: number) => {
    if (!isAdminEditor || imageIndex < 0) return;
    const targetIndex = selectedAdminColourIndex >= 0 ? selectedAdminColourIndex : 0;
    const targetColour = adminColours[targetIndex];
    if (!targetColour) return;

    const cleanImages = targetColour.imageUrls.map((url) => url.trim()).filter(Boolean);
    const imageUrl = cleanImages[imageIndex];
    if (!imageUrl) return;

    const draftKey = restrictedDraftKey(targetColour.id, imageUrl);
    const initialBox = normalizeRestrictedBox(
      restrictedBoxDrafts[draftKey] ?? targetColour.imageBoxes[imageUrl] ?? RESTRICTED_BOX_DEFAULT
    );
    setRestrictedBoxDrafts((prev) => ({
      ...prev,
      [draftKey]: initialBox,
    }));

    setRestrictedBoxEditor({
      colourId: targetColour.id,
      imageUrl,
      imageIndex,
      imageCount: cleanImages.length,
      colourName: getPreviewColourName(targetColour, targetIndex),
    });
  };

  const closeRestrictedBoxEditor = () => {
    setRestrictedBoxDragState(null);
    setRestrictedBoxEditor(null);
  };

  const saveRestrictedBoxFromEditor = () => {
    if (!restrictedBoxEditor) return;
    saveRestrictedBoxForImage(restrictedBoxEditor.colourId, restrictedBoxEditor.imageUrl);
  };

  const moveRestrictedBoxEditorImage = (direction: "prev" | "next") => {
    if (!restrictedBoxEditor) return;
    const colour = adminColours.find((item) => item.id === restrictedBoxEditor.colourId);
    if (!colour) return;

    const cleanImages = colour.imageUrls.map((url) => url.trim()).filter(Boolean);
    if (!cleanImages.length) return;
    const currentIndex = cleanImages.findIndex((url) => url === restrictedBoxEditor.imageUrl);
    if (currentIndex < 0) return;
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= cleanImages.length) return;

    const nextImageUrl = cleanImages[nextIndex];
    const draftKey = restrictedDraftKey(colour.id, nextImageUrl);
    setRestrictedBoxDrafts((prev) => ({
      ...prev,
      [draftKey]: normalizeRestrictedBox(prev[draftKey] ?? colour.imageBoxes[nextImageUrl] ?? RESTRICTED_BOX_DEFAULT),
    }));
    setRestrictedBoxEditor({
      colourId: colour.id,
      imageUrl: nextImageUrl,
      imageIndex: nextIndex,
      imageCount: cleanImages.length,
      colourName: restrictedBoxEditor.colourName,
    });
  };

  const openImagePicker = () => {
    if (!isAdminEditor) return;
    if (!adminColours.length) {
      toast.error("Add at least one colour in the modal first.");
      return;
    }
    imageInputRef.current?.click();
  };

  const handleAdminImagePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !isAdminEditor) return;

    const targetIndex = selectedAdminColourIndex >= 0 ? selectedAdminColourIndex : 0;
    const targetColour = adminColours[targetIndex];
    if (!targetColour) {
      toast.error("Please add a colour before uploading pictures.");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedPaths: string[] = [];
      const uploadErrors: string[] = [];
      for (const file of files) {
        if (file.type && !file.type.startsWith("image/")) {
          uploadErrors.push(`${file.name} is not a supported image file.`);
          continue;
        }
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/admin/products/upload-image", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-CSRF-TOKEN": getCsrfToken(),
            "X-Requested-With": "XMLHttpRequest",
          },
          body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.path) {
          uploadErrors.push(payload?.message || `Unable to upload ${file.name}.`);
          continue;
        }
        uploadedPaths.push(String(payload.path));
      }

      if (uploadedPaths.length > 0) {
        updateAdminColour(targetColour.id, (colour) => ({
          ...colour,
          imageUrls: [...colour.imageUrls.map((url) => url.trim()).filter(Boolean), ...uploadedPaths],
        }));
        setSelectedColour(getPreviewColourName(targetColour, targetIndex));
        toast.success(uploadedPaths.length === 1 ? "1 image uploaded." : `${uploadedPaths.length} images uploaded.`);
      }
      if (uploadErrors.length > 0) {
        toast.error(uploadErrors[0]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const validateAdminProductDraft = () => {
    const errors: AdminEditorErrorMap = {};

    if (!adminName.trim()) errors.name = "Title is required.";
    if (!adminPrice.trim()) {
      errors.price = "Price is required.";
    } else if (!Number.isFinite(Number(adminPrice)) || Number(adminPrice) <= 0) {
      errors.price = "Price must be greater than 0.";
    }
    if (!adminDescription.trim()) errors.description = "Product description is required.";

    if (!adminColours.length) {
      errors.colours = "Add at least one colour.";
    }

    adminColours.forEach((colour, colourIndex) => {
      const colourLabel = colour.name.trim() || `Colour ${colourIndex + 1}`;
      if (!colour.name.trim()) {
        errors[`colour.${colour.id}.name`] = `${colourLabel}: colour name is required.`;
      }

      const validImages = colour.imageUrls.map((url) => url.trim()).filter(Boolean);
      if (validImages.length === 0) {
        errors[`colour.${colour.id}.images`] = `${colourLabel}: upload at least one product image.`;
      } else if (!isAdminPremadeEditor) {
        const invalidImageIndex = validImages.findIndex((url) => !isValidRestrictedBox(colour.imageBoxes[url]));
        if (invalidImageIndex >= 0) {
          errors[`colour.${colour.id}.image_boxes`] =
            `${colourLabel}: set and save a restricted box for image ${invalidImageIndex + 1}.`;
        }
      }

      if (!colour.variants.length) {
        errors[`colour.${colour.id}.variants`] = `${colourLabel}: add at least one size variant.`;
        return;
      }

      const seenSizes = new Set<string>();
      colour.variants.forEach((variant, variantIndex) => {
        const size = variant.size.trim().toUpperCase();
        const stock = Number(variant.stock);
        const metrics = getVariantShippingMetrics(variant);

        if (!size) {
          errors[`colour.${colour.id}.variant.${variant.id}.size`] = `${colourLabel}: variant ${variantIndex + 1} size is required.`;
        } else if (seenSizes.has(size)) {
          errors[`colour.${colour.id}.variant.${variant.id}.size`] = `${colourLabel}: duplicate size ${size}.`;
        } else {
          seenSizes.add(size);
        }

        if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
          errors[`colour.${colour.id}.variant.${variant.id}.stock`] = `${colourLabel}: quantity must be a whole number 0 or above.`;
        }

        if (variant.parcelSize === "manual" && !metrics.manualValid) {
          errors[`colour.${colour.id}.variant.${variant.id}.parcel`] =
            `${colourLabel}: manual parcel values must be greater than 0 for size ${size || variantIndex + 1}.`;
        }
      });
    });

    return errors;
  };

  const buildAdminImageBoxesPayload = (colour: AdminColourDraft) => {
    const validImages = colour.imageUrls.map((url) => url.trim()).filter(Boolean);
    return validImages.reduce<Record<string, RestrictedBoxRatio>>((acc, imageUrl) => {
      const current = colour.imageBoxes[imageUrl];
      if (!isValidRestrictedBox(current)) {
        return acc;
      }
      acc[imageUrl] = normalizeRestrictedBox(current);
      return acc;
    }, {});
  };

  const handleSaveAdminProduct = async () => {
    if (!isAdminEditor || !adminEditor?.categoryId) return;

    const existingProductId =
      typeof product.id === "number"
        ? product.id
        : Number.isFinite(Number(product.id))
          ? Number(product.id)
          : null;

    if (existingProductId && existingProductId > 0) {
      const errors = validateAdminProductDraft();
      setAdminErrors(errors);
      if (Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];
        if (firstError) toast.error(firstError, { position: "top-center", autoClose: 3200 });
        return;
      }

      const variantMetrics = adminColours.flatMap((colour) => colour.variants.map((variant) => getVariantShippingMetrics(variant)));
      const maxLengthCm = Math.max(...variantMetrics.map((item) => item.lengthCm));
      const maxWidthCm = Math.max(...variantMetrics.map((item) => item.widthCm));
      const maxDepthCm = Math.max(...variantMetrics.map((item) => item.depthCm));
      const payload = {
        name: adminName.trim(),
        brand: product.brand || "Brand",
        price: Number(adminPrice),
        description: adminDescription.trim(),
        category_id: Number(adminEditor.categoryId),
        is_premade: isAdminPremadeEditor,
        dimensions: {
          length: maxLengthCm,
          width: maxWidthCm,
          height: maxDepthCm,
          unit: "cm",
        },
        colours: adminColours.map((colour) => ({
          name: colour.name.trim(),
          images: colour.imageUrls.map((url) => url.trim()).filter(Boolean),
          image_boxes: buildAdminImageBoxesPayload(colour),
          variants: colour.variants.map((variant) => ({
            size: variant.size.trim().toUpperCase(),
            stock: Math.max(0, Math.floor(Number(variant.stock))),
            weight: getVariantShippingMetrics(variant).weightKg,
          })),
        })),
      };

      const oldName = String(product.name || "").trim();
      const oldPrice = Number(product.price ?? 0);
      const oldDescription = String(product.description || "").trim();
      const newName = adminName.trim();
      const newPrice = Number(adminPrice);
      const newDescription = adminDescription.trim();
      const oldOriginal = Number(product.original_price ?? 0);
      const baseline = oldOriginal > 0 ? oldOriginal : oldPrice;
      const nextIsSale = baseline > 0 && newPrice < baseline;
      const oldColourCount = product.colourProducts?.length ?? 0;
      const newColourCount = payload.colours.length;
      const oldVariantCount = (product.colourProducts ?? []).reduce((sum, colour) => sum + (colour.sizes?.length ?? 0), 0);
      const newVariantCount = payload.colours.reduce((sum, colour) => sum + colour.variants.length, 0);
      const oldImageCount = (product.colourProducts ?? []).reduce((sum, colour) => sum + (colour.images?.length ?? 0), 0);
      const newImageCount = payload.colours.reduce((sum, colour) => sum + colour.images.length, 0);
      const oldRestrictedCount = (product.colourProducts ?? []).reduce(
        (sum, colour) => sum + Object.keys(colour.image_boxes ?? {}).length,
        0
      );
      const newRestrictedCount = payload.colours.reduce(
        (sum, colour) => sum + Object.keys(colour.image_boxes ?? {}).length,
        0
      );
      const changeItems: string[] = [];
      if (newName !== oldName) {
        changeItems.push(`Name: "${oldName || "Untitled"}" -> "${newName}"`);
      }
      if (Number.isFinite(oldPrice) && Number.isFinite(newPrice) && oldPrice !== newPrice) {
        changeItems.push(`Price: £${oldPrice.toFixed(2)} -> £${newPrice.toFixed(2)}`);
      }
      if (newDescription !== oldDescription) {
        changeItems.push("Description updated.");
      }
      if (oldColourCount !== newColourCount) {
        changeItems.push(`Colours: ${oldColourCount} -> ${newColourCount}`);
      }
      if (oldVariantCount !== newVariantCount) {
        changeItems.push(`Sizes/variants: ${oldVariantCount} -> ${newVariantCount}`);
      }
      if (oldImageCount !== newImageCount) {
        changeItems.push(`Pictures: ${oldImageCount} -> ${newImageCount}`);
      }
      if (!isAdminPremadeEditor && oldRestrictedCount !== newRestrictedCount) {
        changeItems.push(`Restricted boxes: ${oldRestrictedCount} -> ${newRestrictedCount}`);
      }
      changeItems.push(`Parcel dimensions: ${maxLengthCm} x ${maxWidthCm} x ${maxDepthCm} cm`);
      if (nextIsSale) {
        changeItems.push(`Sale: now on sale from £${baseline.toFixed(2)}.`);
      } else if (oldOriginal > 0 && newPrice >= oldOriginal) {
        changeItems.push("Sale: removed.");
      }

      setAdminSaving(true);
      try {
        const response = await fetch(`/admin/products/${existingProductId}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCsrfToken(),
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Unable to update product.");
        }

        const updatedSlug =
          typeof result?.slug === "string" && result.slug.trim().length > 0
            ? result.slug.trim()
            : product.slug;

        setAdminSaveSuccess({
          mode: "edited",
          name: newName || "Product",
          slug: updatedSlug,
          changes: changeItems.length ? changeItems : ["No visible field changes."],
        });
        if (updatedSlug !== product.slug) {
          const params = new URLSearchParams({ product_mode: "1" });
          router.get(`/product/${encodeURIComponent(updatedSlug)}?${params.toString()}`);
        } else {
          router.reload({ only: ["product"] });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update product.");
      } finally {
        setAdminSaving(false);
      }
      return;
    }

    const errors = validateAdminProductDraft();
    setAdminErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError, { position: "top-center", autoClose: 3200 });
      }
      return;
    }

    const variantMetrics = adminColours.flatMap((colour) => colour.variants.map((variant) => getVariantShippingMetrics(variant)));
    const maxLengthCm = Math.max(...variantMetrics.map((item) => item.lengthCm));
    const maxWidthCm = Math.max(...variantMetrics.map((item) => item.widthCm));
    const maxDepthCm = Math.max(...variantMetrics.map((item) => item.depthCm));

    const payload = {
      name: adminName.trim(),
      brand: product.brand || "Brand",
      price: Number(adminPrice),
      description: adminDescription.trim(),
      category_id: Number(adminEditor.categoryId),
      is_premade: isAdminPremadeEditor,
      dimensions: {
        length: maxLengthCm,
        width: maxWidthCm,
        height: maxDepthCm,
        unit: "cm",
      },
      colours: adminColours.map((colour) => ({
        name: colour.name.trim(),
        images: colour.imageUrls.map((url) => url.trim()).filter(Boolean),
        image_boxes: buildAdminImageBoxesPayload(colour),
        variants: colour.variants.map((variant) => ({
          size: variant.size.trim().toUpperCase(),
          stock: Math.max(0, Math.floor(Number(variant.stock))),
          weight: getVariantShippingMetrics(variant).weightKg,
        })),
      })),
    };

    setAdminSaving(true);
    try {
      const response = await fetch("/admin/products/create-layout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to save product.");
      }

      const createdName = String(result?.product?.name || adminName.trim() || "Product");
      const createdSlug = typeof result?.product?.slug === "string" ? result.product.slug : undefined;
      setAdminSaveSuccess({
        mode: "created",
        name: createdName,
        slug: createdSlug,
        changes: [
          `Base price: £${Number(adminPrice || 0).toFixed(2)}`,
          `Colours added: ${adminColours.length}`,
          `Variants added: ${adminColours.reduce((sum, colour) => sum + colour.variants.length, 0)}`,
          ...(!isAdminPremadeEditor
            ? [
                `Restricted boxes saved: ${adminColours.reduce(
                  (sum, colour) => sum + Object.keys(buildAdminImageBoxesPayload(colour)).length,
                  0
                )}`,
              ]
            : ["Pre-made mode: restricted boxes skipped."]),
        ],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save product.");
    } finally {
      setAdminSaving(false);
    }
  };

  const goToCreatedProduct = () => {
    if (!adminSaveSuccess?.slug) return;
    router.get(`/product/${encodeURIComponent(adminSaveSuccess.slug)}`);
  };

  const startAnotherProduct = () => {
    if (adminEditor?.categoryId) {
      const params = new URLSearchParams({
        category_id: String(adminEditor.categoryId),
      });
      if (adminEditor.categorySlug) {
        params.set("category_slug", adminEditor.categorySlug);
      }
      router.get(`/admin/products/create-layout?${params.toString()}`);
      return;
    }
    window.location.reload();
  };

  const restrictedEditorDraftKey = restrictedBoxEditor
    ? restrictedDraftKey(restrictedBoxEditor.colourId, restrictedBoxEditor.imageUrl)
    : null;
  const restrictedEditorCurrentBox = useMemo(() => {
    if (!restrictedBoxEditor || !restrictedEditorDraftKey) return RESTRICTED_BOX_DEFAULT;
    const colour = adminColours.find((item) => item.id === restrictedBoxEditor.colourId);
    return normalizeRestrictedBox(
      restrictedBoxDrafts[restrictedEditorDraftKey] ??
        colour?.imageBoxes?.[restrictedBoxEditor.imageUrl] ??
        RESTRICTED_BOX_DEFAULT
    );
  }, [adminColours, restrictedBoxDrafts, restrictedBoxEditor, restrictedEditorDraftKey]);

  return (
    <AuthenticatedLayout>
      <Head title={isAdminEditor ? "Admin Product Creator" : effectiveName} />
      <SizeGuideProvider initialGender={sizeGuideGender}>
        <ProductQuoteProvider
          source={{
            productName: effectiveName,
            productSlug: product.slug,
            colour: selectedColour || "Default",
            size: selectedSize || "M",
            sizeCategory: quoteSizeCategory,
            basePrice: effectivePrice,
            previewImage: displayImages[0] || effectiveProductImages?.[0] || "/images/no-image.png",
            isLoggedIn: isSignedIn,
            accountEmail: authEmail,
            accountName: authName,
          }}
        >
          <div className="w-full pb-16 pt-6">
          {isAdminEditor ? (
            <div className="mx-4 mb-4 rounded-2xl border-2 border-[#C8951E] bg-[#FFF8E8] p-4 sm:mx-6 lg:mx-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A5F00]">Admin Only</p>
              <h2 className="mt-1 text-lg font-extrabold text-[#2A241B]">PRODUCT EDIT MODE</h2>
              <div className="mt-3 grid max-w-[520px] grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsAdminPremadeEditor(false)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    !isAdminPremadeEditor
                      ? "border-[#A77A16] bg-[#FDE9BA] text-[#3A2A11]"
                      : "border-[#D7BE84] bg-[#FFFCF4] text-[#7B6530]"
                  }`}
                >
                  Designable Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminPremadeEditor(true)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isAdminPremadeEditor
                      ? "border-[#A77A16] bg-[#FDE9BA] text-[#3A2A11]"
                      : "border-[#D7BE84] bg-[#FFFCF4] text-[#7B6530]"
                  }`}
                >
                  Pre-made Design
                </button>
              </div>
              <p className="mt-1 text-sm text-[#5D4A1E]">
                {isAdminPremadeEditor
                  ? "Pre-made mode: set product details, colours, sizes, quantities, and parcel dimensions, then save."
                  : "First set product details, colours, sizes, quantities, dimensions, then set restricted box size for each image, then save."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminVariantModalTab("editor");
                    setIsVariantModalOpen(true);
                  }}
                  className="rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-4 py-2 text-sm font-semibold text-[#7B6530]"
                >
                  {isAdminPremadeEditor
                    ? "Edit Colours, Sizes, Quantities & Parcel"
                    : "Edit Colours, Sizes, Quantities, Parcel & Restricted Box"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdminProduct}
                  disabled={adminSaving}
                  className="rounded-xl bg-[#1F1A12] px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#372D1C] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {adminSaving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </div>
          ) : null}
          {!isAdminEditor && isAdminUser ? (
            <div className="mx-4 mb-4 flex justify-end sm:mx-6 lg:mx-10">
              <Link
                href={`/product/${encodeURIComponent(product.slug)}?product_mode=1`}
                className="inline-flex items-center rounded-xl border border-[#D7BE84] bg-[#FFF8E8] px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:border-[#C8951E] hover:bg-[#FFF2D7]"
              >
                Start Editing Page
              </Link>
            </div>
          ) : null}

          <nav className="mb-4 overflow-x-auto whitespace-nowrap px-4 text-sm text-[#6D6149] md:px-6 lg:px-10">
            {breadcrumbTrailWithProduct.map((crumb, index) => {
              const isLast = index === breadcrumbTrailWithProduct.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  {isLast ? (
                    <span className="font-semibold text-[#2B2417]">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="transition hover:text-[#2B2417]">
                      {crumb.label}
                    </Link>
                  )}
                  {!isLast ? <span className="mx-2 text-[#9A8B6A]">&gt;</span> : null}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="grid grid-cols-1 gap-6 px-4 md:px-6 lg:grid-cols-[minmax(0,1.6fr)_420px] lg:gap-10 lg:px-10">
            <section className="min-w-0">
              {isAdminEditor ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {displayImages.map((img, i) => (
                    <div key={`${img}-${i}`} className="group relative h-[260px] w-full overflow-hidden bg-[#E5E7EB] sm:h-[360px] lg:h-[500px]">
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxIndex(i);
                          setIsLightboxOpen(true);
                        }}
                        className="h-full w-full cursor-zoom-in text-left"
                      >
                        <img loading="lazy" decoding="async"
                          src={img}
                          alt={`${effectiveName}-admin-${i + 1}`}
                          className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                        />
                        <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAdminImage(i)}
                        className="absolute right-2 top-2 z-10 rounded-full border border-white/80 bg-black/55 p-1.5 text-white transition hover:bg-black/75"
                        aria-label={`Remove image ${i + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {!isAdminPremadeEditor
                        ? (() => {
                            const targetIndex = selectedAdminColourIndex >= 0 ? selectedAdminColourIndex : 0;
                            const targetColour = adminColours[targetIndex];
                            const imageUrl = String(img || "").trim();
                            const hasRestrictedBox =
                              Boolean(targetColour) && Boolean(imageUrl) && isValidRestrictedBox(targetColour.imageBoxes[imageUrl]);
                            return (
                              <button
                                type="button"
                                onClick={() => openRestrictedBoxEditor(i)}
                                className={`absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition ${
                                  hasRestrictedBox
                                    ? "bg-[#16A34A]/95 text-white hover:bg-[#15803D]"
                                    : "bg-[#B45309]/95 text-white hover:bg-[#92400E]"
                                }`}
                              >
                                {hasRestrictedBox ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                                {hasRestrictedBox ? "Restricted Box Added · Edit" : "Add Restricted Box"}
                              </button>
                            );
                          })()
                        : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={openImagePicker}
                    className="group relative h-[260px] w-full overflow-hidden border-2 border-dashed border-[#C8951E] bg-[#FFF8E8] text-left sm:h-[360px] lg:h-[500px]"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-[#8A5F00]">
                      <Plus className="h-8 w-8" />
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em]">Upload Images</p>
                      <p className="mt-1 text-sm font-semibold">{uploadingImage ? "Uploading..." : "Click to add images"}</p>
                      <p className="mt-1 text-[11px]">Same size as product image cards</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div>
                  {displayImages.length > 0 ? (
                    <>
                      <div className="relative h-[320px] w-full overflow-hidden bg-[#E5E7EB] sm:h-[420px] lg:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxIndex(mobileImageIndex);
                            setIsLightboxOpen(true);
                          }}
                          className="h-full w-full cursor-zoom-in text-left"
                          aria-label={`Open image ${mobileImageIndex + 1} in large view`}
                        >
                          <img
                            loading="lazy"
                            decoding="async"
                            src={displayImages[mobileImageIndex]}
                            alt={`${effectiveName}-${mobileImageIndex + 1}`}
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        </button>
                        {displayImages.length > 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setMobileImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
                              }
                              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMobileImageIndex((prev) => (prev + 1) % displayImages.length)}
                              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white"
                              aria-label="Next image"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </>
                        ) : null}
                        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-black/50 px-3 py-1 text-xs font-semibold text-white">
                          {mobileImageIndex + 1} / {displayImages.length}
                        </p>
                      </div>

                      <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid">
                        {displayImages.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setLightboxIndex(i);
                              setIsLightboxOpen(true);
                            }}
                            className="group relative h-[260px] w-full cursor-zoom-in overflow-hidden bg-[#E5E7EB] text-left sm:h-[360px] lg:h-[500px]"
                            aria-label={`Open image ${i + 1} in large view`}
                          >
                            <img loading="lazy" decoding="async"
                              src={img}
                              alt={`${effectiveName}-${i + 1}`}
                              className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                            />
                            <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                            <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/35 opacity-0 transition group-hover:opacity-100">
                              <Plus className="h-5 w-5 text-white" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[320px] items-center justify-center bg-[#E5E7EB] text-[#7D6E4F] sm:h-[420px]">
                      No images available
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="min-w-0">
              {isAdminEditor && editingField === "name" ? (
                <input
                  autoFocus
                  type="text"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  onBlur={() => setEditingField(null)}
                  className="mt-2 w-full rounded-lg border border-[#DCC99D] bg-white px-3 py-2 text-3xl font-extrabold leading-tight text-[#1F1A12] sm:text-4xl"
                  placeholder="Product Title"
                />
              ) : (
                <h1
                  className={`mt-2 text-3xl font-extrabold leading-tight text-[#1F1A12] sm:text-4xl ${
                    isAdminEditor ? "cursor-text hover:text-[#3D2F1B]" : ""
                  }`}
                  onClick={() => {
                    if (isAdminEditor) setEditingField("name");
                  }}
                >
                  {effectiveName}
                </h1>
              )}

              {!isAdminEditor ? (
                <button
                  type="button"
                  onClick={() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-[#5A4A2B] hover:text-[#2D2415]"
                >
                  <span className="inline-flex items-center gap-1 text-[#C8941C]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className={`h-4 w-4 ${idx < Math.round(rating) ? "fill-current" : ""}`} />
                    ))}
                  </span>
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                  <span className="text-[#7E6D4B]">({reviewCount.toLocaleString()} reviews)</span>
                </button>
              ) : null}

              {isAdminEditor && editingField === "price" ? (
                <input
                  autoFocus
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adminPrice}
                  onChange={(event) => setAdminPrice(event.target.value)}
                  onBlur={() => setEditingField(null)}
                  className="mt-5 w-full max-w-[220px] rounded-lg border border-[#DCC99D] bg-white px-3 py-2 text-3xl font-bold text-[#17120A]"
                />
              ) : (
                <p
                  className={`mt-5 text-3xl font-bold ${
                    hasAdminSalePreview || isPublicSale ? "text-[#B42318]" : "text-[#17120A]"
                  } ${isAdminEditor ? "cursor-text hover:text-[#3D2F1B]" : ""}`}
                  onClick={() => {
                    if (isAdminEditor) setEditingField("price");
                  }}
                >
                  £{effectivePrice.toFixed(2)}
                </p>
              )}
              {hasAdminSalePreview ? (
                <p className="mt-1 text-lg text-[#9B8B6A] line-through">£{basePriceForSale.toFixed(2)}</p>
              ) : null}
              {isPublicSale ? (
                <p className="mt-1 text-lg text-[#9B8B6A] line-through">£{publicOriginalPrice.toFixed(2)}</p>
              ) : null}
              <p className="mt-1 text-xs font-medium text-[#7A6742]">Price may vary depending on your final design.</p>

              {effectiveColourProducts.length > 0 ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6D5A34]">
                    Colour: <span className="text-[#2B2417]">{selectedColour}</span>
                    </p>
                    {isAdminEditor ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminVariantModalTab("editor");
                          setIsVariantModalOpen(true);
                        }}
                        className="rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-3 py-1 text-xs font-semibold text-[#7B6530]"
                      >
                        Edit Colours
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {effectiveColourProducts.map((cp) => (
                      <button
                        key={cp.colour}
                        type="button"
                        onClick={() => setSelectedColour(cp.colour)}
                        className={`overflow-hidden rounded-xl border transition ${
                          selectedColour === cp.colour
                            ? "border-[#B4872A] ring-2 ring-[#E5D29F]"
                            : "border-[#D8CBB0] hover:border-[#BFA571]"
                        }`}
                      >
                        <div className="h-14 w-14 bg-[#F2EBDD]">
                          {cp.images?.[0] ? (
                            <img loading="lazy" decoding="async" src={cp.images[0]} alt={cp.colour} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-[#EFE6D2]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6D5A34]">Select size</p>
                  <SizeGuideButton />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {STANDARD_SIZES.map((size) => {
                    const inStock = isSizeInStock(size);
                    const isSelected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          setShowSizeError(false);
                        }}
                        className={`relative rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? inStock
                              ? "border-[#B4872A] bg-[#FFF4DC] text-[#2D2415]"
                              : "border-[#5F5341] bg-[#E2DDD4] text-[#3F372B]"
                            : inStock
                              ? "border-[#D7C8AA] bg-white text-[#2B2417] hover:border-[#B89C67]"
                              : "border-[#BFB6A8] bg-[#D8D4CC] text-[#5F584C]"
                        }`}
                      >
                        {size}
                        {!inStock ? (
                          <span className="pointer-events-none absolute inset-1 block rounded-lg border border-[#5D5548]/40">
                            <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rotate-[-20deg] bg-[#5B544A]" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {showSizeError ? <p className="mt-2 text-sm font-semibold text-[#A12525]">Please select a size</p> : null}
                {!selectedSizeInStock ? (
                  <p className="mt-2 text-sm text-[#7C4A1D]">Selected size is currently out of stock.</p>
                ) : null}
              </div>

              {!isAdminEditor && !isPremadeProduct ? (
                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6D5A34]">
                    Design type <span className="text-[#A12525]">*</span>
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {DESIGN_TYPE_OPTIONS.map((option) => {
                      const isSelected = selectedDesignType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedDesignType(option.value)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-[#B4872A] bg-[#FFF4DC] text-[#2D2415]"
                              : "border-[#D7C8AA] bg-white text-[#2B2417] hover:border-[#B89C67]"
                          }`}
                        >
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="mt-0.5 text-xs text-[#7E6D4B]">{option.helper}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-[#7A6742]">
                    Selected: <span className="font-semibold text-[#2D2415]">{designTypeLabel(selectedDesignType)}</span>
                  </p>
                </div>
              ) : null}

              {!isAdminEditor ? (
                <>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={notifyLoading}
                    className="mt-7 w-full rounded-full bg-[#1F1A12] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#372D1C] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {notifyLoading ? "Please wait..." : primaryCtaLabel}
                  </button>

                  {!isPremadeProduct ? (
                    <>
                      <button
                        type="button"
                        onClick={handleWishlist}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-6 py-3 font-semibold text-[#7B6530] transition-colors hover:bg-[#F8E9C9]"
                      >
                        <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
                        {inWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
                      </button>

                      <GetQuoteButton />
                    </>
                  ) : null}
                </>
              ) : (
                <div className="mt-7 rounded-2xl border border-[#D7BE84] bg-[#FFF9EA] p-3 text-sm text-[#5E4A22]">
                  {isAdminPremadeEditor
                    ? "Admin preview mode: complete pictures, colours, sizes, quantities, and parcel size before saving."
                    : "Admin preview mode: complete pictures, colours, sizes, quantities, parcel size, and restricted box per image before saving."}
                </div>
              )}

              <div className="mt-8 space-y-3 border-t border-[#E8DDCA] pt-6">
                {[
                  {
                    key: "description" as const,
                    title: "Product Description",
                    content:
                      effectiveDescription ||
                      "A premium everyday essential built for comfort, durability, and custom styling.",
                  },
                  {
                    key: "delivery" as const,
                    title: "Delivery",
                    content:
                      "Standard delivery: 2-4 working days (Evri / Royal Mail). Express delivery: 1 working days (DPD) . Free delivery over £50. Orders are tracked and dispatched Monday to Saturday.",
                  },
                  {
                    key: "returns" as const,
                    title: "Returns",
                    content:
                      "Returns accepted within 30 days for unworn items in original condition. Customised products can only be returned if faulty. Refunds are processed to the original payment method.",
                  },
                ].map((item) => {
                  const isOpen = openAccordion === item.key;
                  return (
                    <div key={item.key} className="overflow-hidden rounded-2xl border border-[#E6DCC8] bg-[#FBF8F1]">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion((prev) => (prev === item.key ? null : item.key))}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm font-bold uppercase tracking-[0.1em] text-[#2D2415]">{item.title}</span>
                        <ChevronDown className={`h-4 w-4 text-[#786748] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <div
                        className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden">
                          {isAdminEditor && item.key === "description" && editingField === "description" ? (
                            <textarea
                              autoFocus
                              value={adminDescription}
                              onChange={(event) => setAdminDescription(event.target.value)}
                              onBlur={() => setEditingField(null)}
                              rows={4}
                              className="mx-4 mb-4 mt-1 w-[calc(100%-2rem)] rounded-lg border border-[#DCC99D] bg-white px-3 py-2 text-sm text-[#4F412A]"
                            />
                          ) : (
                            <p
                              className={`px-4 pb-4 text-sm leading-relaxed text-[#4F412A] ${
                                isAdminEditor && item.key === "description" ? "cursor-text hover:text-[#2E2516]" : ""
                              }`}
                              onClick={() => {
                                if (isAdminEditor && item.key === "description") setEditingField("description");
                              }}
                            >
                              {item.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {!isAdminEditor ? (
          <section ref={reviewsRef} className="mx-4 mt-12 rounded-3xl border border-[#E5D9C4] bg-[#FFFCF7] p-5 sm:mx-6 sm:p-8 lg:mx-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE4D0] pb-4">
              <h2 className="text-2xl font-extrabold text-[#1E1A12]">Customer Reviews</h2>
              <p className="text-sm text-[#6C5E43]">
                {reviewCount > 0 ? `${rating.toFixed(1)} out of 5 based on ${reviewCount.toLocaleString()} reviews` : "No reviews yet"}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {reviewRows.length > 0 ? (
                reviewRows.map((review, idx) => (
                  <article key={`${review.id}-${idx}`} className="rounded-2xl border border-[#E8DDC8] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-[#E7DAC0] bg-[#FFF9EC]">
                          {review.user?.avatar_url ? (
                            <img loading="lazy" decoding="async" src={review.user.avatar_url} alt={review.user.username || "Customer"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#8A6D2B]">
                              {String(review.user?.username || "C").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2B2417]">@{review.user?.username || "customer"}</p>
                          <p className="mt-0.5 text-xs text-[#7D6F54]">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                            {review.is_verified_purchase ? " • Verified purchase" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[#C8941C]">
                        {renderRatingStars(Number(review.rating || 0))}
                        <span className="ml-1 text-xs font-semibold text-[#7E6A3C]">{Number(review.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A3F2C]">{review.message}</p>
                    {Array.isArray(review.images) && review.images.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {review.images.slice(0, 4).map((imageUrl, imageIndex) => (
                          <a
                            key={`${review.id}-image-${imageIndex}`}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-lg border border-[#E8DDC8] bg-[#FFFDF7]"
                          >
                            <img loading="lazy" decoding="async"
                              src={imageUrl}
                              alt={`Review image ${imageIndex + 1}`}
                              className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-[#E8DDC8] bg-white p-4 text-sm text-[#6C5E43]">
                  No reviews yet.
                </article>
              )}
            </div>
          </section>
          ) : null}

          {!isAdminEditor ? (
            <>
              <ProductRailSection
                title="Recommended For You"
                products={recommendedProducts}
                emptyText="No recommendations available yet."
              />

              <ProductRailSection
                title="Recently Viewed"
                products={recentlyViewedProducts}
                emptyText="No recently viewed products yet."
              />
            </>
          ) : null}
          </div>

        {isLightboxOpen && displayImages.length > 0 ? (
          <div className="fixed inset-0 z-[120] bg-black/85 p-4 md:p-6" role="dialog" aria-modal="true">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full border border-white/40 bg-black/40 p-2 text-white transition hover:bg-black/60"
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-full w-full max-w-[1500px] items-center gap-3 sm:gap-4">
              <aside className="hidden h-[88vh] w-24 shrink-0 overflow-y-auto rounded-xl bg-black/35 p-2 md:block">
                <div className="space-y-2">
                  {displayImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className={`relative h-20 w-full overflow-hidden rounded-md border ${
                        lightboxIndex === index ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Show image ${index + 1}`}
                    >
                      <img loading="lazy" decoding="async" src={img} alt={`${effectiveName}-thumb-${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </aside>

              <div className="relative flex h-[82dvh] min-w-0 flex-1 items-center justify-center rounded-2xl bg-[#E5E7EB] p-3 sm:h-[88vh] sm:p-4">
                <img loading="lazy" decoding="async"
                  src={displayImages[lightboxIndex]}
                  alt={`${effectiveName}-zoom-${lightboxIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}

        {isAdminEditor ? (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAdminImagePicked}
            />

            {isVariantModalOpen ? (
              <div className="fixed inset-0 z-[125] bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true">
                <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#E8DAB8] bg-[#FFFCF6] shadow-[0_30px_70px_rgba(33,25,13,0.35)]">
                  <header className="flex items-center justify-between border-b border-[#E9DFC8] bg-gradient-to-r from-[#FFF2D7] via-[#FFF8EA] to-[#FDF2D7] px-5 py-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">Admin Only</p>
                      <h3 className="text-lg font-black text-[#271D0F]">
                        {adminVariantModalTab === "help"
                          ? "Parcel Size Help"
                          : isAdminPremadeEditor
                            ? "Colours, Sizes, Quantities & Parcel"
                            : "Colours, Sizes, Quantities, Parcel & Restricted Box"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminVariantModalTab("editor");
                        setIsVariantModalOpen(false);
                      }}
                      className="rounded-full border border-[#D9C79E] bg-white/80 p-2 text-[#5C4B27] transition hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </header>

                  <div className={`${adminVariantModalTab === "editor" ? "" : "hidden"} border-b border-[#E9DFC8] bg-[#FFF8EA] px-5 py-3`}>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7A5F2A]">How to fill this form</p>
                    <p className="mt-1 text-sm text-[#5E4A22]">
                      {isAdminPremadeEditor
                        ? '1. Choose a colour from the dropdown or select "Add new colour". 2. Upload one or more images for that colour. 3. Add size rows with quantity and parcel size. 4. Use Manual if needed. 5. Click Done, then Save Product.'
                        : '1. Choose a colour from the dropdown or select "Add new colour". 2. Upload one or more images for that colour. 3. Add size rows with quantity and parcel size. 4. Set and save restricted box for every uploaded image. 5. Use Manual if needed. 6. Click Done, then Save Product.'}
                    </p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setAdminVariantModalTab("help")}
                        className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530]"
                      >
                        <span className="inline-flex items-center gap-1">
                          <CircleHelp className="h-3.5 w-3.5" />
                          Help With Parcel Sizes
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className={`${adminVariantModalTab === "editor" ? "flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" : "hidden"}`}>
                    {adminColours.map((colour, colourIndex) => {
                      const isOpen = openAdminColourIds.includes(colour.id);
                      const previewName = getPreviewColourName(colour, colourIndex);
                      const cleanImages = colour.imageUrls.map((url) => url.trim()).filter(Boolean);
                      const savedRestrictedCount = cleanImages.reduce(
                        (sum, imageUrl) => (isValidRestrictedBox(colour.imageBoxes[imageUrl]) ? sum + 1 : sum),
                        0
                      );
                      return (
                      <section key={colour.id} className="rounded-2xl border border-[#E8DCC3] bg-white">
                        <div className="flex items-center justify-between gap-2 border-b border-[#F0E6D2] px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleAdminColourTab(colour.id)}
                            className="inline-flex items-center gap-2 text-left"
                          >
                            <ChevronDown className={`h-4 w-4 text-[#786748] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5A34]">
                              Colour {colourIndex + 1} - {previewName}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAdminColour(colour.id)}
                            className="rounded-md border border-[#E3B9B9] bg-[#FFF3F3] px-2 py-1 text-[11px] font-semibold text-[#8C3232]"
                          >
                            Remove Colour
                          </button>
                        </div>

                        <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className={`overflow-hidden ${isOpen ? "p-4" : "p-0"}`}>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto]">
                          <select
                            value={
                              !colour.name.trim()
                                ? ""
                                : isCommonColourOption(colour.name)
                                  ? COMMON_COLOUR_OPTIONS.find(
                                      (option) => option.toLowerCase() === colour.name.trim().toLowerCase()
                                    ) || colour.name.trim()
                                  : "__custom__"
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              updateAdminColour(colour.id, (item) => ({
                                ...item,
                                name: value === "__custom__" ? (isCommonColourOption(item.name) ? "" : item.name) : value,
                              }));
                            }}
                            className="rounded-lg border border-[#DCC99D] px-3 py-2 text-sm"
                          >
                            <option value="">Select a colour</option>
                            {COMMON_COLOUR_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="__custom__">Add new colour</option>
                          </select>
                          <input
                            type="text"
                            value={isCommonColourOption(colour.name) ? "" : colour.name}
                            onChange={(event) =>
                              updateAdminColour(colour.id, (item) => ({ ...item, name: event.target.value }))
                            }
                            placeholder="Type new colour name"
                            disabled={!(!colour.name.trim() || !isCommonColourOption(colour.name))}
                            className="rounded-lg border border-[#DCC99D] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-[#F6F1E5] disabled:text-[#9A8F78]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColour(getPreviewColourName(colour, colourIndex));
                              setIsVariantModalOpen(false);
                              openImagePicker();
                            }}
                            className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530]"
                          >
                            Upload Image
                          </button>
                        </div>
                        {adminErrors[`colour.${colour.id}.name`] ? (
                          <p className="mt-1 text-xs text-[#8C3232]">{adminErrors[`colour.${colour.id}.name`]}</p>
                        ) : null}
                        {adminErrors[`colour.${colour.id}.images`] ? (
                          <p className="mt-1 text-xs text-[#8C3232]">{adminErrors[`colour.${colour.id}.images`]}</p>
                        ) : null}

                        {!isAdminPremadeEditor ? (
                          <div className="mt-3 rounded-xl border border-[#E8DABF] bg-[#FFF9EC] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7A5F2A]">
                                Restricted Boxes
                              </p>
                              <p className="text-xs font-semibold text-[#6A5428]">
                                Saved: {savedRestrictedCount}/{cleanImages.length}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-[#6A5428]">
                              Use the “Add Restricted Box” label on each product image to add or edit boxes.
                            </p>
                            {adminErrors[`colour.${colour.id}.image_boxes`] ? (
                              <p className="mt-2 text-xs text-[#8C3232]">{adminErrors[`colour.${colour.id}.image_boxes`]}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl border border-[#E8DABF] bg-[#FFF9EC] p-3 text-xs text-[#6A5428]">
                            Pre-made mode enabled: restricted boxes are not required for these images.
                          </div>
                        )}

                        <div className="mt-3 rounded-lg border border-[#EFE5D2] bg-[#FFFCF7] p-2">
                          <div className="mb-2 hidden grid-cols-[1fr_1fr_1.5fr_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7A6742] sm:grid">
                            <span>Size</span>
                            <span>Quantity</span>
                            <span>Parcel Size</span>
                            <span />
                          </div>
                          <div className="space-y-2">
                            {colour.variants.map((variant) => (
                              <div key={variant.id} className="rounded-lg border border-[#EFE3CC] bg-white p-2">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
                                  <select
                                    value={variant.size}
                                    onChange={(event) =>
                                      updateAdminColour(colour.id, (item) => ({
                                        ...item,
                                        variants: item.variants.map((row) =>
                                          row.id === variant.id ? { ...row, size: event.target.value.toUpperCase() } : row
                                        ),
                                      }))
                                    }
                                    className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                  >
                                    {STANDARD_SIZES.map((size) => (
                                      <option key={size} value={size}>
                                        {size}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={variant.stock}
                                    onChange={(event) =>
                                      updateAdminColour(colour.id, (item) => ({
                                        ...item,
                                        variants: item.variants.map((row) =>
                                          row.id === variant.id ? { ...row, stock: event.target.value } : row
                                        ),
                                      }))
                                    }
                                    className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                  />
                                  <div className="space-y-2">
                                    <select
                                      value={variant.parcelSize}
                                      onChange={(event) =>
                                        updateAdminColour(colour.id, (item) => ({
                                          ...item,
                                          variants: item.variants.map((row) =>
                                            row.id === variant.id
                                              ? { ...row, parcelSize: event.target.value as ParcelSizeKey }
                                              : row
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                    >
                                      <option value="very_small">Very Small</option>
                                      <option value="small">Small</option>
                                      <option value="medium">Medium</option>
                                      <option value="large">Large</option>
                                      <option value="manual">Manual</option>
                                    </select>
                                    {variant.parcelSize !== "manual" ? (
                                      <p className="rounded-md bg-[#FFF4DC] px-2 py-1 text-[11px] text-[#6B5325]">
                                        Max {PARCEL_SIZE_PRESETS[variant.parcelSize].maxWeightKg}kg ·{" "}
                                        {PARCEL_SIZE_PRESETS[variant.parcelSize].lengthCm}x
                                        {PARCEL_SIZE_PRESETS[variant.parcelSize].widthCm}x
                                        {PARCEL_SIZE_PRESETS[variant.parcelSize].depthCm}cm
                                      </p>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAdminVariant(colour.id, variant.id)}
                                    className="rounded-lg border border-[#E3B9B9] bg-[#FFF3F3] px-2 py-2 text-xs font-semibold text-[#8C3232] sm:px-2"
                                  >
                                    Remove
                                  </button>
                                </div>
                                {variant.parcelSize === "manual" ? (
                                  <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={variant.manualWeightKg}
                                      onChange={(event) =>
                                        updateAdminColour(colour.id, (item) => ({
                                          ...item,
                                          variants: item.variants.map((row) =>
                                            row.id === variant.id ? { ...row, manualWeightKg: event.target.value } : row
                                          ),
                                        }))
                                      }
                                      placeholder="Weight (kg)"
                                      className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                    />
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={variant.manualLengthCm}
                                      onChange={(event) =>
                                        updateAdminColour(colour.id, (item) => ({
                                          ...item,
                                          variants: item.variants.map((row) =>
                                            row.id === variant.id ? { ...row, manualLengthCm: event.target.value } : row
                                          ),
                                        }))
                                      }
                                      placeholder="Length (cm)"
                                      className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                    />
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={variant.manualWidthCm}
                                      onChange={(event) =>
                                        updateAdminColour(colour.id, (item) => ({
                                          ...item,
                                          variants: item.variants.map((row) =>
                                            row.id === variant.id ? { ...row, manualWidthCm: event.target.value } : row
                                          ),
                                        }))
                                      }
                                      placeholder="Width (cm)"
                                      className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                    />
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={variant.manualDepthCm}
                                      onChange={(event) =>
                                        updateAdminColour(colour.id, (item) => ({
                                          ...item,
                                          variants: item.variants.map((row) =>
                                            row.id === variant.id ? { ...row, manualDepthCm: event.target.value } : row
                                          ),
                                        }))
                                      }
                                      placeholder="Depth (cm)"
                                      className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                                    />
                                  </div>
                                ) : null}
                                {adminErrors[`colour.${colour.id}.variant.${variant.id}.parcel`] ? (
                                  <p className="mt-2 text-xs text-[#8C3232]">
                                    {adminErrors[`colour.${colour.id}.variant.${variant.id}.parcel`]}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addAdminVariant(colour.id)}
                            className="mt-2 rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530]"
                          >
                            Add Size Row
                          </button>
                        </div>
                        </div>
                        </div>
                      </section>
                    )})}
                  </div>

                  <footer className={`${adminVariantModalTab === "editor" ? "" : "hidden"} border-t border-[#E9DFC8] bg-[#FFF9EA] px-5 py-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={addAdminColour}
                        className="rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-4 py-2 text-sm font-semibold text-[#7B6530]"
                      >
                        Add Colour
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminVariantModalTab("editor");
                            setIsVariantModalOpen(false);
                          }}
                          className="rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530]"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                    {adminErrors.colours ? <p className="mt-2 text-xs text-[#8C3232]">{adminErrors.colours}</p> : null}
                  </footer>

                  <div className={`${adminVariantModalTab === "help" ? "grid flex-1 gap-3 overflow-y-auto p-5 md:grid-cols-2" : "hidden"}`}>
                    {(Object.keys(PARCEL_SIZE_PRESETS) as Array<Exclude<ParcelSizeKey, "manual">>).map((key) => {
                      const item = PARCEL_SIZE_PRESETS[key];
                      return (
                        <article key={key} className="rounded-2xl border border-[#E6D8BD] bg-white p-4">
                          <img loading="lazy" decoding="async"
                            src={PARCEL_HELP_IMAGES[key]}
                            alt={`${item.label} parcel size visual`}
                            className="h-24 w-44 rounded-xl object-cover"
                          />
                          <p className="mt-3 text-sm font-black text-[#2D220F]">
                            {item.label}
                            {key === "very_small" ? " (Postable / XS)" : ""}
                          </p>
                          <p className="mt-1 text-sm text-[#5E4A22]">Max weight: {item.maxWeightKg}kg</p>
                          <p className="text-sm text-[#5E4A22]">
                            Max: {item.lengthCm} x {item.widthCm} x {item.depthCm} cm
                          </p>
                          <p className="mt-2 text-xs text-[#6F5A2E]">{item.description}</p>
                        </article>
                      );
                    })}
                    <article className="rounded-2xl border border-dashed border-[#D6C39A] bg-[#FFF8E9] p-4 md:col-span-2">
                      <p className="text-sm font-black text-[#2D220F]">Manual Option</p>
                      <p className="mt-1 text-xs text-[#6F5A2E]">
                        Select Manual in the row if none of the preset sizes fit. Enter custom weight (kg) and dimensions
                        (length, width, depth in cm).
                      </p>
                    </article>
                  </div>

                  <footer className={`${adminVariantModalTab === "help" ? "" : "hidden"} border-t border-[#E9DFC8] bg-[#FFF9EA] px-5 py-4`}>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminVariantModalTab("editor")}
                        className="rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530]"
                      >
                        Back To Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminVariantModalTab("editor");
                          setIsVariantModalOpen(false);
                        }}
                        className="rounded-xl bg-[#1F1A12] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Close
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            ) : null}

            {!isAdminPremadeEditor && restrictedBoxEditor ? (
              <div className="fixed inset-0 z-[130] bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true">
                <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#E8DAB8] bg-[#FFFCF6] shadow-[0_30px_70px_rgba(33,25,13,0.35)]">
                  <header className="flex items-center justify-between border-b border-[#E9DFC8] bg-gradient-to-r from-[#FFF2D7] via-[#FFF8EA] to-[#FDF2D7] px-5 py-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">Admin Only</p>
                      <h3 className="text-lg font-black text-[#271D0F]">Add Restricted Box</h3>
                      <p className="text-xs text-[#6D5A34]">
                        {restrictedBoxEditor.colourName} · Image {restrictedBoxEditor.imageIndex + 1} of{" "}
                        {restrictedBoxEditor.imageCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeRestrictedBoxEditor}
                      className="rounded-full border border-[#D9C79E] bg-white/80 p-2 text-[#5C4B27] transition hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                      <div
                        ref={(node) => {
                          if (restrictedEditorDraftKey) {
                            restrictedBoxCanvasRefs.current[restrictedEditorDraftKey] = node;
                          }
                        }}
                        className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-[#DCC99D] bg-[#F4EFE2]"
                      >
                        <img loading="lazy" decoding="async"
                          src={restrictedBoxEditor.imageUrl}
                          alt={`${restrictedBoxEditor.colourName}-restricted-editor`}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                        <div
                          role="button"
                          tabIndex={0}
                          onMouseDown={(event) =>
                            beginRestrictedBoxDrag(
                              event,
                              restrictedBoxEditor.colourId,
                              restrictedBoxEditor.imageUrl,
                              "move",
                              restrictedEditorCurrentBox
                            )
                          }
                          className="absolute cursor-move border-2 border-[#D11A2A] bg-[#D11A2A]/10"
                          style={{
                            left: `${restrictedEditorCurrentBox.left * 100}%`,
                            top: `${restrictedEditorCurrentBox.top * 100}%`,
                            width: `${restrictedEditorCurrentBox.width * 100}%`,
                            height: `${restrictedEditorCurrentBox.height * 100}%`,
                          }}
                        >
                          <button
                            type="button"
                            onMouseDown={(event) =>
                              beginRestrictedBoxDrag(
                                event,
                                restrictedBoxEditor.colourId,
                                restrictedBoxEditor.imageUrl,
                                "resize",
                                restrictedEditorCurrentBox
                              )
                            }
                            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-sm border border-white bg-[#D11A2A]"
                            aria-label="Resize restricted box"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border border-[#E5D7B7] bg-white p-3 text-xs text-[#5E4A22]">
                        <p className="font-semibold">Restricted box values</p>
                        <p>
                          Left {Math.round(restrictedEditorCurrentBox.left * 100)}% · Top{" "}
                          {Math.round(restrictedEditorCurrentBox.top * 100)}%
                        </p>
                        <p>
                          Width {Math.round(restrictedEditorCurrentBox.width * 100)}% · Height{" "}
                          {Math.round(restrictedEditorCurrentBox.height * 100)}%
                        </p>
                        <p className="pt-1 text-[11px] text-[#6A5428]">
                          Drag the red area to move. Drag the red corner handle to resize.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              resetRestrictedBoxDraft(restrictedBoxEditor.colourId, restrictedBoxEditor.imageUrl)
                            }
                            className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530]"
                          >
                            Reset Draft
                          </button>
                          <button
                            type="button"
                            onClick={saveRestrictedBoxFromEditor}
                            className="rounded-lg border border-[#C8962E] bg-[#FFF4DC] px-3 py-1.5 text-xs font-semibold text-[#6B4B10]"
                          >
                            Save Box
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <footer className="border-t border-[#E9DFC8] bg-[#FFF9EA] px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveRestrictedBoxEditorImage("prev")}
                          disabled={restrictedBoxEditor.imageIndex <= 0}
                          className="rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Previous Image
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRestrictedBoxEditorImage("next")}
                          disabled={restrictedBoxEditor.imageIndex >= restrictedBoxEditor.imageCount - 1}
                          className="rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Next Image
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={closeRestrictedBoxEditor}
                          className="rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530]"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveRestrictedBoxFromEditor();
                            closeRestrictedBoxEditor();
                          }}
                          className="rounded-xl bg-[#1F1A12] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Save & Close
                        </button>
                      </div>
                    </div>
                  </footer>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {isAdminEditor && adminSaveSuccess ? (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#120E08]/70 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#E7D4A4] bg-gradient-to-br from-[#FFF7E6] via-[#FFFDF7] to-[#FBECD2] shadow-[0_35px_80px_rgba(26,20,12,0.45)]">
              <div className="relative px-6 pb-7 pt-8 text-center sm:px-10">
                <div className="pointer-events-none absolute -left-10 top-4 h-40 w-40 rounded-full bg-[#EAC066]/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-[#B98A2F]/25 blur-3xl" />

                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#D9AE4D] bg-white shadow-[0_0_0_10px_rgba(217,174,77,0.15)]">
                  <CheckCircle2 className="h-10 w-10 text-[#9B6B14]" />
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#F0CB73] p-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#6E4B0F]" />
                  </span>
                </div>

                <div className="relative mt-4 flex justify-center gap-1">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#B88A2E]"
                      style={{ animationDelay: `${dot * 140}ms` }}
                    />
                  ))}
                </div>

                <p className="relative mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#8B6824]">Success</p>
                <h3 className="relative mt-1 text-2xl font-black text-[#21180D] sm:text-3xl">
                  {adminSaveSuccess.mode === "created"
                    ? `Successfully created "${adminSaveSuccess.name}"`
                    : `Successfully edited "${adminSaveSuccess.name}"`}
                </h3>
                <p className="relative mt-2 text-sm text-[#5D4A24]">
                  {adminSaveSuccess.mode === "created"
                    ? "Your product is live and ready for admin actions."
                    : "Your product changes have been saved."}
                </p>

                <div className="relative mt-4 rounded-2xl border border-[#E6D3A6] bg-white/70 p-4 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A5F2A]">What changed</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#4D3D1B]">
                    {adminSaveSuccess.changes.map((item, index) => (
                      <li key={`${item}-${index}`} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={goToCreatedProduct}
                    disabled={!adminSaveSuccess.slug}
                    className="rounded-xl bg-[#1F1A12] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#372D1C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Go To Product
                  </button>
                  <button
                    type="button"
                    onClick={startAnotherProduct}
                    className="rounded-xl border border-[#CFAE6E] bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-[#7C5E23] transition hover:bg-[#FFF5DE]"
                  >
                    Add Another Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminSaveSuccess(null)}
                    className="rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-[#7B6530]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

          <SizeGuideModal />
          <ProductQuoteModal />
        </ProductQuoteProvider>
      </SizeGuideProvider>
    </AuthenticatedLayout>
  );
}
