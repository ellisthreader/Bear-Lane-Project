  "use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
  import { Head, usePage, router } from "@inertiajs/react";
  import { ArrowLeft, ArrowRight, X, Shirt, Upload as UploadIcon, Type, Image as ClipartIcon } from "lucide-react";
  import { route } from "ziggy-js";



  import ProductEdit from "./Sidebar/ProductEdit";
  import AddText from "./Sidebar/TextSideBar/AddText";
  import Clipart from "./Sidebar/ClipartSideBar/UI/Clipart";
  import UploadSidebar from "./Sidebar/UploadSideBar/UploadSidebar";
  import ChangeProductModal from "./ChangeProduct";
import Canvas from "./Canvas/Canvas";
import { clampPositionAndSize } from "./Canvas/Utils/clampPosition";
import type { PricePreviewSnapshot } from "./Canvas/Canvas";

import DesignPreview from "./Components/DesignPreview";
import TextProperties from "./Sidebar/TextSideBar/TextProperties/TextProperties";
import { DEFAULT_TEXT_ALIGN, type TextAlign } from "./Types/Text";
  import MultiSelectPanel from "./Sidebar/MultiSelectPanel";
  import ClipartProperties from "./Sidebar/ClipartSideBar/Properties/ClipartProperties";
  import SidebarHeader from "./Components/SidebarHeader";
  import ClipartSectionsPage from "./Sidebar/ClipartSideBar/UI/ClipartSectionsPage";
  import BlankSidebar from "./Sidebar/BlankSidebar";
  import DesignNavbar from "./Components/DesignNavbar";
