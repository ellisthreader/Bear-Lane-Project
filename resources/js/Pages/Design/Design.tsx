  "use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
  import { Head, usePage, router } from "@inertiajs/react";
  import { route } from "ziggy-js";



  import ProductEdit from "./Sidebar/ProductEdit";
  import AddText from "./Sidebar/TextSideBar/AddText";
  import Clipart from "./Sidebar/ClipartSideBar/UI/Clipart";
  import UploadSidebar from "./Sidebar/UploadSideBar/UploadSidebar";
  import ChangeProductModal from "./ChangeProduct";
import Canvas from "./Canvas/Canvas";
import { clampPositionAndSize } from "./Canvas/Utils/clampPosition";
import type { PricePreviewSnapshot } from "./Canvas/Canvas";
import type {
  CanvasPosition,
  CanvasSnapshot,
  HistorySnapshot,
  ImageState,
  Product,
  ProductVariantOption,
  SavedDesign,
  SidebarView,
  ViewImages,
  ViewKey,
} from "./types/designTypes";

import DesignPreview from "./Components/DesignPreview";
import DesignSidebars from "./Components/DesignSidebars";
import DesignWorkspaceLayout from "./Components/DesignWorkspaceLayout";
import SaveDesignDialog from "./Components/SaveDesignDialog";
import { DesignPageProvider } from "./Context/DesignPageContext";
import TextProperties from "./Sidebar/TextSideBar/TextProperties/TextProperties";
import { DEFAULT_TEXT_ALIGN, type TextAlign } from "./Types/Text";
  import MultiSelectPanel from "./Sidebar/MultiSelectPanel";
  import ClipartProperties from "./Sidebar/ClipartSideBar/Properties/ClipartProperties";
  import ClipartSectionsPage from "./Sidebar/ClipartSideBar/UI/ClipartSectionsPage";
  import BlankSidebar from "./Sidebar/BlankSidebar";
  import DesignNavbar from "./Components/DesignNavbar";
import MyDesignsSidebar from "./Sidebar/OtherSideBar/MyDesignsSidebar";
import { useUser } from "./Sidebar/OtherSideBar/useUser";
import GetPriceUI from "./Components/GetPriceUI";
import { useCart } from "../../Context/CartContext";
import CartSidebar from "@/Components/Cart/CartSidebar";
import { EMPTY_VIEW_IMAGE_STATES, MAX_DESIGN_NAME_LENGTH, MAX_SAVED_DESIGNS } from "./constants/designConstants";
import { createEmptyPricePreviewByView } from "./constants/pricePreviewDefaults";
import { getSidebarTitle } from "./config/sidebarTitles";
import { deepCloneValue } from "./utils/deepCloneValue";
import { buildVariantsByColour, getPricePanelAvailableSizes } from "./utils/designVariants";
import { getSafeProduct } from "./utils/getSafeProduct";
import { normalizeDesignImages } from "./utils/normalizeDesignImages";
import { previewSnapshotSignature } from "./utils/previewSnapshotSignature";
import { buildPricePanelSides } from "./utils/pricePanelSides";
import { captureCanvasCompositePng } from "./utils/captureCanvasCompositePng";
import { renderSnapshotToPng } from "./utils/renderSnapshotToPng";
import { normalizeDesignType, type DesignType } from "@/Utils/designType";
import { moderateDesignImage, moderateDesignText } from "./utils/moderationClient";
import { showError } from "@/Utils/toastHelpers";

type RestrictedBoxRatio = { left: number; top: number; width: number; height: number };
type ImageNaturalSize = { width: number; height: number };

const normalizeImageBoxKey = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^https?:\/\/[^/]+/i, "");
};

const isRestrictedBoxRatioValid = (value: unknown): value is RestrictedBoxRatio => {
  if (!value || typeof value !== "object") return false;
  const box = value as RestrictedBoxRatio;
  if (![box.left, box.top, box.width, box.height].every((part) => Number.isFinite(Number(part)))) {
    return false;
  }

  const left = Number(box.left);
  const top = Number(box.top);
  const width = Number(box.width);
  const height = Number(box.height);

  if (left < 0 || top < 0 || width <= 0 || height <= 0) return false;
  if (left >= 1 || top >= 1 || width > 1 || height > 1) return false;
  if (left + width > 1 || top + height > 1) return false;
  return true;
};