import MyDesignsSidebar from "./Sidebar/OtherSideBar/MyDesignsSidebar";
import { useUser } from "./Sidebar/OtherSideBar/useUser";
import GetPriceUI from "./Components/GetPriceUI";
import { useCart } from "../../Context/CartContext";
import CartSidebar from "@/Components/Cart/CartSidebar";
 



  export interface Product {
    id: number;
    name: string;
    slug: string;
    brand?: string;
    price?: number | string;
    original_price?: number | string | null;
    images?: any[];
    image?: string;
    colourProducts?: any[];
    sizes?: string[];
    categories?: any[];
  }



  export type CanvasPosition = {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
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
  const MAX_DESIGN_NAME_LENGTH = 60;

  type SavedDesignPayload = {
    viewImageStates: Record<ViewKey, Record<string, ImageState>>;
    positions: Record<string, CanvasPosition>;
    sizes: Record<string, { w: number; h: number }>;
    uploadedImages: string[];
    currentViewKey: ViewKey;
    selectedColour: string | null;
    selectedSize: string | null;
    baseViewImages?: Partial<Record<ViewKey, string>>;
    previewByView?: Partial<Record<ViewKey, PricePreviewSnapshot>>;
  };

  type SavedDesign = {
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

  const EMPTY_VIEW_IMAGE_STATES: Record<ViewKey, Record<string, ImageState>> = {
    front: {},
    back: {},
    leftSleeve: {},
    rightSleeve: {},
  };

  type CanvasSnapshot = {
    positions: Record<string, CanvasPosition>;
    sizes: Record<string, { w: number; h: number }>;
    viewImageStates: Record<ViewKey, Record<string, ImageState>>;
    currentViewKey: ViewKey;
    selectedUploadedImage: string | null;
    selectedText: string | null;
  };

  const deepCloneValue = <T,>(value: T): T => {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  };

  type SidebarView =
    | "blank"
    | "product"
    | "upload"
    | "text"
    | "clipart"
    | "clipart-sections"
    | "clipart-properties"
    | "my-designs";

  function previewSnapshotSignature(snapshot?: PricePreviewSnapshot): string {
    if (!snapshot) return "";

    return JSON.stringify({
      baseImage: snapshot.baseImage,
      canvasWidth: snapshot.canvasWidth,
      canvasHeight: snapshot.canvasHeight,
      restrictedBox: snapshot.restrictedBox,
      layers: snapshot.layers.map(layer => ({
        uid: layer.uid,
        type: layer.type,
        url: layer.url ?? "",
        text: layer.text ?? "",
        position: layer.position,
        size: layer.size,
        rotation: layer.rotation,
        flip: layer.flip,
        color: layer.color ?? "",
        borderColor: layer.borderColor ?? "",
        borderWidth: layer.borderWidth ?? 0,
        fontFamily: layer.fontFamily ?? "",
        fontSize: layer.fontSize ?? 0,
      })),
    });
  }
    

  export default function Design() {
    const { props } = usePage();
    const { user, isLoading, isSignedIn } = useUser(); // ✅ ADD THIS
    const authUser = (props as any).auth?.user ?? null;
    const resolvedUser = (user as any) ?? authUser;
    const isUserSignedIn = Boolean(authUser ?? user ?? isSignedIn);
    const isUserLoading = !authUser && isLoading;
    const { addToCart } = useCart();
    const [isPricePanelOpen, setIsPricePanelOpen] = React.useState(false);
    
    
    const {
      product,
      selectedColour: propColour,
      selectedSize: propSize,
      onResizeTextCommit,
      savedDesigns: propSavedDesigns = [],
      initialSavedDesign = null,
    } = props as any;


    // 1️⃣ Create currentProduct state first
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product ?? null);

  // 2️⃣ Create safeProduct after currentProduct exists
  const safeProduct: Product = currentProduct ?? {
    id: 0,
    name: "Unknown",
    brand: "",
    slug: "",
    images: [],
    sizes: [],
    colourProducts: [],
    categories: [],
  };

  // 3️⃣ Optional: safe name
  const safeName: string = safeProduct.name ?? "Unknown";


    // ---------------- STATES ----------------
    const [currentViewKey, setCurrentViewKey] = useState<"front" | "back" | "leftSleeve" | "rightSleeve">("front");
    const [isChangeProductModalOpen, setIsChangeProductModalOpen] = useState(false);
    type ViewKey = "front" | "back" | "leftSleeve" | "rightSleeve";

    const [viewImageStates, setViewImageStates] = useState<Record<ViewKey, Record<string, ImageState>>>(EMPTY_VIEW_IMAGE_STATES);
    const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>(Array.isArray(propSavedDesigns) ? propSavedDesigns : []);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [selectedUploadedImage, setSelectedUploadedImage] = useState<string | null>(null);
    const [selectedText, setSelectedText] = useState<string | null>(null);
    const safeViewKey = currentViewKey in viewImageStates ? currentViewKey : "front";
    const currentImageState = viewImageStates[safeViewKey] ?? {};
    const updateCurrentImageState = useCallback(
      (
        updates: Record<string, ImageState> | ((prev: Record<string, ImageState>) => Record<string, ImageState>)
      ) => {
        setViewImageStates(prev => ({
          ...prev,
          [currentViewKey]:
            typeof updates === "function"
              ? updates(prev[currentViewKey] || {})
              : { ...(prev[currentViewKey] || {}), ...updates },
        }));
      },
      [currentViewKey]
    );
    const [selectedClipart, setSelectedClipart] = useState<string | null>(null);
    const [sidebarTitleOverride, setSidebarTitleOverride] = useState<string | null>(null);
    const [sidebarStack, setSidebarStack] = useState<SidebarView[]>(["product"]);
    const activeSidebar = sidebarStack[sidebarStack.length - 1];
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [pendingDesignName, setPendingDesignName] = useState("");
    const [isSavingDesign, setIsSavingDesign] = useState(false);
    const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
    const [currentSavedDesignId, setCurrentSavedDesignId] = useState<number | null>(
      (initialSavedDesign as SavedDesign | null)?.id ?? null
    );
    const [currentDesignName, setCurrentDesignName] = useState<string>(
      (initialSavedDesign as SavedDesign | null)?.name ?? (safeName && safeName !== "Unknown" ? safeName : "Untitled Design")
    );
    const [saveMode, setSaveMode] = useState<"overwrite" | "new">("new");

    const openMyDesignsSidebar = () => {
  setSidebarStack(["my-designs"]);
};

    const handleOpenSaveDesignDialog = () => {
  if (!isUserSignedIn || !resolvedUser) {
    router.get("/login");
    return;
  }

  setPendingDesignName(
    (currentDesignName || (safeName && safeName !== "Unknown" ? safeName : "Untitled Design"))
      .slice(0, MAX_DESIGN_NAME_LENGTH)
  );
  setSaveMode(currentSavedDesignId ? "overwrite" : "new");
  setSaveDialogError(null);
  setIsSaveDialogOpen(true);
};

    const handleSaveDesign = async (
  designName: string,
  mode: "overwrite" | "new" = "new"
) => {
  if (!isUserSignedIn || !resolvedUser) {
    router.get("/login");
    return;
  }

  if (!safeProduct.id) return;

  const trimmedName = designName.trim();
  if (!trimmedName) {
    setSaveDialogError("Please enter a design name.");
    return;
  }
  if (trimmedName.length > MAX_DESIGN_NAME_LENGTH) {
    setSaveDialogError(`Design name must be ${MAX_DESIGN_NAME_LENGTH} characters or fewer.`);
    return;
  }

  if (mode === "overwrite" && currentSavedDesignId) {
    const ok = window.confirm("Overwrite this saved design with your current changes?");
    if (!ok) return;
  }

  setIsSavingDesign(true);
  setSaveDialogError(null);

  const persistedViewImageStates = structuredClone(viewImageStates) as Record<
    ViewKey,
    Record<string, ImageState>
  >;

  (Object.keys(pricePreviewByView) as ViewKey[]).forEach(view => {
    const snapshot = pricePreviewByView[view];
    if (!snapshot?.layers?.length) return;

    snapshot.layers.forEach(layer => {
      const existing = persistedViewImageStates[view]?.[layer.uid];
      if (!existing) return;

      const nextCanvasPositions = {
        ...(existing.canvasPositions ?? {}),
        [view]: {
          x: layer.position.x,
          y: layer.position.y,
          width: layer.size.w,
          height: layer.size.h,
          scale: 1,
          relX:
            snapshot.restrictedBox.width > 0
              ? (layer.position.x - snapshot.restrictedBox.left) / snapshot.restrictedBox.width
              : 0,
          relY:
            snapshot.restrictedBox.height > 0
              ? (layer.position.y - snapshot.restrictedBox.top) / snapshot.restrictedBox.height
              : 0,
          relW:
            snapshot.restrictedBox.width > 0
              ? layer.size.w / snapshot.restrictedBox.width
              : 0,
          relH:
            snapshot.restrictedBox.height > 0
              ? layer.size.h / snapshot.restrictedBox.height
              : 0,
        },
      };

      persistedViewImageStates[view][layer.uid] = {
        ...existing,
        size: { w: layer.size.w, h: layer.size.h },
        canvasPositions: nextCanvasPositions,
      };
    });
  });

  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

  try {
    const response = await fetch("/design/saved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        ...(mode === "overwrite" && currentSavedDesignId
          ? { saved_design_id: currentSavedDesignId }
          : {}),
        name: trimmedName,
        product_id: safeProduct.id,
        payload: {
          viewImageStates: persistedViewImageStates,
          positions,
          sizes,
          uploadedImages,
          currentViewKey,
          selectedColour,
          selectedSize,
          baseViewImages: viewImages,
          previewByView: pricePreviewByView,
        },
      }),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJsonResponse = contentType.includes("application/json");

    if (!response.ok) {
      if (response.status === 401 || response.status === 419) {
        router.get("/login");
        return;
      }

      const errorPayload = isJsonResponse ? await response.json() : await response.text();
      const message =
        typeof errorPayload === "object" && errorPayload && "message" in errorPayload
          ? String((errorPayload as { message?: unknown }).message ?? "Save failed")
          : `Save failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!isJsonResponse) {
      throw new Error("Save failed: server returned a non-JSON response.");
    }

    const data = await response.json();
    const nextSavedDesign = data?.savedDesign as SavedDesign | undefined;

    if (nextSavedDesign) {
      setSavedDesigns(prev => [
        nextSavedDesign,
        ...prev.filter(item => item.id !== nextSavedDesign.id),
      ]);
      setCurrentSavedDesignId(nextSavedDesign.id);
      setCurrentDesignName(nextSavedDesign.name || trimmedName);
    }

    setIsSaveDialogOpen(false);
    setSidebarStack(["my-designs"]);
  } catch (error) {
    console.error("Failed to save design:", error);
    setSaveDialogError(error instanceof Error ? error.message : "Failed to save design.");
  } finally {
    setIsSavingDesign(false);
  }
};


  const handleGetPrice = () => {
    console.log("GET PRICE CLICKED");

    const initialColour = selectedColour ?? uniqueColours[0] ?? null;
    if (initialColour && initialColour !== selectedColour) {
      setSelectedColour(initialColour);
    }

    const sizesForColour =
      (initialColour && variantsByColour[initialColour]
        ? variantsByColour[initialColour]
            .map(v => v.size)
            .filter((size): size is string => typeof size === "string" && size.trim().length > 0)
        : []);

    const fallbackSizes = (safeProduct.sizes ?? []).filter(
      (size): size is string => typeof size === "string" && size.trim().length > 0
    );

    const initialSize = selectedSize ?? sizesForColour[0] ?? fallbackSizes[0] ?? null;
    if (initialSize && initialSize !== selectedSize) {
      setSelectedSize(initialSize);
    }

    captureCanvasSnapshot();
    canvasResizeGuardRef.current = true;
    window.requestAnimationFrame(() => {
      setIsPricePanelOpen(true);
    });
  };

  const handlePricePreviewUpdate = useCallback((viewKey: ViewKey, snapshot: PricePreviewSnapshot) => {
    const nextSignature = previewSnapshotSignature(snapshot);

    setPricePreviewByView(prev => {
      if (isPricePanelOpen) return prev;

      const existingSnapshot = prev[viewKey];
      const viewStateLayerCount = Object.keys(viewImageStates[viewKey] ?? {}).length;
      const isTransientEmptySnapshot =
        viewStateLayerCount > 0 &&
        snapshot.layers.length === 0 &&
        (existingSnapshot?.layers.length ?? 0) > 0;

      if (isTransientEmptySnapshot) return prev;

      const currentSignature = previewSnapshotSignature(prev[viewKey]);
      if (currentSignature === nextSignature) return prev;

      return {
        ...prev,
        [viewKey]: snapshot,
      };
    });
  }, [isPricePanelOpen, viewImageStates]);

  const handleAddToCartFromPrice = ({
    quantity,
    sizeBreakdown,
    unitPrice,
    previewSnapshot,
  }: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
    unitPrice: number;
    previewSnapshot?: PricePreviewSnapshot;
  }) => {
    const sizeEntries = Object.entries(sizeBreakdown).filter(([, qty]) => qty > 0);
    const fallbackSize = selectedSize ?? safeProduct.sizes?.[0] ?? "One Size";

    if (sizeEntries.length > 0) {
      sizeEntries.forEach(([size, qty]) => {
        addToCart({
          slug: safeProduct.slug,
          title: safeProduct.name,
          price: unitPrice,
          colour: selectedColour ?? "Default",
          size,
          image: viewImages.front,
          availableSizes: safeProduct.sizes ?? [],
          quantity: qty,
          previewSnapshot,
        });
      });
    } else {
      addToCart({
        slug: safeProduct.slug,
        title: safeProduct.name,
        price: unitPrice,
        colour: selectedColour ?? "Default",
        size: fallbackSize,
        image: viewImages.front,
        availableSizes: safeProduct.sizes ?? [],
        quantity: Math.max(quantity, 1),
        previewSnapshot,
      });
    }

    setIsPricePanelOpen(false);
  };

  const handleBuyNowFromPrice = ({
    quantity,
    sizeBreakdown,
    unitPrice,
    previewSnapshot,
  }: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
    unitPrice: number;
    previewSnapshot?: PricePreviewSnapshot;
  }) => {
    handleAddToCartFromPrice({ quantity, sizeBreakdown, unitPrice, previewSnapshot });
    router.get("/checkout");
  };


    
  const [mainImage, setMainImage] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const previewWidth = Math.min(Math.max(canvasSize.width || 800, 600), 900);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const pricePanelRef = useRef<HTMLDivElement | null>(null);
    const canvasResizeGuardRef = useRef(isPricePanelOpen);
    const triggerCanvasResizeRef = useRef<() => void>(() => {});
    const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
    const [replaceClipartId, setReplaceClipartId] = useState<string | null>(null);
    const [positions, setPositions] = useState<Record<string, {
      

  

      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
  }>>({});

    const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
    const canvasSnapshotRef = useRef<CanvasSnapshot | null>(null);

    const normalizeImages = (images: any[]) =>
    (images ?? []).map(img => (typeof img === "string" ? img : img.url ?? img.path ?? ""));

  const [displayImages, setDisplayImages] = useState<string[]>(
    normalizeImages(currentProduct?.images ?? [])
  );
  
  // === ADD THIS ===
const viewImages = useMemo(() => {
  return {
    front: displayImages[0] ?? "",
    back: displayImages[1] ?? "",
    rightSleeve: displayImages[2] ?? "",
    leftSleeve: displayImages[3] ?? "",
  };
}, [displayImages]);

const [pricePreviewByView, setPricePreviewByView] = useState<Record<ViewKey, PricePreviewSnapshot | undefined>>({
  front: undefined,
  back: undefined,
  leftSleeve: undefined,
  rightSleeve: undefined,
});

const pricePanelSides = useMemo(
  () => [
    {
      key: "front" as const,
      pictureNumber: 1 as const,
      label: "Front",
      edited: Object.keys(viewImageStates.front ?? {}).length > 0,
      imageSrc: viewImages.front,
      preview: pricePreviewByView.front,
    },
    {
      key: "back" as const,
      pictureNumber: 2 as const,
      label: "Back",
      edited: Object.keys(viewImageStates.back ?? {}).length > 0,
      imageSrc: viewImages.back,
      preview: pricePreviewByView.back,
    },
    {
      key: "rightSleeve" as const,
      pictureNumber: 3 as const,
      label: "Right Sleeve",
      edited: Object.keys(viewImageStates.rightSleeve ?? {}).length > 0,
      imageSrc: viewImages.rightSleeve,
      preview: pricePreviewByView.rightSleeve,
    },
    {
      key: "leftSleeve" as const,
      pictureNumber: 4 as const,
      label: "Left Sleeve",
      edited: Object.keys(viewImageStates.leftSleeve ?? {}).length > 0,
      imageSrc: viewImages.leftSleeve,
      preview: pricePreviewByView.leftSleeve,
    },
  ],
  [viewImageStates, viewImages, pricePreviewByView]
);

  const captureCanvasSnapshot = useCallback(() => {
    canvasSnapshotRef.current = {
      positions: deepCloneValue(positions),
      sizes: deepCloneValue(sizes),
      viewImageStates: deepCloneValue(viewImageStates),
      currentViewKey,
      selectedUploadedImage,
      selectedText,
    };
  }, [
    positions,
    sizes,
    viewImageStates,
    currentViewKey,
    selectedUploadedImage,
    selectedText,
  ]);

  const applyCanvasSnapshot = useCallback(
    (clearAfter = false) => {
      const snapshot = canvasSnapshotRef.current;
      if (!snapshot) return;

      setPositions(snapshot.positions);
      setSizes(snapshot.sizes);
      setViewImageStates(snapshot.viewImageStates);
      setCurrentViewKey(snapshot.currentViewKey);
      setSelectedUploadedImage(snapshot.selectedUploadedImage);
      setSelectedText(snapshot.selectedText);

      if (clearAfter) {
        canvasSnapshotRef.current = null;
      }
    },
    [
      setPositions,
      setSizes,
      setViewImageStates,
      setCurrentViewKey,
      setSelectedUploadedImage,
      setSelectedText,
    ]
  );

  const restoreCanvasSnapshot = useCallback(() => {
    applyCanvasSnapshot(true);
  }, [applyCanvasSnapshot]);

  // ---------------- UTILS ----------------
  const setSelectedUploadedImageWithLog = (uid: string | null) => {
    console.log("🟢 setSelectedUploadedImage called:", uid);
    setSelectedUploadedImage(uid);

    // If an uploaded image is selected, always switch sidebar to Upload
    if (uid) {
      setSidebarStack(["upload"]);
    }
  };

    const restrictedBox = useMemo(
      () => ({
        left: canvasSize.width * 0.367,
        top: canvasSize.height * 0.1,
        width: canvasSize.width * 0.26,
        height: canvasSize.height * 0.65,
      }),
      [canvasSize]
    );
    const isRestrictedBoxReady = restrictedBox.width > 0 && restrictedBox.height > 0;

    const fitSizeToRestrictedBox = useCallback(
      ({ w, h }: { w: number; h: number }) => {
        if (restrictedBox.width <= 0 || restrictedBox.height <= 0) return { w, h };
        const scale = Math.min(1, restrictedBox.width / w, restrictedBox.height / h);
        return { w: w * scale, h: h * scale };
      },
      [restrictedBox]
    );

    const clipartsNeedingRestrictedFitRef = useRef<
      Map<string, { w: number; h: number; preferredPosition?: { x: number; y: number } }>
    >(new Map());

    const positionsRef = useRef(positions);

    const clampClipartToRestrictedBox = useCallback(
      (position: CanvasPosition) => {
        if (!isRestrictedBoxReady) return position;
        const clamped = clampPositionAndSize(
          position.x,
          position.y,
          position.width,
          position.height,
          restrictedBox
        );
        return {
          ...position,
          x: clamped.x,
          y: clamped.y,
          width: clamped.w,
          height: clamped.h,
        };
      },
      [isRestrictedBoxReady, restrictedBox]
    );

    const getClipartInitialPosition = useCallback(
      (
        w: number,
        h: number,
        options?: { preferredPosition?: { x: number; y: number } }
      ) => {
        const fitted = fitSizeToRestrictedBox({ w, h });
        const hasValidBox = restrictedBox.width > 0 && restrictedBox.height > 0;
        const boxLeft = hasValidBox
          ? restrictedBox.left
          : Math.max((canvasSize.width - fitted.w) / 2, 0);
        const boxTop = hasValidBox
          ? restrictedBox.top
          : Math.max((canvasSize.height - fitted.h) / 2, 0);
        const boxWidth = hasValidBox ? restrictedBox.width : Math.max(canvasSize.width, fitted.w);
        const boxHeight = hasValidBox ? restrictedBox.height : Math.max(canvasSize.height, fitted.h);
        let y = boxTop + Math.max((boxHeight - fitted.h) / 2, 0);
        let x: number;

        if (options?.preferredPosition) {
          x = options.preferredPosition.x;
          y = options.preferredPosition.y;
        } else if (hasValidBox) {
          const maxX = restrictedBox.left + restrictedBox.width - fitted.w;
          x = restrictedBox.left;
          const maxY = restrictedBox.top + restrictedBox.height - fitted.h;
          y = Math.min(Math.max(y, restrictedBox.top), Math.max(maxY, restrictedBox.top));
          x = Math.min(Math.max(x, restrictedBox.left), Math.max(maxX, restrictedBox.left));
        } else {
          x = boxLeft + Math.max((boxWidth - fitted.w) / 2, 0);
        }

        return clampClipartToRestrictedBox({
          x,
          y,
          width: fitted.w,
          height: fitted.h,
          scale: 1,
        });
      },
      [
        canvasSize.width,
        canvasSize.height,
        fitSizeToRestrictedBox,
        restrictedBox,
        clampClipartToRestrictedBox,
      ]
    );

    useEffect(() => {
      positionsRef.current = positions;
    }, [positions]);

    const clampClipartPreferredPosition = useCallback(
      (uid: string, width: number, height: number) => {
        const currentPositions = positionsRef.current;
        const existing = currentPositions[uid] ?? {
          x: restrictedBox.left,
          y: restrictedBox.top,
        };
        const clamped = clampPositionAndSize(
          existing.x,
          existing.y,
          width,
          height,
          restrictedBox
        );
        return { x: clamped.x, y: clamped.y };
      },
      [restrictedBox]
    );

    const leftAlignedPreferredPosition = useCallback(
      (uid: string, width: number, height: number) => {
        const { y } = clampClipartPreferredPosition(uid, width, height);
        return { x: restrictedBox.left, y };
      },
      [clampClipartPreferredPosition, restrictedBox.left]
    );

    const applyFittedClipart = useCallback(
      (
        uid: string,
        width: number,
        height: number,
        options?: { preferredPosition?: { x: number; y: number } }
      ) => {
        if (!isRestrictedBoxReady) {
          clipartsNeedingRestrictedFitRef.current.set(uid, {
            w: width,
            h: height,
            preferredPosition: options?.preferredPosition,
          });
        } else {
          clipartsNeedingRestrictedFitRef.current.delete(uid);
        }

        const fitted = getClipartInitialPosition(width, height, {
          preferredPosition: options?.preferredPosition,
        });
        setPositions(prev => ({
          ...prev,
          [uid]: { x: fitted.x, y: fitted.y, width: fitted.width, height: fitted.height, scale: 1 },
        }));
        setSizes(prev => ({
          ...prev,
          [uid]: { w: fitted.width, h: fitted.height },
        }));
        updateCurrentImageState(prev => ({
          ...prev,
          [uid]: {
            ...prev[uid],
            size: { w: fitted.width, h: fitted.height },
            original: {
              ...(prev[uid]?.original ?? {}),
              size: { w: fitted.width, h: fitted.height },
            },
            canvasPositions: {
              ...(prev[uid]?.canvasPositions ?? {}),
              [currentViewKey]: fitted,
            },
          },
        }));
      },
      [currentViewKey, getClipartInitialPosition, setPositions, setSizes, updateCurrentImageState]
    );

    useEffect(() => {
      if (!isRestrictedBoxReady) return;
      const pending = Array.from(clipartsNeedingRestrictedFitRef.current.entries());
      if (!pending.length) return;
      clipartsNeedingRestrictedFitRef.current.clear();
      pending.forEach(([uid, size]) =>
        applyFittedClipart(uid, size.w, size.h, {
          preferredPosition: size.preferredPosition,
        })
      );
    }, [applyFittedClipart, isRestrictedBoxReady]);

    const goBackSidebar = () => {
      setSidebarStack(prev => (prev.length <= 1 ? prev : prev.slice(0, -1)));
    };

    const canGoBack = sidebarStack.length > 1;

    const closeToBlank = () => {
      setSelectedObjects([]);
      setSelectedUploadedImage(null);
      setSelectedText(null);
      setSidebarTitleOverride(null);
      setSidebarStack(["blank"]);
    };

  const variantsByColour = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    if (!currentProduct) return grouped;

    (currentProduct.colourProducts ?? []).forEach(cp => {
      const colour = cp.colour;
      const sizes = cp.sizes ?? [];
      const images = cp.images ?? currentProduct.images ?? [];
      if (!grouped[colour]) grouped[colour] = [];
      if (sizes.length) {
        sizes.forEach(s => grouped[colour].push({ colour, size: s, images }));
      } else {
        grouped[colour].push({ colour, size: undefined, images });
      }
    });

    return grouped;
  }, [currentProduct]);



    const uniqueColours = Object.keys(variantsByColour);
    const [selectedColour, setSelectedColour] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);

const pricePanelAvailableSizes = useMemo(() => {
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

  const fallbackSizes = (safeProduct.sizes ?? []).filter(
    (size): size is string => typeof size === "string" && size.trim().length > 0
  );
  return Array.from(new Set(fallbackSizes));
}, [selectedColour, uniqueColours, variantsByColour, safeProduct.sizes]);




  useEffect(() => {
    setSavedDesigns(Array.isArray(propSavedDesigns) ? propSavedDesigns : []);
  }, [propSavedDesigns]);

  useEffect(() => {
    const incoming = (initialSavedDesign as SavedDesign | null)?.id ?? null;
    setCurrentSavedDesignId(incoming);
  }, [initialSavedDesign]);

  useEffect(() => {
    const savedName = (initialSavedDesign as SavedDesign | null)?.name;
    if (savedName && savedName.trim()) {
      setCurrentDesignName(savedName);
      return;
    }

    if (safeName && safeName !== "Unknown") {
      setCurrentDesignName(safeName);
      return;
    }

    setCurrentDesignName("Untitled Design");
  }, [initialSavedDesign, safeName]);

  const hasAppliedInitialSavedDesign = useRef(false);

  useEffect(() => {
    const payload = (initialSavedDesign as SavedDesign | null)?.payload;
    if (hasAppliedInitialSavedDesign.current || !payload) return;

    const hydratedViewImageStates: Record<ViewKey, Record<string, ImageState>> = {
      front: { ...(payload.viewImageStates?.front ?? {}) },
      back: { ...(payload.viewImageStates?.back ?? {}) },
      leftSleeve: { ...(payload.viewImageStates?.leftSleeve ?? {}) },
      rightSleeve: { ...(payload.viewImageStates?.rightSleeve ?? {}) },
    };

    (Object.entries(payload.previewByView ?? {}) as Array<
      [ViewKey, PricePreviewSnapshot | undefined]
    >).forEach(([viewKey, snapshot]) => {
      if (!snapshot?.layers?.length) return;

      snapshot.layers.forEach(layer => {
        const existing = hydratedViewImageStates[viewKey][layer.uid];
        if (!existing) return;

        const relX =
          snapshot.restrictedBox.width > 0
            ? (layer.position.x - snapshot.restrictedBox.left) / snapshot.restrictedBox.width
            : 0;
        const relY =
          snapshot.restrictedBox.height > 0
            ? (layer.position.y - snapshot.restrictedBox.top) / snapshot.restrictedBox.height
            : 0;
        const relW =
          snapshot.restrictedBox.width > 0 ? layer.size.w / snapshot.restrictedBox.width : 0;
        const relH =
          snapshot.restrictedBox.height > 0 ? layer.size.h / snapshot.restrictedBox.height : 0;

        hydratedViewImageStates[viewKey][layer.uid] = {
          ...existing,
          size: { w: layer.size.w, h: layer.size.h },
          canvasPositions: {
            ...(existing.canvasPositions ?? {}),
            [viewKey]: {
              x: layer.position.x,
              y: layer.position.y,
              width: layer.size.w,
              height: layer.size.h,
              scale: 1,
              relX,
              relY,
              relW,
              relH,
            },
          },
          ...(existing.type === "text" && layer.fontSize
            ? { fontSize: layer.fontSize }
            : {}),
        };
      });
    });

    const frontSnapshot = payload.previewByView?.front;
    const seededPositionsFromPreview: Record<
      string,
      { x: number; y: number; width: number; height: number; scale: number }
    > = {};
    const seededSizesFromPreview: Record<string, { w: number; h: number }> = {};

    if (frontSnapshot?.layers?.length) {
      frontSnapshot.layers.forEach(layer => {
        seededPositionsFromPreview[layer.uid] = {
          x: layer.position.x,
          y: layer.position.y,
          width: layer.size.w,
          height: layer.size.h,
          scale: 1,
        };
        seededSizesFromPreview[layer.uid] = {
          w: layer.size.w,
          h: layer.size.h,
        };
      });
    }

    const mergedPositions = {
      ...(payload.positions ?? {}),
      ...seededPositionsFromPreview,
    };
    const mergedSizes = {
      ...(payload.sizes ?? {}),
      ...seededSizesFromPreview,
    };

    console.groupCollapsed("[Design Restore] Hydrating saved design payload");
    console.log("savedDesignId:", (initialSavedDesign as SavedDesign | null)?.id ?? null);
    console.log("views in payload.viewImageStates:", Object.keys(payload.viewImageStates ?? {}));
    console.log("views in payload.previewByView:", Object.keys(payload.previewByView ?? {}));
    console.log(
      "layer counts by view:",
      (Object.keys(hydratedViewImageStates) as ViewKey[]).reduce<Record<string, number>>(
        (acc, key) => {
          acc[key] = Object.keys(hydratedViewImageStates[key] ?? {}).length;
          return acc;
        },
        {}
      )
    );
    console.log("front snapshot seeded positions:", Object.keys(seededPositionsFromPreview).length);
    console.groupEnd();

    setViewImageStates(hydratedViewImageStates);
    setPositions(mergedPositions);
    setSizes(mergedSizes);
    setUploadedImages(Array.isArray(payload.uploadedImages) ? payload.uploadedImages : []);

    // Always open restored designs on the first product view so
    // base image and layers are in sync on initial load.
    setCurrentViewKey("front");

    if (payload.selectedColour !== undefined) {
      setSelectedColour(payload.selectedColour);
    }

    if (payload.selectedSize !== undefined) {
      setSelectedSize(payload.selectedSize);
    }

    hasAppliedInitialSavedDesign.current = true;
  }, [initialSavedDesign]);

    // ---------------- EFFECTS ----------------

    // 🔁 Sync Inertia props → local state (IMPORTANT)
  useEffect(() => {
    if (!product) return;

    setCurrentProduct(product);

    if (propColour) {
      setSelectedColour(propColour);
    }

    if (propSize) {
      setSelectedSize(propSize);
    }
  }, [product, propColour, propSize]);

  useEffect(() => {
    if (selectedColour || uniqueColours.length === 0) return;
    const initialColour = uniqueColours[0];
    setSelectedColour(initialColour);

    const initialSizes = variantsByColour[initialColour]
      ?.map(v => v.size)
      .filter((size): size is string => typeof size === "string" && size.trim().length > 0) ?? [];

    if (!selectedSize && initialSizes.length > 0) {
      setSelectedSize(initialSizes[0]);
    }
  }, [selectedColour, selectedSize, uniqueColours, variantsByColour]);


  useEffect(() => {
    if (!canvasRef.current) return;

    const el = canvasRef.current;
    const updateSize = () => {
      if (canvasResizeGuardRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      setCanvasSize(prev =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    triggerCanvasResizeRef.current = updateSize;

    // Run at least once after the current frame so layout transitions settle.
    updateSize();
    const rafId = window.requestAnimationFrame(updateSize);

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(el);

    window.addEventListener("resize", updateSize);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    canvasResizeGuardRef.current = isPricePanelOpen;
    if (!isPricePanelOpen) {
      triggerCanvasResizeRef.current();
    }
  }, [isPricePanelOpen]);

  useEffect(() => {
    if (!isPricePanelOpen) return;

    const handleOutsideDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (pricePanelRef.current?.contains(target)) return;
      setIsPricePanelOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideDown);
    document.addEventListener("touchstart", handleOutsideDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideDown);
      document.removeEventListener("touchstart", handleOutsideDown);
    };
  }, [isPricePanelOpen]);

  useEffect(() => {
    if (!isPricePanelOpen) return;

    let rafId: number;
    const tick = () => {
      applyCanvasSnapshot(false);
      rafId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isPricePanelOpen, applyCanvasSnapshot]);

  useEffect(() => {
    if (isPricePanelOpen) return;
    if (!canvasSnapshotRef.current) return;

    restoreCanvasSnapshot();
  }, [isPricePanelOpen, restoreCanvasSnapshot]);

  useEffect(() => {
    // 🟢 CASE 1: product has NO colour variants
    if (!selectedColour || !variantsByColour[selectedColour]) {
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
      return;
    }

    // 🟢 CASE 2: product HAS colour variants
    const colourVariants = variantsByColour[selectedColour];
    const variant =
      colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];

      


    const sorted = normalizeImages(variant?.images ?? []);
  }, [currentProduct, selectedColour, selectedSize, variantsByColour]);



    useEffect(() => {
    if (
      selectedUploadedImage &&
      currentImageState[selectedUploadedImage]?.type === "image" &&
      !currentImageState[selectedUploadedImage]?.isClipart
    ) {
      setSidebarTitleOverride("Image Properties"); // override only when an image is selected
    } else {
      setSidebarTitleOverride(null); // revert to default title
    }

    console.group("🟡 DESIGN IMAGE STATE");
    console.log("currentProduct:", currentProduct);
    console.log("selectedColour:", selectedColour);
    console.log("selectedSize:", selectedSize);
    console.log("displayImages:", displayImages);
    console.log("mainImage:", mainImage);
    console.groupEnd();
  }, [selectedUploadedImage, currentImageState]);


useEffect(() => {
  if (displayImages.length > 0) {
    setMainImage(displayImages[0]); // default to the first image immediately
  }
}, [displayImages]);




  // ---------- TYPES ----------
  type HistorySnapshot = {
    product: Product | null;
    imageState: Record<string, ImageState>;
    positions: Record<string, CanvasPosition>;
    sizes: Record<string, { w: number; h: number }>;
    selectedColour: string | null;
    selectedSize: string | null;
  };

  // ---------- STATES ----------

  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const [historyIndex, setHistoryIndex] = useState(-1);


  // ---------- CURRENT VARIANT ----------
  const currentVariant = useMemo(() => {
    if (!selectedColour || !variantsByColour[selectedColour]) return undefined;
    const colourVariants = variantsByColour[selectedColour];
    return colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];
  }, [selectedColour, selectedSize, variantsByColour]);





  // ---------- SEED INITIAL STATE ----------
  const hasSeededHistory = useRef(false);

  useEffect(() => {
    if (hasSeededHistory.current) return;
    if (!currentProduct || !selectedColour) return; // ✅ use currentProduct

    const snapshot: HistorySnapshot = {
      product: structuredClone(currentProduct),
      imageState: structuredClone(currentImageState),
      positions: structuredClone(positions),
      sizes: structuredClone(sizes),
      selectedColour,
      selectedSize,
    };

    console.groupCollapsed("%c🌱 SEED HISTORY", "color:#3b82f6;font-weight:bold");
    console.log("product →", currentProduct?.slug);
    console.log("colour →", selectedColour);
    console.log("size →", selectedSize);
    console.groupEnd();

    setHistory([snapshot]);
    setHistoryIndex(0);
    hasSeededHistory.current = true;
  }, [currentProduct, selectedColour]);

  // ---------- PRODUCT CHANGES ----------
  const handleColourChange = (colour: string) => {
    if (colour === selectedColour) return;
    setSelectedColour(colour);

    // Reset size to first available for this colour
    const variants = variantsByColour[colour];
    if (variants?.length) {
      setSelectedSize(variants[0].size ?? null);
      const images = normalizeImages(variants[0].images ?? []);
      setDisplayImages(images);
    } else {
      // fallback
      setSelectedSize(null);
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
    }
  };

  const handleSizeChange = (size: string) => {
    if (size === selectedSize) return;
    setSelectedSize(size);
  };


  const beginResize = () => {
  };


  const handleProductSelect = (product: Product) => {
    router.get(
      route("design.show", { slug: product.slug }), // ✅ must use slug
      {},
      { preserveState: false } // can be true if you want smoother Inertia reload
    );
  };

  const handleSavedDesignSelect = (savedDesign: SavedDesign) => {
    if (!savedDesign.product?.slug) return;
    setCurrentDesignName(savedDesign.name);

    router.get(
      route("design.show", { slug: savedDesign.product.slug }),
      { savedDesign: savedDesign.id },
      { preserveState: false }
    );
  };

  const handleCreateNewDesign = (designName: string) => {
    const trimmed = designName.trim();
    if (!trimmed) return;

    setViewImageStates(EMPTY_VIEW_IMAGE_STATES);
    setPositions({});
    setSizes({});
    setUploadedImages([]);
    setSelectedUploadedImage(null);
    setSelectedText(null);
    setSelectedObjects([]);
    setPricePreviewByView({
      front: undefined,
      back: undefined,
      leftSleeve: undefined,
      rightSleeve: undefined,
    });
    setCurrentSavedDesignId(null);
    setCurrentDesignName(trimmed);
    setCurrentViewKey("front");
    setSaveMode("new");
    setSidebarStack(["product"]);
  };

  const handleDeleteSavedDesign = async (savedDesign: SavedDesign) => {
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    try {
      const response = await fetch(`/design/saved/${savedDesign.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      setSavedDesigns(prev => prev.filter(item => item.id !== savedDesign.id));
      if (currentSavedDesignId === savedDesign.id) {
        setCurrentSavedDesignId(null);
        setCurrentDesignName(safeName && safeName !== "Unknown" ? safeName : "Untitled Design");
        setSaveMode("new");
      }
    } catch (error) {
      console.error("Failed to delete design:", error);
    }
  };


  useEffect(() => {
    if (!currentProduct) return;

    // No colour selected → fallback to product images
    if (!selectedColour || !variantsByColour[selectedColour]) {
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
      return;
    }

    // Colour selected → get variant by size
    const colourVariants = variantsByColour[selectedColour];

    // Pick the variant that matches selectedSize, fallback to first
    const variant = colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];

    const images = normalizeImages(variant?.images ?? []);
    setDisplayImages(images);
    setMainImage(images[0] ?? "");
  }, [currentProduct, selectedColour, selectedSize, variantsByColour]);



  const lastProductRef = useRef<Product | null>(null);

  useEffect(() => {
    if (!currentProduct) return;
    if (lastProductRef.current === currentProduct) return;

    if (lastProductRef.current !== null) {
    }

    lastProductRef.current = currentProduct;
  }, [currentProduct, selectedColour, selectedSize]);




// ---------------- HANDLERS ----------------

// 1️⃣ Current view key and current imageState for that view

// Rotate
const beginRotate = () => {};

const handleRotateImage = (uid: string, angle: number) => {
  updateCurrentImageState({
    [uid]: { ...(currentImageState[uid] ?? {}), rotation: angle },
  });
};

// Flip
const handleFlipImage = (uid: string, flip: "none" | "horizontal" | "vertical") => {
  if (!currentImageState[uid]) return;
  updateCurrentImageState({
    [uid]: { ...currentImageState[uid], flip },
  });
};

// Update image size
const handleUpdateImageSize = (uid: string, w: number, h: number) => {
  updateCurrentImageState({
    [uid]: {
      ...(currentImageState[uid] ?? { rotation: 0, flip: "none", size: { w: 150, h: 150 } }),
      size: { w, h },
    },
  });
  setSizes(prev => ({ ...prev, [uid]: { w, h } }));
};

// Change color
const handleChangeImageColor = (uid: string, color: string) => {
  if (!currentImageState[uid]) return;
  updateCurrentImageState({
    [uid]: { ...currentImageState[uid], color },
  });
};

const syncClipartNaturalSize = (uid: string, src: string) => {
  const image = new Image();
  image.onload = () => {
    const naturalW = Math.max(1, image.naturalWidth);
    const naturalH = Math.max(1, image.naturalHeight);
    const preferredPosition = leftAlignedPreferredPosition(uid, naturalW, naturalH);
    applyFittedClipart(uid, naturalW, naturalH, { preferredPosition });
  };
  image.onerror = () => {};
  image.src = src;
};

// Add Clipart
const handleAddClipart = (src: string) => {
  const uid = crypto.randomUUID();
  const defaultSize = { w: 150, h: 150 };
  updateCurrentImageState({
    [uid]: {
      url: src,
      type: "image",
      isClipart: true,
      rotation: 0,
      flip: "none",
      size: defaultSize,
      color: "#000000",
      renderKey: crypto.randomUUID(),
      original: { url: src, rotation: 0, flip: "none", size: { ...defaultSize }, color: "#000000" },
    },
  });
  setUploadedImages(prev => [...prev, uid]);
  setSelectedUploadedImageWithLog(uid);
  setSelectedText(null);
  setSidebarStack(["clipart"]);
  applyFittedClipart(uid, defaultSize.w, defaultSize.h);
  syncClipartNaturalSize(uid, src);
};

  // Replace Clipart
  const handleReplaceClipart = (src: string) => {
    if (!replaceClipartId) return;
    handleRemoveUploadedImage(replaceClipartId);
    setReplaceClipartId(null);
    handleAddClipart(src);
  };

// Change Clipart
const handleChangeClipart = () => {
  if (!selectedUploadedImage) return;
  setReplaceClipartId(selectedUploadedImage);
  setSelectedUploadedImageWithLog(null);
  setSidebarStack(["clipart"]);
};

// Upload Image
const handleUpload = (url: string) => {
  const uid = crypto.randomUUID();
  const defaultSize = { w: 150, h: 150 };
  setUploadedImages(prev => [...prev, uid]);

  updateCurrentImageState({
    [uid]: {
      url,
      type: "image",
      rotation: 0,
      flip: "none",
      size: defaultSize,
      canvasPositions: {
        [uid]: { x: 100, y: 100, width: defaultSize.w, height: defaultSize.h, scale: 1 },
      },
      restrictedBox: { x: 0, y: 0, w: 600, h: 600 },
      original: { url, rotation: 0, flip: "none", size: { ...defaultSize } },
      isClipart: false,
      isSvg: false,
      text: undefined,
      fontFamily: undefined,
      color: undefined,
      borderColor: undefined,
      borderWidth: undefined,
      fontSize: undefined,
      width: undefined,
      renderKey: undefined,
    },
  });

  setSizes(prev => ({ ...prev, [uid]: { ...defaultSize } }));
  setSelectedUploadedImageWithLog(uid);
  setSidebarStack(["upload"]);
};

// Duplicate Uploaded Image
const handleDuplicateUploadedImage = (uid: string) => {
  const source = currentImageState[uid];
  if (!source) return;
  const dup = crypto.randomUUID();
  const originalPos = source.canvasPositions?.[uid] ?? { x: 100, y: 100, width: source.size.w, height: source.size.h, scale: 1 };
  setUploadedImages(prev => [...prev, dup]);
  updateCurrentImageState({
    [dup]: {
      ...source,
      renderKey: crypto.randomUUID(),
      canvasPositions: { [dup]: { ...originalPos, x: originalPos.x + 20, y: originalPos.y + 20 } },
    },
  });
  setSelectedUploadedImageWithLog(dup);
  setSidebarStack(["upload"]);
};

// Remove Uploaded Image
const handleRemoveUploadedImage = (uid: string) => {
  setUploadedImages(prev => prev.filter(u => u !== uid));
  updateCurrentImageState(prev => {
    const next = { ...prev };
    delete next[uid];
    return next;
  });
  if (selectedUploadedImage === uid) setSelectedUploadedImageWithLog(null);
};

// Delete Text Layer
const deleteTextLayer = (uid: string) => {
  updateCurrentImageState(prev => {
    const next = { ...prev };
    delete next[uid];
    return next;
  });
  setSelectedText(null);
  setSelectedObjects(prev => prev.filter(id => id !== uid));
  setSidebarStack(["text"]);
};

// Duplicate Text Layer
const duplicateTextLayer = (uid: string) => {
  const source = currentImageState[uid];
  if (!source || source.type !== "text") return;
  const newId = crypto.randomUUID();
  updateCurrentImageState({
    [newId]: { ...source, renderKey: crypto.randomUUID() },
  });
  setSelectedText(newId);
  setSidebarStack(["text"]);
};

// Canvas selection change
const handleCanvasSelectionChange = (objects: string[]) => {
  setSelectedObjects(objects);

  const textLayer = objects.find(uid => currentImageState[uid]?.type === "text") ?? null;
  const imageLayer = objects.find(uid => currentImageState[uid]?.type === "image") ?? null;

  if (textLayer) {
    setSelectedText(textLayer);
    setSelectedUploadedImageWithLog(null);
    setSidebarStack(prev => (prev[prev.length - 1] === "text" ? prev : ["product", "text"]));
    return;
  }

  if (imageLayer) {
    setSelectedText(null);
    setSelectedUploadedImageWithLog(imageLayer);
    const isClipart = currentImageState[imageLayer]?.isClipart;
    setSidebarStack(prev => (prev[prev.length - 1] === (isClipart ? "clipart" : "upload") ? prev : ["product", isClipart ? "clipart" : "upload"]));
    return;
  }

  // Nothing selected
  setSelectedText(null);
  setSelectedUploadedImageWithLog(null);
};

// Update Text Layer
const updateTextLayer = (uid: string, updates: Partial<ImageState>) => {
  if (!currentImageState[uid]) return;
  updateCurrentImageState({
    [uid]: { ...currentImageState[uid], ...updates },
  });
};

const resetTextLayer = (uid: string) => {
  const layer = currentImageState[uid];
  if (!layer || layer.type !== "text") return;

  const original = layer.original ?? {
    url: "",
    rotation: 0,
    flip: "none",
    size: { w: 0, h: 0 },
  };

  updateCurrentImageState({
    [uid]: {
      ...layer,
      text: original.text ?? layer.text ?? "",
      fontFamily: original.fontFamily ?? layer.fontFamily ?? "Arial",
      fontSize: original.fontSize ?? 24,
      color: original.color ?? "#000000",
      borderColor: original.borderColor ?? "#000000",
      borderWidth: original.borderWidth ?? 0,
      rotation: original.rotation ?? 0,
      flip: original.flip ?? "none",
      size: original.size ?? { w: 0, h: 0 },
      textAlign: original.textAlign ?? layer.textAlign ?? DEFAULT_TEXT_ALIGN,
      renderKey: crypto.randomUUID(),
    },
  });
};
  // ---------------- SIDEBAR TITLES ----------------
const SIDEBAR_TITLES: Record<string, string | ((props: any) => string)> = {
  product: "Product",
  text: ({ selectedText }: any) => (selectedText ? "Text Properties" : "Text"),
  clipart: ({ selectedUploadedImage, currentImageState }: any) =>
    selectedUploadedImage && currentImageState[selectedUploadedImage]?.isClipart
      ? "Clipart Properties"
      : "Clipart",
  upload: "Upload", // always Upload
  "my-designs": () => (isUserSignedIn ? "My Designs" : "Sign in to access"),
};




const renderActiveTab = () => {
  if (selectedObjects.length > 1) {
    return (
      <MultiSelectPanel
        selectedObjects={selectedObjects}
        imageState={currentImageState}
      />
    );
  }

  if (activeSidebar === "blank") {
    return (
      <BlankSidebar
        onOpenProduct={() => setSidebarStack(["product"])}
        onOpenUpload={() => setSidebarStack(["upload"])}
        onOpenText={() => setSidebarStack(["text"])}
        onOpenClipart={() => setSidebarStack(["clipart"])}
      />
    );
  }

  switch (activeSidebar) {
    case "product":
      return (
        <ProductEdit
          product={safeProduct}
          selectedColour={selectedColour}
          selectedSize={selectedSize}
          onColourChange={handleColourChange}
          onSizeChange={handleSizeChange}
          onOpenChangeProductModal={() =>
            setIsChangeProductModalOpen(true)
          }
        />
      );

    case "upload":
      return (
        <UploadSidebar
          canvasRef={canvasRef}
          onUpload={handleUpload}
          recentImages={uploadedImages}
          selectedImage={selectedUploadedImage}
          onSelectImage={setSelectedUploadedImageWithLog}
          imageState={currentImageState}
          uploadedImages={currentImageState}
          setImageState={updateCurrentImageState}
          onRotateImage={handleRotateImage}
          onFlipImage={handleFlipImage}
          onUpdateImageSize={handleUpdateImageSize}
          onRemoveUploadedImage={handleRemoveUploadedImage}
          onDuplicateUploadedImage={handleDuplicateUploadedImage}
          restrictedBox={restrictedBox}
          canvasPositions={positions}
          onResetImage={handleResetImage}
        />
      );

  case "text": {
  if (!selectedText || !currentImageState[selectedText]) {
    return (
      <AddText
        onAddText={(layer) => {
          updateCurrentImageState({
            [layer.id]: {
              url: "",
              type: "text",
              text: layer.text,
              rotation: 0,
              flip: "none",
              size: { w: 0, h: 0 },
              fontFamily: layer.font,
              color: layer.color,
              borderColor: layer.borderColor,
              borderWidth: layer.borderWidth,
              fontSize: layer.fontSize,
              textAlign: DEFAULT_TEXT_ALIGN,
              width: layer.width,
              original: {
                url: "",
                rotation: 0,
                flip: "none",
                size: { w: 0, h: 0 },
                text: layer.text,
                fontFamily: layer.font,
                fontSize: layer.fontSize,
                color: layer.color,
                borderColor: layer.borderColor,
                borderWidth: layer.borderWidth,
                textAlign: DEFAULT_TEXT_ALIGN,
              },
            },
          });

          setSelectedText(layer.id);
          setSidebarStack(["text"]);
        }}
      />
    );
  }

  const textLayer = currentImageState[selectedText];

  const handleTextAlignChange = (align: TextAlign) => {
    if (!selectedText || !textLayer) return;
    updateTextLayer(selectedText, {
      textAlign: align,
    });
  };

  return (
    <TextProperties
      textValue={textLayer.text ?? ""}
      onTextChange={(val) => updateTextLayer(selectedText, { text: val })}
      fontFamily={textLayer.fontFamily ?? "Arial"}
      onFontChange={(val) => updateTextLayer(selectedText, { fontFamily: val })}
      color={textLayer.color ?? "#000000"}
      onColorChange={(val) => updateTextLayer(selectedText, { color: val })}
      rotation={textLayer.rotation ?? 0}
      onRotationChange={(val) => updateTextLayer(selectedText, { rotation: val })}
      fontSize={textLayer.fontSize ?? 24}
      onFontSizeChange={(val) => updateTextLayer(selectedText, { fontSize: val })}
      borderColor={textLayer.borderColor ?? "#000000"}
      onBorderColorChange={(val) => updateTextLayer(selectedText, { borderColor: val })}
      borderWidth={textLayer.borderWidth ?? 0}
      onBorderWidthChange={(val) => updateTextLayer(selectedText, { borderWidth: val })}
      flip={textLayer.flip ?? "none"}
      onFlipChange={(val) => updateTextLayer(selectedText, { flip: val })}
      onDuplicate={() => duplicateTextLayer(selectedText)}
      onReset={() => resetTextLayer(selectedText)}
      onDelete={() => deleteTextLayer(selectedText)}
      restrictedBox={restrictedBox}
      textPosition={positions[selectedText]}
      textAlign={textLayer.textAlign ?? DEFAULT_TEXT_ALIGN}
      onTextAlignChange={handleTextAlignChange}
    />
  );
}

    case "clipart":
      const clipartLayer =
        selectedUploadedImage &&
        currentImageState[selectedUploadedImage]?.isClipart
          ? currentImageState[selectedUploadedImage]
          : null;

      if (clipartLayer) {
        return (
          <ClipartProperties
            layer={clipartLayer}
            restrictedBox={restrictedBox}
            canvasPosition={positions[selectedUploadedImage!] ?? { x: 0, y: 0 }}
            onRotate={(v) =>
              handleRotateImage(selectedUploadedImage!, v)
            }
            onFlip={(v) =>
              handleFlipImage(selectedUploadedImage!, v)
            }
            onResize={(w, h) =>
              handleUpdateImageSize(selectedUploadedImage!, w, h)
            }
            onChangeColor={(color) =>
              handleChangeImageColor(selectedUploadedImage!, color)
            }
            onChangeArt={handleChangeClipart}
            onDelete={() =>
              handleRemoveUploadedImage(selectedUploadedImage!)
            }
            onReset={() =>
              handleResetImage(selectedUploadedImage!)
            }
            onDuplicate={() =>
              handleDuplicateUploadedImage(selectedUploadedImage!)
            }
          />
        );
      }

      return (
        <Clipart
          onBack={goBackSidebar}
          onAddClipart={(url) =>
            replaceClipartId
              ? handleReplaceClipart(url)
              : handleAddClipart(url)
          }
          setSidebarTitle={setSidebarTitleOverride}
          onOpenSections={() => {
            setSidebarTitleOverride(null);
            setSidebarStack(["clipart-sections"]);
          }}
        />
      );

    case "clipart-sections":
      return (
        <ClipartSectionsPage
          onBack={() => {
            setSidebarTitleOverride(null);
            goBackSidebar();
          }}
        />
      );

    case "my-designs":
      if (isUserLoading) {
        return (
          <div className="p-6 text-center text-gray-400">
            Loading your designs...
          </div>
        );
      }

      return (
        <MyDesignsSidebar
          closeSidebar={goBackSidebar}
          user={resolvedUser}
          designs={savedDesigns}
          selectedDesignId={currentSavedDesignId}
          onCreateDesign={handleCreateNewDesign}
          onSelectDesign={handleSavedDesignSelect}
          onDeleteDesign={handleDeleteSavedDesign}
        />
      );

    default:
      return (
        <BlankSidebar
          onOpenProduct={() => setSidebarStack(["product"])}
          onOpenUpload={() => setSidebarStack(["upload"])}
          onOpenText={() => setSidebarStack(["text"])}
          onOpenClipart={() => setSidebarStack(["clipart"])}
        />
      );
  }
};

const handleResetImage = (uid: string) => {
  updateCurrentImageState(prev => {
    const layer = prev[uid];
    if (!layer || !layer.original) return prev;
    return { ...prev, [uid]: { ...layer, ...layer.original } };
  });
};

const handleResizeText = (uid: string, newFontSize: number) => {
  if (!uid) return;
  updateCurrentImageState(prev => ({
    ...prev,
    [uid]: {
      ...prev[uid],
      fontSize: newFontSize
    }
  }));
};

const handleCloseSidebar = () => {
  setSelectedObjects([]);
  setSelectedText(null);
  setSelectedUploadedImageWithLog(null);
  setSidebarStack(["blank"]);
};
  
  return (
    <>
      <div className="min-h-screen bg-gray-200 relative disable-selection">
      <Head title="Start Designing" />

      {isChangeProductModalOpen && (
        <ChangeProductModal
          onClose={() => setIsChangeProductModalOpen(false)}
          onSelectProduct={handleProductSelect}
        />
      )}

      <div className={`${isChangeProductModalOpen ? "blur-lg opacity-40" : ""} min-h-screen bg-gray-200`}>

        {/* ✅ NEW NAVBAR COMPONENT */}
        <DesignNavbar
          designName={currentDesignName}
          onOpenMyDesigns={openMyDesignsSidebar}
          myDesignsLabel={isUserSignedIn ? "My Designs" : "Sign in to access"}
        />

        {/* CONTENT */}
        <div className="pt-[96px] flex min-h-screen w-full bg-gray-200">

      
  {/* LEFT SIDEBAR */}
  <div
    className={`mt-4 mb-6 bg-white shadow-lg border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 items-center h-[calc(100vh-160px)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isPricePanelOpen
        ? "ml-0 w-0 opacity-0 pointer-events-none"
        : "ml-6 w-[140px] opacity-100"
    }`}
  >
    {[
      { id: "product", icon: <Shirt size={22} />, label: "Product" },
      { id: "upload", icon: <UploadIcon size={22} />, label: "Upload" },
      { id: "text", icon: <Type size={22} />, label: "Text" },
      { id: "clipart", icon: <ClipartIcon size={22} />, label: "Clipart" },
    ].map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          // Switch sidebar
          setSidebarStack([tab.id as SidebarView]);

          // Keep selectedUploadedImage for "upload" and "clipart", reset for others
          if (tab.id !== "clipart" && tab.id !== "upload") setSelectedUploadedImageWithLog(null);

          // Reset selectedText for non-text tabs
          if (tab.id !== "text") setSelectedText(null);
        }}
        className={`w-full h-16 flex flex-col items-center justify-center rounded-xl border transition ${
          activeSidebar === tab.id
            ? "border-[#C6A75E] bg-[#C6A75E]/15 shadow-sm"
            : "border-gray-200 bg-white hover:border-[#C6A75E]/50 hover:bg-[#C6A75E]/10"
        }`}
      >
        {React.cloneElement(tab.icon, {
          className: activeSidebar === tab.id ? "text-[#8A6D2B]" : "text-gray-700",
        })}
        <span className={`text-sm ${activeSidebar === tab.id ? "text-[#8A6D2B] font-semibold" : "text-gray-700"}`}>
          {tab.label}
        </span>
      </button>
    ))}
  </div>

  {/* RIGHT SIDEBAR */}
  <div
    className={`mt-4 mb-6 h-[calc(100vh-160px)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isPricePanelOpen
        ? "ml-0 w-0 translate-x-8 opacity-0 pointer-events-none"
        : "ml-4 w-[480px] translate-x-0 opacity-100"
    }`}
  >
    <div className="bg-white shadow-lg border border-gray-200 rounded-2xl overflow-y-auto h-full">
      {/* ONLY RENDER HEADER IF NOT BLANK */}
      {activeSidebar !== "blank" && (
        <SidebarHeader
          title={
            selectedObjects.length > 1
              ? "Multiple Objects Selected"
              : sidebarTitleOverride ??
                (typeof SIDEBAR_TITLES[activeSidebar] === "function"
                  ? SIDEBAR_TITLES[activeSidebar]!({
                      selectedText,
                      selectedUploadedImage,
                      currentImageState,
                    })
                  : SIDEBAR_TITLES[activeSidebar] ?? "")
          }
          canGoBack={canGoBack}
          onBack={goBackSidebar}
          onClose={handleCloseSidebar}
        />
      )}
      <div className="p-4">{renderActiveTab()}</div>
    </div>
  </div>

  {/* MAIN CANVAS */}
  <div
    className={`mt-4 mb-6 h-[calc(100vh-160px)] flex-1 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isPricePanelOpen ? "ml-0 mr-0" : "ml-0 mr-6"
    }`}
  >
    <div className="relative h-full w-full">
      <div className={`${isPricePanelOpen ? "hidden" : "flex h-full rounded-2xl overflow-hidden bg-gray-100"}`} >
        <Canvas
          sizes={sizes}
          setSizes={setSizes}
          canvasPositions={positions}
          mainImage={mainImage}
          restrictedBox={restrictedBox}
          canvasRef={canvasRef}
          uploadedImages={uploadedImages}
          setUploadedImages={setUploadedImages}
          imageState={currentImageState}
          setImageState={updateCurrentImageState}
          onSelectImage={setSelectedUploadedImageWithLog}
          onSelectText={setSelectedText}
          onResizeStart={beginResize}
          onSwitchTab={(tab) => {
            if (!tab) return;

            // Keep uploaded image selected for 'upload' tab
            setSidebarStack((prev) =>
              prev[prev.length - 1] === tab ? prev : [...prev.slice(0, 1), tab as SidebarView]
            );
          }}
          onDelete={(uids) => uids.forEach((uid) => handleRemoveUploadedImage(uid))}
          onResizeTextCommit={handleResizeText}
          onSelectionChange={handleCanvasSelectionChange}
          onGetPrice={handleGetPrice}
          onSaveDesign={handleOpenSaveDesignDialog}
          productViewImages={viewImages}
          viewImageStates={viewImageStates}
          currentViewKey={currentViewKey}
          setCurrentViewKey={setCurrentViewKey}
          setViewImageStates={setViewImageStates}
          onViewSnapshotChange={handlePricePreviewUpdate}
          compactPriceMode={isPricePanelOpen}
        />
      </div>

      {isPricePanelOpen && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden px-5">
          <DesignPreview
            snapshot={pricePreviewByView.front}
            fallbackImage={viewImages.front}
            width={previewWidth}
            alt="Front design preview"
            className="h-full w-full max-w-none"
            noFrame
          />
        </div>
      )}
    </div>
  </div>

      {isPricePanelOpen && (
        <div
          ref={pricePanelRef}
          className="w-[820px] ml-4 mr-6 mt-4 mb-6 h-[calc(100vh-160px)] rounded-2xl border border-gray-200 shadow-lg bg-white overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <GetPriceUI
            docked
            onClose={() => setIsPricePanelOpen(false)}
            productName={safeProduct.name ?? "Unknown Product"}
            selectedColour={selectedColour}
            availableColours={uniqueColours}
            onColourChange={handleColourChange}
            sides={pricePanelSides}
            basePrice={safeProduct.price}
            availableSizes={pricePanelAvailableSizes}
            selectedSize={selectedSize}
            onSizeChange={handleSizeChange}
            onAddToCart={handleAddToCartFromPrice}
            onBuyNow={handleBuyNowFromPrice}
          />
        </div>
      )}

          {isSaveDialogOpen && (
            <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-4">
              <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#C6A75E]/30 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-[#F8F3E6] via-[#FCFAF2] to-white px-7 py-5 border-b border-[#C6A75E]/20">
                  <h3 className="text-2xl font-semibold tracking-tight text-gray-900">Save Design</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Give your design a clear name so it is easy to find later.
                  </p>
                </div>

                <div className="px-7 py-6">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Design Title
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pendingDesignName}
                      maxLength={MAX_DESIGN_NAME_LENGTH}
                      onChange={e => {
                        setPendingDesignName(e.target.value.slice(0, MAX_DESIGN_NAME_LENGTH));
                        if (saveDialogError) setSaveDialogError(null);
                      }}
                      placeholder="My design name"
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition focus:border-[#C6A75E] focus:ring-4 focus:ring-[#C6A75E]/20 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                      {pendingDesignName.length}/{MAX_DESIGN_NAME_LENGTH}
                    </span>
                  </div>

                  {saveDialogError && (
                    <p className="mt-2 text-sm text-red-600">{saveDialogError}</p>
                  )}

                  {currentSavedDesignId && (
                    <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                        Saving Options
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSaveMode("overwrite")}
                          className={`rounded-xl px-3 py-2 text-sm border transition ${
                            saveMode === "overwrite"
                              ? "border-[#C6A75E] bg-[#C6A75E]/20 text-[#8A6D2B] shadow-sm"
                              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Overwrite Current
                        </button>
                        <button
                          type="button"
                          onClick={() => setSaveMode("new")}
                          className={`rounded-xl px-3 py-2 text-sm border transition ${
                            saveMode === "new"
                              ? "border-[#C6A75E] bg-[#C6A75E]/20 text-[#8A6D2B] shadow-sm"
                              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Save as New
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSavingDesign) return;
                        setIsSaveDialogOpen(false);
                      }}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 transition hover:bg-gray-50"
                      disabled={isSavingDesign}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDesign(pendingDesignName, saveMode)}
                      className="rounded-xl bg-[#C6A75E] px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#B8994E] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSavingDesign}
                    >
                      {isSavingDesign ? "Saving..." : "Save Design"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    <CartSidebar />
  </>
);
}