const isNaturalSizeValid = (size: ImageNaturalSize | undefined): size is ImageNaturalSize =>
  Boolean(size && size.width > 0 && size.height > 0);
 

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
      selectedDesignType: propDesignType,
      onResizeTextCommit,
      savedDesigns: propSavedDesigns = [],
      initialSavedDesign = null,
    } = props as any;


    // 1️⃣ Create currentProduct state first
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product ?? null);

  // 2️⃣ Create safeProduct after currentProduct exists
  const safeProduct: Product = getSafeProduct(currentProduct);

  // 3️⃣ Optional: safe name
  const safeName: string = safeProduct.name ?? "Unknown";


    // ---------------- STATES ----------------
    const [currentViewKey, setCurrentViewKey] = useState<ViewKey>("front");
    const [isChangeProductModalOpen, setIsChangeProductModalOpen] = useState(false);

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

  if (mode === "new" && savedDesigns.length >= MAX_SAVED_DESIGNS) {
    setSaveDialogError(`You can only save up to ${MAX_SAVED_DESIGNS} designs. Delete one to save a new design.`);
    return;
  }

  setIsSavingDesign(true);
  setSaveDialogError(null);
  // Let any pending drag/resize state propagation settle before snapshotting.
  await new Promise<void>(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

  const persistedViewImageStates = structuredClone(viewImageStates) as Record<
    ViewKey,
    Record<string, ImageState>
  >;

  const bakeLiveTextPositions = () => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const currentViewState = persistedViewImageStates[currentViewKey] ?? {};
    const nextViewState = { ...currentViewState };

    Object.entries(currentViewState).forEach(([uid, layer]) => {
      if (layer?.type !== "text") return;
      const element = document.querySelector<HTMLElement>(
        `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
      );
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const x = Number((rect.left - canvasRect.left).toFixed(2));
      const y = Number((rect.top - canvasRect.top).toFixed(2));
      const width = Number(rect.width.toFixed(1));
      const height = Number(rect.height.toFixed(1));

      nextViewState[uid] = {
        ...layer,
        size: { w: width, h: height },
        canvasPositions: {
          ...(layer.canvasPositions ?? {}),
          [currentViewKey]: {
            ...(layer.canvasPositions?.[currentViewKey] ?? {}),
            x,
            y,
            width,
            height,
            scale: layer.canvasPositions?.[currentViewKey]?.scale ?? 1,
            relX:
              restrictedBox.width > 0
                ? (x - restrictedBox.left) / restrictedBox.width
                : undefined,
            relY:
              restrictedBox.height > 0
                ? (y - restrictedBox.top) / restrictedBox.height
                : undefined,
            relW:
              restrictedBox.width > 0 ? width / restrictedBox.width : undefined,
            relH:
              restrictedBox.height > 0 ? height / restrictedBox.height : undefined,
          },
        },
      };
    });

    persistedViewImageStates[currentViewKey] = nextViewState;
  };

  // Source of truth is the live per-view canvasPositions kept in viewImageStates by Canvas.
  // Do not overwrite with parent-level positions state, which can lag during drag interactions.
  bakeLiveTextPositions();

  (Object.keys(pricePreviewByView) as ViewKey[]).forEach(view => {
    if (view === currentViewKey) return;
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

  const canonicalCurrentViewPositions = Object.entries(
    persistedViewImageStates[currentViewKey] ?? {}
  ).reduce<Record<string, CanvasPosition>>((acc, [uid, layer]) => {
    const position = layer?.canvasPositions?.[currentViewKey];
    if (!position) return acc;
    acc[uid] = {
      x: Number(position.x),
      y: Number(position.y),
      width: Number(position.width),
      height: Number(position.height),
      scale: Number(position.scale ?? 1),
      ...(typeof (position as any).relX === "number"
        ? {
            relX: Number((position as any).relX),
            relY: Number((position as any).relY),
            relW: Number((position as any).relW),
            relH: Number((position as any).relH),
          }
        : {}),
    };
    return acc;
  }, {});

  const canonicalCurrentViewSizes = Object.entries(
    persistedViewImageStates[currentViewKey] ?? {}
  ).reduce<Record<string, { w: number; h: number }>>((acc, [uid, layer]) => {
    const position = layer?.canvasPositions?.[currentViewKey];
    if (position?.width && position?.height) {
      acc[uid] = { w: Number(position.width), h: Number(position.height) };
      return acc;
    }
    if (layer?.size?.w && layer?.size?.h) {
      acc[uid] = { w: Number(layer.size.w), h: Number(layer.size.h) };
    }
    return acc;
  }, {});

  const currentViewSnapshot: PricePreviewSnapshot = {
    baseImage: viewImages[currentViewKey] ?? "",
    canvasWidth: Math.max(1, Math.round(canvasSize.width || 0)),
    canvasHeight: Math.max(1, Math.round(canvasSize.height || 0)),
    restrictedBox: {
      left: restrictedBox.left,
      top: restrictedBox.top,
      width: restrictedBox.width,
      height: restrictedBox.height,
    },
    layers: Object.entries(persistedViewImageStates[currentViewKey] ?? {})
      .map(([uid, layer]) => {
        const canonicalPosition = canonicalCurrentViewPositions[uid];
        const savedCanvasPosition = layer?.canvasPositions?.[currentViewKey];
        const sizeFromCanonical = canonicalCurrentViewSizes[uid];
        const sizeFromLayer = layer?.size;
        const width = Number(
          sizeFromCanonical?.w ??
            savedCanvasPosition?.width ??
            sizeFromLayer?.w ??
            0
        );
        const height = Number(
          sizeFromCanonical?.h ??
            savedCanvasPosition?.height ??
            sizeFromLayer?.h ??
            0
        );
        const x = Number(canonicalPosition?.x ?? savedCanvasPosition?.x ?? 0);
        const y = Number(canonicalPosition?.y ?? savedCanvasPosition?.y ?? 0);

        if (width <= 0 || height <= 0) return null;

        return {
          uid,
          type:
            layer.type === "text"
              ? "text"
              : layer.isClipart
              ? "clipart"
              : "image",
          url: layer.url,
          text: layer.text,
          position: { x, y },
          size: { w: width, h: height },
          rotation: Number(layer.rotation ?? 0),
          flip: layer.flip ?? "none",
          color: layer.color,
          borderColor: layer.borderColor,
          borderWidth: layer.borderWidth,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          textAlign: layer.textAlign,
        };
      })
      .filter((layer): layer is NonNullable<typeof layer> => layer !== null),
  };

  const buildViewSnapshotForSave = (viewKey: ViewKey): PricePreviewSnapshot => {
    const seeded = pricePreviewByView[viewKey];
    const viewState = persistedViewImageStates[viewKey] ?? {};

    const layers = Object.entries(viewState)
      .map(([uid, layer]) => {
        const savedCanvasPosition = layer?.canvasPositions?.[viewKey];
        const width = Number(savedCanvasPosition?.width ?? layer?.size?.w ?? 0);
        const height = Number(savedCanvasPosition?.height ?? layer?.size?.h ?? 0);
        const x = Number(savedCanvasPosition?.x ?? 0);
        const y = Number(savedCanvasPosition?.y ?? 0);
        if (width <= 0 || height <= 0) return null;

        return {
          uid,
          type:
            layer.type === "text"
              ? "text"
              : layer.isClipart
              ? "clipart"
              : "image",
          url: layer.url,
          text: layer.text,
          position: { x, y },
          size: { w: width, h: height },
          rotation: Number(layer.rotation ?? 0),
          flip: layer.flip ?? "none",
          color: layer.color,
          borderColor: layer.borderColor,
          borderWidth: layer.borderWidth,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          textAlign: layer.textAlign,
        };
      })
      .filter((layer): layer is NonNullable<typeof layer> => layer !== null);

    return {
      baseImage: viewImages[viewKey] ?? seeded?.baseImage ?? "",
      canvasWidth: Math.max(1, Math.round(canvasSize.width || seeded?.canvasWidth || 0)),
      canvasHeight: Math.max(1, Math.round(canvasSize.height || seeded?.canvasHeight || 0)),
      restrictedBox: seeded?.restrictedBox ?? {
        left: restrictedBox.left,
        top: restrictedBox.top,
        width: restrictedBox.width,
        height: restrictedBox.height,
      },
      layers: layers.length > 0 ? layers : seeded?.layers ?? [],
    };
  };

  const previewByViewForSave: Record<ViewKey, PricePreviewSnapshot | undefined> = {
    front: buildViewSnapshotForSave("front"),
    back: buildViewSnapshotForSave("back"),
    leftSleeve: buildViewSnapshotForSave("leftSleeve"),
    rightSleeve: buildViewSnapshotForSave("rightSleeve"),
  };
  previewByViewForSave[currentViewKey] = currentViewSnapshot;
  const compositePngByView: Partial<Record<ViewKey, string>> = {};
  const orderedViews: ViewKey[] = ["front", "back", "leftSleeve", "rightSleeve"];
  const exactCurrentViewPng = await captureCanvasCompositePng(canvasRef.current);
  if (exactCurrentViewPng) {
    compositePngByView[currentViewKey] = exactCurrentViewPng;
  }

  for (const viewKey of orderedViews) {
    if (compositePngByView[viewKey]) continue;
    const snapshot = previewByViewForSave[viewKey] ?? buildViewSnapshotForSave(viewKey);
    const snapshotPng = await renderSnapshotToPng(snapshot);
    if (snapshotPng) {
      compositePngByView[viewKey] = snapshotPng;
    }
  }

  if (!compositePngByView[currentViewKey]) {
    setSaveDialogError("Could not capture the current side PNG. Please try again.");
    setIsSavingDesign(false);
    return;
  }

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
          positions: canonicalCurrentViewPositions,
          sizes: canonicalCurrentViewSizes,
          uploadedImages,
          currentViewKey,
          selectedColour,
          selectedSize,
          selectedDesignType,
          baseViewImages: viewImages,
          previewByView: previewByViewForSave,
          compositePngByView,
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
    designType,
    previewSnapshot,
    previewByView,
  }: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
    unitPrice: number;
    designType: DesignType;
    previewSnapshot?: PricePreviewSnapshot;
    previewByView?: Partial<Record<ViewKey, PricePreviewSnapshot>>;
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
          designType,
          previewSnapshot,
          previewByView,
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
        designType,
        previewSnapshot,
        previewByView,
      });
    }

    closePricePanel();
  };

  const handleBuyNowFromPrice = ({
    quantity,
    sizeBreakdown,
    unitPrice,
    designType,
    previewSnapshot,
    previewByView,
  }: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
    unitPrice: number;
    designType: DesignType;
    previewSnapshot?: PricePreviewSnapshot;
    previewByView?: Partial<Record<ViewKey, PricePreviewSnapshot>>;
  }) => {
    handleAddToCartFromPrice({ quantity, sizeBreakdown, unitPrice, designType, previewSnapshot, previewByView });
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

  const [displayImages, setDisplayImages] = useState<string[]>(
    normalizeDesignImages(currentProduct?.images ?? [])
  );
  
  // === ADD THIS ===
const viewImages = useMemo<ViewImages>(() => {
  return {
    front: displayImages[0] ?? "",
    back: displayImages[1] ?? "",
    leftSleeve: displayImages[2] ?? "",
    rightSleeve: displayImages[3] ?? "",
  };
}, [displayImages]);

const [viewImageNaturalSizes, setViewImageNaturalSizes] = useState<Record<string, ImageNaturalSize>>({});

useEffect(() => {
  const sources = Object.values(viewImages).filter(Boolean);
  if (sources.length === 0) return;

  let cancelled = false;
  sources.forEach((src) => {
    const key = normalizeImageBoxKey(src);
    if (!key || isNaturalSizeValid(viewImageNaturalSizes[key])) return;

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      const width = Number(img.naturalWidth || 0);
      const height = Number(img.naturalHeight || 0);
      if (width <= 0 || height <= 0) return;

      setViewImageNaturalSizes((prev) => {
        if (isNaturalSizeValid(prev[key])) return prev;
        return {
          ...prev,
          [key]: { width, height },
        };
      });
    };
    img.src = src;
  });

  return () => {
    cancelled = true;
  };
}, [viewImages, viewImageNaturalSizes]);

const [pricePreviewByView, setPricePreviewByView] =
  useState<Record<ViewKey, PricePreviewSnapshot | undefined>>(createEmptyPricePreviewByView);

const pricePanelSides = useMemo(
  () => buildPricePanelSides(viewImageStates, viewImages, pricePreviewByView),
  [viewImageStates, viewImages, pricePreviewByView]
);

  const captureCanvasSnapshot = useCallback(() => {
    const canonicalPositions = deepCloneValue(positions);
    const canonicalSizes = deepCloneValue(sizes);
    const canonicalViewImageStates = deepCloneValue(viewImageStates);
    const currentViewState = canonicalViewImageStates[currentViewKey] ?? {};
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    Object.entries(currentViewState).forEach(([uid, layer]) => {
      const existingPosition = canonicalPositions[uid];
      const fallbackSize = canonicalSizes[uid] ?? layer.size;
      const existingScale =
        layer.canvasPositions?.[currentViewKey]?.scale ??
        existingPosition?.scale ??
        1;

      let x = layer.canvasPositions?.[currentViewKey]?.x ?? existingPosition?.x;
      let y = layer.canvasPositions?.[currentViewKey]?.y ?? existingPosition?.y;
      let width =
        layer.canvasPositions?.[currentViewKey]?.width ??
        fallbackSize?.w ??
        existingPosition?.width;
      let height =
        layer.canvasPositions?.[currentViewKey]?.height ??
        fallbackSize?.h ??
        existingPosition?.height;

      if (layer.type === "text" && canvasRect) {
        const element = document.querySelector<HTMLElement>(
          `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
        );
        if (element) {
          const rect = element.getBoundingClientRect();
          x = Number((rect.left - canvasRect.left).toFixed(2));
          y = Number((rect.top - canvasRect.top).toFixed(2));
          width = Number(rect.width.toFixed(1));
          height = Number(rect.height.toFixed(1));
        }
      }

      if (
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined
      ) {
        return;
      }

      canonicalPositions[uid] = {
        x,
        y,
        width,
        height,
        scale: existingScale,
      };
      canonicalSizes[uid] = { w: width, h: height };
      currentViewState[uid] = {
        ...layer,
        size: { w: width, h: height },
        canvasPositions: {
          ...(layer.canvasPositions ?? {}),
          [currentViewKey]: {
            ...(layer.canvasPositions?.[currentViewKey] ?? {}),
            x,
            y,
            width,
            height,
            scale: existingScale,
          },
        },
      };
    });

    canvasSnapshotRef.current = {
      positions: canonicalPositions,
      sizes: canonicalSizes,
      viewImageStates: canonicalViewImageStates,
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
    canvasRef,
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

  const closePricePanel = useCallback(() => {
    setIsPricePanelOpen(false);
    window.requestAnimationFrame(() => {
      applyCanvasSnapshot(true);
      window.requestAnimationFrame(() => {
        triggerCanvasResizeRef.current();
      });
    });
  }, [applyCanvasSnapshot]);

  // ---------------- UTILS ----------------
  const setSelectedUploadedImageWithLog = (uid: string | null) => {
    setSelectedUploadedImage(uid);

    // If an uploaded image is selected, always switch sidebar to Upload
    if (uid) {
      setSidebarStack(["upload"]);
    }
  };

    const restrictedBoxesByImageKey = useMemo<Record<string, RestrictedBoxRatio>>(() => {
      const merged: Record<string, RestrictedBoxRatio> = {};
      const attachBox = (rawKey: unknown, rawBox: unknown) => {
        const key = normalizeImageBoxKey(rawKey);
        if (!key || !isRestrictedBoxRatioValid(rawBox)) return;
        merged[key] = {
          left: Number(rawBox.left),
          top: Number(rawBox.top),
          width: Number(rawBox.width),
          height: Number(rawBox.height),
        };
      };

      const productImageBoxes = (currentProduct as any)?.image_boxes ?? {};
      Object.entries(productImageBoxes).forEach(([key, box]) => attachBox(key, box));

      const colourProducts = (currentProduct as any)?.colourProducts ?? [];
      colourProducts.forEach((colourProduct: any) => {
        Object.entries(colourProduct?.image_boxes ?? {}).forEach(([key, box]) => attachBox(key, box));
      });

      return merged;
    }, [currentProduct]);

    const activeViewImage = viewImages[currentViewKey] ?? "";
    const activeViewImageKey = normalizeImageBoxKey(activeViewImage);
    const activeRestrictedBoxRatio = useMemo<RestrictedBoxRatio | null>(() => {
      if (!activeViewImage) return null;
      if (activeViewImageKey && restrictedBoxesByImageKey[activeViewImageKey]) {
        return restrictedBoxesByImageKey[activeViewImageKey];
      }
      return null;
    }, [activeViewImage, activeViewImageKey, restrictedBoxesByImageKey]);

    const renderedImageRect = useMemo(() => {
      const canvasWidth = canvasSize.width;
      const canvasHeight = canvasSize.height;
      const fallback = {
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
      };

      if (canvasWidth <= 0 || canvasHeight <= 0) {
        return fallback;
      }

      const naturalSize = activeViewImageKey ? viewImageNaturalSizes[activeViewImageKey] : undefined;
      if (!isNaturalSizeValid(naturalSize)) {
        return fallback;
      }

      const imageAspect = naturalSize.width / naturalSize.height;
      const canvasAspect = canvasWidth / canvasHeight;
      if (!Number.isFinite(imageAspect) || imageAspect <= 0 || !Number.isFinite(canvasAspect) || canvasAspect <= 0) {
        return fallback;
      }

      if (imageAspect > canvasAspect) {
        const width = canvasWidth;
        const height = width / imageAspect;
        return {
          left: 0,
          top: (canvasHeight - height) / 2,
          width,
          height,
        };
      }

      const height = canvasHeight;
      const width = height * imageAspect;
      return {
        left: (canvasWidth - width) / 2,
        top: 0,
        width,
        height,
      };
    }, [activeViewImageKey, canvasSize.height, canvasSize.width, viewImageNaturalSizes]);

    const restrictedBox = useMemo(
      () => ({
        left: renderedImageRect.left + renderedImageRect.width * (activeRestrictedBoxRatio?.left ?? 0),
        top: renderedImageRect.top + renderedImageRect.height * (activeRestrictedBoxRatio?.top ?? 0),
        width: renderedImageRect.width * (activeRestrictedBoxRatio?.width ?? 1),
        height: renderedImageRect.height * (activeRestrictedBoxRatio?.height ?? 1),
      }),
      [activeRestrictedBoxRatio, renderedImageRect]
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

  const variantsByColour = useMemo<Record<string, ProductVariantOption[]>>(
    () => buildVariantsByColour(currentProduct),
    [currentProduct]
  );



    const uniqueColours = Object.keys(variantsByColour);
    const [selectedColour, setSelectedColour] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedDesignType, setSelectedDesignType] = useState<DesignType>(
      normalizeDesignType(propDesignType)
    );

const pricePanelAvailableSizes = useMemo(
  () =>
    getPricePanelAvailableSizes(
      selectedColour,
      uniqueColours,
      variantsByColour,
      safeProduct.sizes ?? []
    ),
  [selectedColour, uniqueColours, variantsByColour, safeProduct.sizes]
);




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
  const loadDiagnosticLoggedRef = useRef(false);
  const lastAppliedPropSelectionKeyRef = useRef<string | null>(null);

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

        const existingCanvasPosition = existing.canvasPositions?.[viewKey];
        hydratedViewImageStates[viewKey][layer.uid] = {
          ...existing,
          size: { w: layer.size.w, h: layer.size.h },
          canvasPositions: {
            ...(existing.canvasPositions ?? {}),
            [viewKey]: existingCanvasPosition
              ? {
                  ...existingCanvasPosition,
                  relX,
                  relY,
                  relW,
                  relH,
                }
              : {
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
      ...seededPositionsFromPreview,
      ...(payload.positions ?? {}),
    };
    const mergedSizes = {
      ...seededSizesFromPreview,
      ...(payload.sizes ?? {}),
    };

    const viewKeyForPersistedPositions: ViewKey = payload.currentViewKey ?? "front";
    const applyPersistedCanvasMetadata = (
      state: Record<string, ImageState>,
      viewKey: ViewKey
    ) => {
      const nextState: Record<string, ImageState> = {};
      Object.entries(state).forEach(([uid, layer]) => {
        const savedPosition = mergedPositions[uid];
        const savedSize = mergedSizes[uid];
        const nextLayer: ImageState = { ...layer };
        const existingViewCanvasPosition = layer?.canvasPositions?.[viewKey];

        if (savedSize) {
          nextLayer.size = { ...savedSize };
        } else if (!nextLayer.size && savedPosition) {
          nextLayer.size = { w: savedPosition.width, h: savedPosition.height };
        }

        if (savedPosition && !existingViewCanvasPosition) {
          nextLayer.canvasPositions = {
            ...(layer?.canvasPositions ?? {}),
            [viewKey]: savedPosition,
          };
        }

        nextState[uid] = nextLayer;
      });
      return nextState;
    };

    const hydratedWithCanvasMetadata = {
      ...hydratedViewImageStates,
      [viewKeyForPersistedPositions]: applyPersistedCanvasMetadata(
        hydratedViewImageStates[viewKeyForPersistedPositions] ?? {},
        viewKeyForPersistedPositions
      ),
    };

    const restoredCurrentView = hydratedWithCanvasMetadata[viewKeyForPersistedPositions] ?? {};
    const restoredPositionsFromView = Object.entries(restoredCurrentView).reduce<
      Record<string, { x: number; y: number; width: number; height: number; scale: number }>
    >((acc, [uid, layer]) => {
      const saved = layer?.canvasPositions?.[viewKeyForPersistedPositions];
      if (!saved) return acc;
      const width = Number(saved.width ?? layer?.size?.w ?? 0);
      const height = Number(saved.height ?? layer?.size?.h ?? 0);
      if (width <= 0 || height <= 0) return acc;
      acc[uid] = {
        x: Number(saved.x ?? 0),
        y: Number(saved.y ?? 0),
        width,
        height,
        scale: Number(saved.scale ?? 1),
      };
      return acc;
    }, {});
    const restoredSizesFromView = Object.entries(restoredCurrentView).reduce<
      Record<string, { w: number; h: number }>
    >((acc, [uid, layer]) => {
      const saved = layer?.canvasPositions?.[viewKeyForPersistedPositions];
      const width = Number(saved?.width ?? layer?.size?.w ?? 0);
      const height = Number(saved?.height ?? layer?.size?.h ?? 0);
      if (width <= 0 || height <= 0) return acc;
      acc[uid] = { w: width, h: height };
      return acc;
    }, {});

    setViewImageStates(hydratedWithCanvasMetadata);
    setPositions(
      Object.keys(restoredPositionsFromView).length > 0
        ? restoredPositionsFromView
        : mergedPositions
    );
    if (!loadDiagnosticLoggedRef.current) {
      const frontLayers = hydratedWithCanvasMetadata.front ?? {};
      const frontCanvasPositions = Object.fromEntries(
        Object.entries(frontLayers).map(([uid, layer]) => [
          uid,
          layer?.canvasPositions?.front,
        ])
      );
      console.log("[Design Load] front canvasPositions", frontCanvasPositions);
      console.log("[Design Load] merged positions", mergedPositions);
      loadDiagnosticLoggedRef.current = true;
    }
    setSizes(
      Object.keys(restoredSizesFromView).length > 0
        ? restoredSizesFromView
        : mergedSizes
    );
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

    if (payload.selectedDesignType !== undefined) {
      setSelectedDesignType(normalizeDesignType(payload.selectedDesignType));
    }

    hasAppliedInitialSavedDesign.current = true;
  }, [initialSavedDesign]);

    // ---------------- EFFECTS ----------------

    // 🔁 Sync Inertia props → local state (IMPORTANT)
  useEffect(() => {
    if (!product) return;

    const incomingSelectionKey = `${String(product?.id ?? "")}|${String(propColour ?? "")}|${String(propSize ?? "")}|${String(propDesignType ?? "")}`;
    if (lastAppliedPropSelectionKeyRef.current === incomingSelectionKey) {
      return;
    }

    setCurrentProduct(product);
    const resolvedColour = (() => {
      if (!propColour || uniqueColours.length === 0) return propColour ?? null;
      const incomingColour = String(propColour).trim().toLowerCase();
      return uniqueColours.find((colour) => colour.trim().toLowerCase() === incomingColour) ?? propColour;
    })();

    if (resolvedColour) {
      setSelectedColour(resolvedColour);
    }

    if (propSize) {
      const incomingSize = String(propSize).trim().toLowerCase();
      const candidateSizesForColour =
        resolvedColour && variantsByColour[resolvedColour]
          ? variantsByColour[resolvedColour]
              .map((variant) => variant.size)
              .filter((size): size is string => typeof size === "string" && size.trim().length > 0)
          : [];
      const fallbackSizes =
        safeProduct.sizes?.filter((size): size is string => typeof size === "string" && size.trim().length > 0) ?? [];
      const sizePool = candidateSizesForColour.length > 0 ? candidateSizesForColour : fallbackSizes;
      const matchedSize = sizePool.find((size) => size.trim().toLowerCase() === incomingSize) ?? propSize;
      setSelectedSize(matchedSize);
    }

    const savedDesignType = (initialSavedDesign as SavedDesign | null)?.payload?.selectedDesignType;
    if (savedDesignType === undefined) {
      setSelectedDesignType(normalizeDesignType(propDesignType));
    }

    lastAppliedPropSelectionKeyRef.current = incomingSelectionKey;
  }, [product, propColour, propSize, propDesignType, safeProduct.sizes, uniqueColours, variantsByColour, initialSavedDesign]);

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
    if (!selectedColour || !variantsByColour[selectedColour]) return;

    const sizesForColour = Array.from(
      new Set(
        variantsByColour[selectedColour]
          .map((variant) => variant.size)
          .filter((size): size is string => typeof size === "string" && size.trim().length > 0)
      )
    );

    if (sizesForColour.length === 0) {
      if (selectedSize !== null) setSelectedSize(null);
      return;
    }

    if (!selectedSize) {
      setSelectedSize(sizesForColour[0]);
      return;
    }

    const normalizedSelectedSize = selectedSize.trim().toLowerCase();
    const matchedSize =
      sizesForColour.find((size) => size.trim().toLowerCase() === normalizedSelectedSize) ?? null;

    if (!matchedSize) {
      setSelectedSize(sizesForColour[0]);
      return;
    }

    if (matchedSize !== selectedSize) {
      setSelectedSize(matchedSize);
    }
  }, [selectedColour, selectedSize, variantsByColour]);


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
      closePricePanel();
    };

    document.addEventListener("mousedown", handleOutsideDown);
    document.addEventListener("touchstart", handleOutsideDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideDown);
      document.removeEventListener("touchstart", handleOutsideDown);
    };
  }, [isPricePanelOpen, closePricePanel]);

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
  }, [selectedUploadedImage, currentImageState]);


useEffect(() => {
  if (displayImages.length > 0) {
    setMainImage(displayImages[0]); // default to the first image immediately
  }
}, [displayImages]);

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
      selectedDesignType,
    };

    setHistory([snapshot]);
    setHistoryIndex(0);
    hasSeededHistory.current = true;
  }, [currentProduct, selectedColour, selectedDesignType]);

  // ---------- PRODUCT CHANGES ----------
  const handleColourChange = (colour: string) => {
    if (colour === selectedColour) return;
    setSelectedColour(colour);

    // Keep current size if available in this colour, else fallback to first colour size.
    const variants = variantsByColour[colour];
    if (variants?.length) {
      const availableSizes = Array.from(
        new Set(
          variants
            .map((variant) => variant.size)
            .filter((size): size is string => typeof size === "string" && size.trim().length > 0)
        )
      );
      const normalizedSelectedSize = selectedSize?.trim().toLowerCase() ?? "";
      const nextSize =
        availableSizes.find((size) => size.trim().toLowerCase() === normalizedSelectedSize) ??
        availableSizes[0] ??
        null;
      setSelectedSize(nextSize);

      const nextVariant = (nextSize
        ? variants.find((variant) => variant.size === nextSize)
        : undefined) ?? variants[0];
      const images = normalizeDesignImages(nextVariant?.images ?? []);
      setDisplayImages(images);
      setMainImage(images[0] ?? "");
    } else {
      // fallback
      setSelectedSize(null);
      const fallbackImages = normalizeDesignImages(currentProduct?.images ?? []);
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
      { designType: selectedDesignType },
      { preserveState: false } // can be true if you want smoother Inertia reload
    );
  };

  const handleSavedDesignSelect = (savedDesign: SavedDesign) => {
    if (!savedDesign.product?.slug) return;
    setCurrentDesignName(savedDesign.name);

    router.get(
      route("design.show", { slug: savedDesign.product.slug }),
      { savedDesign: savedDesign.id, designType: selectedDesignType },
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
      ...createEmptyPricePreviewByView(),
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
      const fallbackImages = normalizeDesignImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
      return;
    }

    // Colour selected → get variant by size
    const colourVariants = variantsByColour[selectedColour];

    // Pick the variant that matches selectedSize, fallback to first
    const variant = colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];

    const images = normalizeDesignImages(variant?.images ?? []);
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
const handleValidateUploadImage = async (file: File) => {
  try {
    const moderation = await moderateDesignImage(file);
    if (!moderation.allowed) {
      showError(moderation.message ?? "Image contains restricted content. Please upload a different image.");
    }
    return moderation;
  } catch (error) {
    showError("Image moderation is temporarily unavailable. Please try again shortly.");
    return {
      allowed: false,
      message: "Image moderation is temporarily unavailable. Please try again shortly.",
    };
  }
};

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
        [currentViewKey]: { x: 100, y: 100, width: defaultSize.w, height: defaultSize.h, scale: 1 },
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
  const originalPos =
    source.canvasPositions?.[currentViewKey] ??
    source.canvasPositions?.[uid] ??
    { x: 100, y: 100, width: source.size.w, height: source.size.h, scale: 1 };
  setUploadedImages(prev => [...prev, dup]);
  updateCurrentImageState({
    [dup]: {
      ...source,
      renderKey: crypto.randomUUID(),
      canvasPositions: {
        [currentViewKey]: { ...originalPos, x: originalPos.x + 20, y: originalPos.y + 20 },
      },
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
          selectedDesignType={selectedDesignType}
          onColourChange={handleColourChange}
          onSizeChange={handleSizeChange}
          onDesignTypeChange={setSelectedDesignType}
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
          onValidateUpload={handleValidateUploadImage}
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
        onAddText={async (layer) => {
          let moderation;
          try {
            moderation = await moderateDesignText(layer.text);
          } catch {
            showError("Text moderation is temporarily unavailable. Please try again shortly.");
            return false;
          }
          if (!moderation.allowed) {
            showError(moderation.message ?? "Text contains restricted content and cannot be used.");
            return false;
          }

          const nextSize = layer.size ?? { w: 0, h: 0 };
          updateCurrentImageState({
            [layer.id]: {
              url: "",
              type: "text",
              text: layer.text,
              rotation: 0,
              flip: "none",
              size: nextSize,
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
                size: nextSize,
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
          if (nextSize.w > 0 && nextSize.h > 0) {
            setSizes((prev) => ({ ...prev, [layer.id]: nextSize }));
          }

          setSelectedText(layer.id);
          setSidebarStack(["text"]);
          return true;
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
      onTextCommit={async (value) => {
        const cleanValue = value.trim();
        if (cleanValue === "") {
          updateCurrentImageState((prev) => ({
            ...prev,
            [selectedText]: {
              ...prev[selectedText],
              original: {
                ...(prev[selectedText]?.original ?? {}),
                text: "",
              },
            },
          }));
          return;
        }

        let moderation;
        try {
          moderation = await moderateDesignText(value);
        } catch {
          showError("Text moderation is temporarily unavailable. Please try again shortly.");
          return;
        }
        if (!moderation.allowed) {
          showError(moderation.message ?? "Text contains restricted content and cannot be used.");
          const fallbackText = currentImageState[selectedText]?.original?.text ?? "";
          updateTextLayer(selectedText, {
            text: fallbackText,
            renderKey: crypto.randomUUID(),
          });
          return;
        }

        updateCurrentImageState((prev) => ({
          ...prev,
          [selectedText]: {
            ...prev[selectedText],
            original: {
              ...(prev[selectedText]?.original ?? {}),
              text: value,
            },
          },
        }));
      }}
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

const activeSidebarTitle = getSidebarTitle({
  activeSidebar,
  selectedObjectsCount: selectedObjects.length,
  sidebarTitleOverride,
  selectedText,
  selectedUploadedImage,
  currentImageState,
  isUserSignedIn,
});

const handleSidebarTabSelect = (tab: "product" | "upload" | "text" | "clipart") => {
  setSidebarStack([tab as SidebarView]);
  if (tab !== "clipart" && tab !== "upload") setSelectedUploadedImageWithLog(null);
  if (tab !== "text") setSelectedText(null);
};

const designPageContextValue = {
  isPricePanelOpen,
  activeSidebar,
  canGoBack,
  onBack: goBackSidebar,
  onClose: handleCloseSidebar,
  onSelectTab: handleSidebarTabSelect,
  headerTitle: activeSidebarTitle,
  sidebarContent: renderActiveTab(),
  canvas: (
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
  ),
  preview: (
    <DesignPreview
      snapshot={pricePreviewByView.front}
      fallbackImage={viewImages.front}
      width={previewWidth}
      alt="Front design preview"
      className="h-full w-full max-w-none"
      noFrame
    />
  ),
  pricePanel: (
    <GetPriceUI
      onClose={closePricePanel}
      productName={safeProduct.name ?? "Unknown Product"}
      selectedColour={selectedColour}
      availableColours={uniqueColours}
      onColourChange={handleColourChange}
      sides={pricePanelSides}
      basePrice={safeProduct.price}
      availableSizes={pricePanelAvailableSizes}
      selectedSize={selectedSize}
      onSizeChange={handleSizeChange}
      selectedDesignType={selectedDesignType}
      onDesignTypeChange={setSelectedDesignType}
      onAddToCart={handleAddToCartFromPrice}
      onBuyNow={handleBuyNowFromPrice}
    />
  ),
  pricePanelRef,
};
  
  return (
    <>
      <div className="min-h-screen bg-gray-200 relative disable-selection">
      <Head title="Start Designing" />

      {isChangeProductModalOpen && (
        <ChangeProductModal
          onClose={() => setIsChangeProductModalOpen(false)}
          currentCategory={currentProduct?.categories?.[0]}
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

          <DesignPageProvider value={designPageContextValue}>
            {!isPricePanelOpen ? <DesignSidebars /> : null}

            {/* MAIN CANVAS */}
            <DesignWorkspaceLayout />
          </DesignPageProvider>

          <SaveDesignDialog
            open={isSaveDialogOpen}
            isSavingDesign={isSavingDesign}
            pendingDesignName={pendingDesignName}
            maxDesignNameLength={MAX_DESIGN_NAME_LENGTH}
            saveDialogError={saveDialogError}
            savedDesignCount={savedDesigns.length}
            maxSavedDesigns={MAX_SAVED_DESIGNS}
            currentSavedDesignId={currentSavedDesignId}
            saveMode={saveMode}
            onPendingDesignNameChange={value => {
              setPendingDesignName(value);
              if (saveDialogError) setSaveDialogError(null);
            }}
            onSaveModeChange={setSaveMode}
            onClose={() => setIsSaveDialogOpen(false)}
            onSave={() => handleSaveDesign(pendingDesignName, saveMode)}
          />
        </div>
      </div>
    </div>
    <CartSidebar />
  </>
);
}
