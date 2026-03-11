import { Link } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  ExternalLink,
  Loader2,
  LocateFixed,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Truck,
  Type,
  UserRound,
} from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import DesignPreview from "@/Pages/Design/Components/DesignPreview";
import { renderSnapshotToPng, renderTextLayerToPng } from "@/Pages/Design/utils/renderSnapshotToPng";
import type { PricePreviewLayer, PricePreviewSnapshot } from "@/Pages/Design/Canvas/Canvas";
import { AdminOrdersProvider, useAdminOrders, type AdminOrderItem } from "@/Context/AdminOrdersContext";
import { AdminOrderReturnsProvider, useAdminOrderReturns } from "@/Context/AdminOrderReturnsContext";
import AdminOrderReturnsPanel from "@/Pages/Admin/Orders/ReturnsPanel";
import { designTypeLabel, normalizeDesignType } from "@/Utils/designType";

declare global {
  interface Window {
    google?: any;
  }
}

const STATUS_STEPS = ["Order placed", "Preparing", "Packed", "Dispatched", "Delivered"];
const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "YOUR_GOOGLE_MAPS_API_KEY";

type AdminCoords = { lat: number; lng: number };
type DropoffPoint = {
  id: string;
  placeId?: string | null;
  name: string;
  address: string;
  mapsUrl: string;
  distanceMiles?: number | null;
  openingHours?: string | null;
  openNow?: boolean | null;
};

const VIEW_LABELS: Record<string, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
};

const PARCEL_SIZE_PRESETS: Record<
  "very_small" | "small" | "medium" | "large",
  { label: string; description: string; image: string }
> = {
  very_small: {
    label: "Very Small",
    description: "Fits through a letterbox. Great for t-shirts, thin clothing, documents.",
    image: "/images/Admin/parcels/Verysmall.png",
  },
  small: {
    label: "Small",
    description: "Good for shoes, hoodies, small boxed items.",
    image: "/images/Admin/parcels/Small.png",
  },
  medium: {
    label: "Medium",
    description: "Good for multiple clothing items and bulkier goods.",
    image: "/images/Admin/parcels/Medium.png",
  },
  large: {
    label: "Large",
    description: "Good for large multi-item orders.",
    image: "/images/Admin/parcels/Large.png",
  },
};

const formatMoney = (value?: number | null) => `£${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const londonDateKey = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const day = parts.find((part) => part.type === "day")?.value || "01";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const year = parts.find((part) => part.type === "year")?.value || "1970";

  return `${year}-${month}-${day}`;
};

const normalizedStatus = (status?: string | null) => (status || "").toLowerCase().replace(/\s+/g, "_").trim();

const toDisplayStatus = (status?: string | null) => {
  const s = normalizedStatus(status);
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("deliver")) return "Delivered";
  if (s.includes("dispatch") || s.includes("out_for_delivery") || s.includes("outfordelivery")) return "Dispatched";
  if (s.includes("pack")) return "Packed";
  if (s.includes("production") || s.includes("process")) return "Preparing";
  return "Order placed";
};

const statusToStepIndex = (status?: string | null) => {
  const s = normalizedStatus(status);
  if (s.includes("cancel")) return 0;
  if (s.includes("deliver")) return 4;
  if (s.includes("dispatch") || s.includes("out_for_delivery") || s.includes("outfordelivery")) return 3;
  if (s.includes("pack")) return 2;
  if (s.includes("production") || s.includes("process")) return 1;
  return 0;
};

const statusClassName = (status?: string | null) => {
  const s = normalizedStatus(status);
  if (s.includes("cancel")) return "border-[#F4C7C1] bg-[#FFF2F1] text-[#9F3126]";
  if (s.includes("deliver")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (s.includes("dispatch") || s.includes("out_for_delivery") || s.includes("outfordelivery")) {
    return "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]";
  }
  if (s.includes("pack")) return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
  return "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]";
};

const asSnapshot = (value: unknown): PricePreviewSnapshot | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const maybeSnapshot = value as PricePreviewSnapshot;
  if (!maybeSnapshot.baseImage || !Array.isArray(maybeSnapshot.layers)) return undefined;
  return maybeSnapshot;
};

const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const detectCourierProvider = (service?: string | null) => {
  const value = (service || "").trim().toLowerCase();
  if (!value) return "Courier";
  if (value.includes("royal")) return "Royal Mail";
  if (value.includes("evri") || value.includes("hermes")) return "Evri";
  if (value.includes("dpd")) return "DPD";
  if (value.includes("ups")) return "UPS";
  if (value.includes("dhl")) return "DHL";
  if (value.includes("fedex")) return "FedEx";
  if (value.includes("yodel")) return "Yodel";
  return service?.trim() || "Courier";
};

const dropoffQueriesForCourier = (courier: string) => {
  const value = courier.toLowerCase();
  if (value.includes("royal")) return ["Royal Mail delivery office", "Post Office parcel drop off"];
  if (value.includes("evri")) return ["Evri parcelshop", "Evri drop off point"];
  if (value.includes("dpd")) return ["DPD pickup shop", "DPD drop off point"];
  if (value.includes("ups")) return ["UPS Access Point"];
  if (value.includes("dhl")) return ["DHL Service Point"];
  if (value.includes("fedex")) return ["FedEx drop off"];
  return [`${courier} drop off point`, `${courier} parcel shop`];
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceInMiles = (from: AdminCoords, to: AdminCoords) => {
  const earthKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (earthKm * c) * 0.621371;
};

const getAdminCoords = async (): Promise<AdminCoords> => {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation is not available in this browser.");
  }

  return new Promise<AdminCoords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => reject(new Error("Location permission is required to find nearby drop-off points.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  });
};

const loadGoogleMapsPlaces = async () => {
  if (window.google?.maps?.places) return window.google;

  if (window.google?.maps && typeof window.google.maps.importLibrary === "function") {
    await window.google.maps.importLibrary("places");
    if (window.google?.maps?.places) return window.google;
  }

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
    throw new Error("Google Maps API key is missing.");
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="admin-orders-dropoff"]');
    if (existing) {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      const onError = () => reject(new Error("Unable to load Google Maps."));
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "admin-orders-dropoff";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  });

  if (!window.google?.maps?.places) {
    throw new Error("Google Places library is unavailable.");
  }

  return window.google;
};

const findNearestDropoffPoints = async (courier: string, origin: AdminCoords): Promise<DropoffPoint[]> => {
  const googleApi = await loadGoogleMapsPlaces();
  const map = new googleApi.maps.Map(document.createElement("div"));
  const placesService = new googleApi.maps.places.PlacesService(map);
  const queries = dropoffQueriesForCourier(courier);
  const collected: DropoffPoint[] = [];
  const weekdayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date()).toLowerCase();

  const runQuery = (query: string) => new Promise<any[]>((resolve, reject) => {
    placesService.textSearch(
      {
        query,
        location: new googleApi.maps.LatLng(origin.lat, origin.lng),
        radius: 15000,
      },
      (results: any[], status: string) => {
        if (status === googleApi.maps.places.PlacesServiceStatus.OK || status === "OK") {
          resolve(results || []);
          return;
        }
        if (status === googleApi.maps.places.PlacesServiceStatus.ZERO_RESULTS || status === "ZERO_RESULTS") {
          resolve([]);
          return;
        }
        reject(new Error("Unable to fetch courier drop-off points right now."));
      }
    );
  });

  for (const query of queries) {
    const results = await runQuery(query);
    for (const result of results) {
      const name = String(result?.name || "").trim();
      const address = String(result?.formatted_address || "").trim();
      if (!name || !address) continue;
      const placeId = String(result?.place_id || "").trim();
      const location = result?.geometry?.location;
      const lat = typeof location?.lat === "function" ? Number(location.lat()) : null;
      const lng = typeof location?.lng === "function" ? Number(location.lng()) : null;
      const distanceMiles = lat !== null && lng !== null ? distanceInMiles(origin, { lat, lng }) : null;

      collected.push({
        id: placeId || `${name}-${address}`,
        placeId: placeId || null,
        name,
        address,
        mapsUrl: placeId
          ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`,
        distanceMiles,
        openingHours: null,
        openNow: null,
      });
    }
  }

  const deduped = Array.from(new Map(collected.map((point) => [point.id, point])).values());
  deduped.sort((a, b) => (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER));
  const topCandidates = deduped.slice(0, 6);

  const getPlaceDetails = (placeId: string) => new Promise<{ openingHours: string | null; openNow: boolean | null }>((resolve) => {
    placesService.getDetails(
      {
        placeId,
        fields: ["opening_hours"],
      },
      (result: any, status: string) => {
        if (status !== googleApi.maps.places.PlacesServiceStatus.OK && status !== "OK") {
          resolve({ openingHours: null, openNow: null });
          return;
        }

        const openNow = typeof result?.opening_hours?.open_now === "boolean"
          ? Boolean(result.opening_hours.open_now)
          : null;
        const weekdayText: string[] = Array.isArray(result?.opening_hours?.weekday_text)
          ? result.opening_hours.weekday_text
          : [];
        const todayLine = weekdayText.find((line) => line.toLowerCase().startsWith(`${weekdayName}:`)) || null;
        const openingHours = todayLine ? todayLine.replace(/^[^:]+:\s*/, "").trim() : null;

        resolve({ openingHours, openNow });
      }
    );
  });

  const enriched = await Promise.all(
    topCandidates.map(async (point) => {
      if (!point.placeId) return point;
      const details = await getPlaceDetails(point.placeId);
      return {
        ...point,
        openingHours: details.openingHours,
        openNow: details.openNow,
      };
    })
  );

  return enriched;
};

const getPrimaryAction = (status?: string | null): { label: string; targetStatus: string; requiresTracking?: boolean } | null => {
  const s = normalizedStatus(status);

  if (s.includes("cancel") || s.includes("deliver")) return null;
  if (s.includes("dispatch") || s.includes("out_for_delivery") || s.includes("outfordelivery")) return null;
  if (s.includes("pack")) return { label: "Start Dispatch", targetStatus: "start_dispatch" };
  if (s.includes("production") || s.includes("process")) return { label: "Mark Packed", targetStatus: "packed" };
  return { label: "Start Production", targetStatus: "in_production" };
};

const getPreviewEntriesForItem = (item?: AdminOrderItem | null) => {
  if (!item) return [] as Array<{ viewKey: string; snapshot: PricePreviewSnapshot }>;

  const fromViews = Object.entries(item.preview_by_view || {})
    .map(([viewKey, snapshot]) => ({ viewKey, snapshot: asSnapshot(snapshot) }))
    .filter((entry): entry is { viewKey: string; snapshot: PricePreviewSnapshot } => Boolean(entry.snapshot));

  if (fromViews.length > 0) return fromViews;

  const fallback = asSnapshot(item.preview_snapshot);
  return fallback ? [{ viewKey: "front", snapshot: fallback }] : [];
};

function OrdersWorkspace() {
  const {
    loadingOrders,
    loadingOrderDetail,
    saving,
    orders,
    selectedOrderId,
    selectedOrder,
    newOrdersCount,
    error,
    refreshOrders,
    selectOrder,
    updateStatus,
    sendMessage,
    generateLabel,
    archiveOrder,
  } = useAdminOrders();
  const { pendingCount: pendingReturnsCount } = useAdminOrderReturns();

  const [search, setSearch] = useState("");
  const [ordersView, setOrdersView] = useState<"active" | "archived" | "all">("active");
  const [dispatchTracking, setDispatchTracking] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showParcelSizes, setShowParcelSizes] = useState(false);
  const [reviewingItemId, setReviewingItemId] = useState<number | null>(null);
  const [reviewDesignIndex, setReviewDesignIndex] = useState(0);
  const [completedItemIds, setCompletedItemIds] = useState<number[]>([]);
  const [activeProductionItemId, setActiveProductionItemId] = useState<number | null>(null);
  const [activeDesignIndex, setActiveDesignIndex] = useState(0);
  const [productionStage, setProductionStage] = useState<"production" | "packaging">("production");
  const [dispatchStage, setDispatchStage] = useState<"idle" | "dispatch">("idle");
  const [showCompletedImages, setShowCompletedImages] = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [dropoffError, setDropoffError] = useState<string | null>(null);
  const [dropoffPoints, setDropoffPoints] = useState<DropoffPoint[]>([]);
  const [adminCoords, setAdminCoords] = useState<AdminCoords | null>(null);
  const [dropoffOpen, setDropoffOpen] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState<"orders" | "returns">("orders");
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setDispatchTracking(selectedOrder?.shippo_tracking_number || "");
  }, [selectedOrder?.id, selectedOrder?.status, selectedOrder?.shippo_tracking_number]);

  useEffect(() => {
    setCompletedItemIds([]);
    setActiveProductionItemId(selectedOrder?.items?.[0]?.id ?? null);
    setActiveDesignIndex(0);
    setProductionStage("production");
    setDispatchStage("idle");
    setShowCompletedImages(false);
    setDropoffLoading(false);
    setDropoffError(null);
    setDropoffPoints([]);
    setAdminCoords(null);
    setDropoffOpen(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    const selectedStatus = normalizedStatus(selectedOrder?.status);
    if (!selectedStatus.includes("production") && !selectedStatus.includes("process")) {
      setProductionStage("production");
      setShowCompletedImages(false);
    }
    if (!selectedStatus.includes("pack")) {
      setDispatchStage("idle");
      setDropoffLoading(false);
      setDropoffError(null);
      setDropoffPoints([]);
      setAdminCoords(null);
      setDropoffOpen(false);
    }
  }, [selectedOrder?.status]);

  const filteredOrders = useMemo(() => {
    const byArchiveState = orders.filter((order) => {
      if (ordersView === "all") return true;
      if (ordersView === "archived") return Boolean(order.archived_at);
      return !order.archived_at;
    });

    const query = search.trim().toLowerCase();
    if (!query) return byArchiveState;

    return byArchiveState.filter((order) =>
      [
        order.order_number,
        order.customer_name,
        order.customer_email || "",
        order.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [orders, search, ordersView]);

  const stepIndex = statusToStepIndex(selectedOrder?.status);
  const primaryAction = getPrimaryAction(selectedOrder?.status);
  const normalizedSelectedStatus = normalizedStatus(selectedOrder?.status);
  const isProductionMode = normalizedSelectedStatus.includes("production") || normalizedSelectedStatus.includes("process");
  const isPackedMode = normalizedSelectedStatus.includes("pack");
  const isDeliveredMode = normalizedSelectedStatus.includes("deliver");
  const isPackagingReviewMode = isProductionMode && productionStage === "packaging";
  const showProductionPanel = isProductionMode && productionStage === "production";
  const showPackagingPanel = isPackagingReviewMode;
  const showDispatchPanel = isPackedMode && dispatchStage === "dispatch";
  const isDeliveryStage = normalizedSelectedStatus.includes("dispatch") || normalizedSelectedStatus.includes("deliver");
  const canTemporarilyMarkDelivered =
    normalizedSelectedStatus.includes("dispatch")
    && !normalizedSelectedStatus.includes("deliver");
  const showPackedNotes = isPackedMode || isDeliveryStage;
  const postageService = selectedOrder?.shippo_selected_service || selectedOrder?.shipping_rate || "Carrier selected automatically";
  const courierProvider = detectCourierProvider(postageService);
  const postagePricePaid = Number(selectedOrder?.shipping || selectedOrder?.delivery_price || 0);
  const isTimedDelivery = String(selectedOrder?.delivery_type || "").toUpperCase() === "TIMED";
  const requiredShipDate = selectedOrder?.calculated_ship_date || null;
  const selectedDeliveryDate = selectedOrder?.selected_delivery_date || null;
  const dispatchLockedByDate = Boolean(
    isTimedDelivery
    && requiredShipDate
    && londonDateKey() < requiredShipDate
  );

  const productionItems = selectedOrder?.items || [];
  const completedSet = useMemo(() => new Set(completedItemIds), [completedItemIds]);
  const pendingProductionItems = useMemo(
    () => productionItems.filter((item) => !completedSet.has(item.id)),
    [completedSet, productionItems]
  );
  const completedCount = productionItems.length - pendingProductionItems.length;
  const allItemsDone = productionItems.length > 0 && pendingProductionItems.length === 0;

  useEffect(() => {
    if (!allItemsDone) {
      setShowCompletedImages(false);
    }
  }, [allItemsDone]);

  const activeProductionItem = useMemo(() => {
    if (!productionItems.length) return null;
    if (activeProductionItemId) {
      const explicit = productionItems.find((item) => item.id === activeProductionItemId);
      if (explicit) return explicit;
    }
    return pendingProductionItems[0] || productionItems[0] || null;
  }, [activeProductionItemId, pendingProductionItems, productionItems]);

  useEffect(() => {
    if (activeProductionItem?.id) {
      setActiveProductionItemId(activeProductionItem.id);
    } else {
      setActiveProductionItemId(null);
    }
  }, [activeProductionItem?.id]);

  useEffect(() => {
    setActiveDesignIndex(0);
  }, [activeProductionItem?.id]);

  useEffect(() => {
    setReviewDesignIndex(0);
  }, [reviewingItemId]);

  const activePreviewEntries = useMemo(
    () => getPreviewEntriesForItem(activeProductionItem),
    [activeProductionItem]
  );
  const safeDesignIndex = activePreviewEntries.length > 0 ? Math.min(activeDesignIndex, activePreviewEntries.length - 1) : 0;
  const activePreview = activePreviewEntries[safeDesignIndex] || null;
  const activeViewAssets = useMemo(() => {
    const layers = activePreview?.snapshot?.layers;
    if (!Array.isArray(layers)) return [];

    return layers
      .map((layer, index) => {
        const candidate = layer as { url?: unknown; type?: unknown };
        const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
        if (!url) return null;
        return {
          id: `${safeDesignIndex}-${index}-${url}`,
          url,
          type: typeof candidate.type === "string" ? candidate.type : "asset",
        };
      })
      .filter((entry): entry is { id: string; url: string; type: string } => Boolean(entry));
  }, [activePreview?.snapshot?.layers, safeDesignIndex]);
  const activeViewTextAssets = useMemo(() => {
    const layers = activePreview?.snapshot?.layers;
    if (!Array.isArray(layers)) return [];

    return layers
      .map((layer, index) => {
        const candidate = layer as {
          type?: unknown;
          text?: unknown;
          fontFamily?: unknown;
          fontSize?: unknown;
          size?: { w?: number; h?: number };
        };
        if (candidate.type !== "text") return null;

        const textValue = typeof candidate.text === "string" ? candidate.text : "";
        if (!textValue.trim()) return null;

        const fontFamily = typeof candidate.fontFamily === "string" && candidate.fontFamily.trim() !== ""
          ? candidate.fontFamily
          : "Arial";
        const fontSize = Number(candidate.fontSize ?? 24);
        const width = Math.max(1, Math.round(Number(candidate.size?.w ?? 0)));
        const height = Math.max(1, Math.round(Number(candidate.size?.h ?? 0)));

        return {
          id: `${safeDesignIndex}-text-${index}`,
          index,
          text: textValue,
          fontFamily,
          fontSize: Number.isFinite(fontSize) ? fontSize : 24,
          width,
          height,
          layer: layer as PricePreviewLayer,
        };
      })
      .filter((entry): entry is {
        id: string;
        index: number;
        text: string;
        fontFamily: string;
        fontSize: number;
        width: number;
        height: number;
        layer: PricePreviewLayer;
      } => Boolean(entry));
  }, [activePreview?.snapshot?.layers, safeDesignIndex]);

  const topActionLabel = useMemo(() => {
    if (!primaryAction) return "";
    if (isProductionMode && primaryAction.targetStatus === "packed") {
      return productionStage === "production" ? "Move to Packaging" : "Confirm Packaging";
    }
    if (isPackedMode && primaryAction.targetStatus === "start_dispatch") {
      return dispatchStage === "dispatch" ? "Dispatch Workspace Open" : "Start Dispatch";
    }
    return primaryAction.label;
  }, [dispatchStage, isPackedMode, isProductionMode, primaryAction, productionStage]);

  const reviewingItem = useMemo(
    () => selectedOrder?.items?.find((item) => item.id === reviewingItemId) || null,
    [reviewingItemId, selectedOrder?.items]
  );
  const reviewingEntries = useMemo(
    () => getPreviewEntriesForItem(reviewingItem),
    [reviewingItem]
  );
  const safeReviewIndex = reviewingEntries.length > 0 ? Math.min(reviewDesignIndex, reviewingEntries.length - 1) : 0;
  const reviewingEntry = reviewingEntries[safeReviewIndex] || null;
  const reviewPreviewWidth = useMemo(() => {
    const reserved = viewportWidth < 640 ? 150 : 220;
    return Math.max(220, Math.min(650, viewportWidth - reserved));
  }, [viewportWidth]);

  const applyStatus = async (status: string, trackingNumber?: string) => {
    try {
      await updateStatus(status, trackingNumber);
      if (status === "dispatched") {
        setNotice(`Order #${selectedOrder?.order_number || ""} dispatched. Customer timeline and tracking are updated.`);
      } else {
        setNotice(`Order updated: ${toDisplayStatus(status)}.`);
      }
    } catch {
      // Error shown in context
    }
  };

  const handlePrimaryAction = async () => {
    if (!primaryAction) return;

    if (primaryAction.targetStatus === "packed" && isProductionMode && !allItemsDone) {
      setNotice("Mark all products as done before moving to packaging.");
      return;
    }

    if (primaryAction.targetStatus === "packed" && isProductionMode && productionStage === "production") {
      setProductionStage("packaging");
      setNotice("Production complete. Review packaging and confirm when packed.");
      return;
    }

    if (primaryAction.targetStatus === "start_dispatch" && isPackedMode) {
      if (dispatchStage === "dispatch") return;
      setDispatchStage("dispatch");
      setNotice("Dispatch workspace opened. Generate shipping label, then confirm dispatch.");
      return;
    }

    const tracking = dispatchTracking.trim() || selectedOrder?.shippo_tracking_number || "";
    if (primaryAction.requiresTracking && !tracking) {
      setNotice("Add a tracking number before dispatching.");
      return;
    }

    await applyStatus(primaryAction.targetStatus, primaryAction.requiresTracking ? tracking : undefined);
    if (primaryAction.targetStatus === "packed") {
      setProductionStage("production");
      setNotice("Packaging confirmed. Move onto dispatching products.");
    }
  };

  const handleGenerateLabel = async () => {
    try {
      await generateLabel();
      setNotice("Delivery label generated successfully.");
    } catch {
      // Error shown via context state.
    }
  };

  const handleArchiveDeliveredOrder = async () => {
    if (!isDeliveredMode) return;
    try {
      await archiveOrder();
      setNotice(`Order #${selectedOrder?.order_number || ""} archived.`);
    } catch {
      // Error shown via context state.
    }
  };

  const fetchDropoffPoints = async () => {
    setDropoffLoading(true);
    setDropoffError(null);
    try {
      const coords = await getAdminCoords();
      setAdminCoords(coords);
      const points = await findNearestDropoffPoints(courierProvider, coords);
      setDropoffPoints(points);
      if (points.length === 0) {
        setDropoffError(`No ${courierProvider} drop-off points were found nearby.`);
      }
    } catch (fetchError) {
      setDropoffPoints([]);
      setDropoffError(fetchError instanceof Error ? fetchError.message : "Unable to load drop-off points.");
    } finally {
      setDropoffLoading(false);
    }
  };

  useEffect(() => {
    if (!showDispatchPanel || !dropoffOpen || dropoffLoading || dropoffPoints.length > 0) return;
    void fetchDropoffPoints();
    // Intentionally depends on courier + panel visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDispatchPanel, dropoffOpen, courierProvider]);

  const handleSendMessage = async () => {
    if (!messageBody.trim()) return;
    try {
      const result = await sendMessage(messageBody.trim(), messageSubject.trim() || undefined);
      setNotice(`Message sent.${result.sent_to_inbox ? " Inbox sent." : ""}${result.sent_email ? " Email sent." : ""}`);
      setMessageBody("");
      setMessageSubject("");
    } catch {
      // Error shown in context
    }
  };

  const markCurrentProductDone = () => {
    if (!activeProductionItem) return;

    setCompletedItemIds((prev) => {
      if (prev.includes(activeProductionItem.id)) return prev;
      const next = [...prev, activeProductionItem.id];
      const nextPending = productionItems.filter((item) => !next.includes(item.id));
      setActiveProductionItemId(nextPending[0]?.id ?? activeProductionItem.id);
      if (nextPending.length === 0) {
        setNotice("All products marked done. You can now move to packaging.");
      }
      return next;
    });
  };

  const goToPreviousProduct = () => {
    if (!activeProductionItem) return;
    const index = productionItems.findIndex((item) => item.id === activeProductionItem.id);
    if (index <= 0) return;
    setActiveProductionItemId(productionItems[index - 1]?.id ?? null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-5 py-8 text-[#2D2515] sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-6 shadow-[0_18px_50px_rgba(91,70,27,0.10)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D2B]">Order Command Centre</p>
              <h1 className="mt-2 text-3xl font-bold">Admin Orders</h1>
              <p className="mt-1 text-sm text-[#6B5A34]">Review order details, move fulfilment forward step-by-step, and dispatch with tracking.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshOrders()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Total Orders</p>
              <p className="mt-1 text-2xl font-bold">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Needs Action</p>
              <p className="mt-1 inline-flex items-center gap-2 text-2xl font-bold">
                {newOrdersCount}
                {newOrdersCount > 0 ? <span className="h-2.5 w-2.5 rounded-full bg-[#B42318]" /> : null}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Pending Returns</p>
              <p className="mt-1 inline-flex items-center gap-2 text-2xl font-bold">
                {pendingReturnsCount}
                {pendingReturnsCount > 0 ? <span className="h-2.5 w-2.5 rounded-full bg-[#B42318]" /> : null}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6D8B8] bg-white p-3 shadow-sm">
          <div className="inline-flex rounded-xl border border-[#E1D4B8] bg-[#FFFCF4] p-1">
            <button
              type="button"
              onClick={() => setActiveAdminSection("orders")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeAdminSection === "orders"
                  ? "bg-[#B89443] text-white"
                  : "text-[#7B6530] hover:bg-[#FFF4DF]"
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminSection("returns")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeAdminSection === "returns"
                  ? "bg-[#B89443] text-white"
                  : "text-[#7B6530] hover:bg-[#FFF4DF]"
              }`}
            >
              Returns
            </button>
          </div>
        </section>

        {activeAdminSection === "orders" ? (
        <>
        <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
          <aside className="rounded-3xl border border-[#E6D8B8] bg-white p-4 shadow-sm">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, customer, email"
                className="h-10 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] pl-9 pr-3 text-sm outline-none focus:border-[#C9A85B]"
              />
            </div>
            <div className="mb-3 inline-flex rounded-xl border border-[#E1D4B8] bg-[#FFFCF4] p-1">
              <button
                type="button"
                onClick={() => setOrdersView("active")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  ordersView === "active" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setOrdersView("archived")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  ordersView === "archived" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
                }`}
              >
                Archived
              </button>
              <button
                type="button"
                onClick={() => setOrdersView("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  ordersView === "all" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
                }`}
              >
                All
              </button>
            </div>

            {loadingOrders ? (
              <p className="flex items-center gap-2 px-2 py-6 text-sm text-[#6B5A34]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders...
              </p>
            ) : filteredOrders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#DDCCA3] bg-[#FFFBF2] px-4 py-8 text-sm text-[#6B5A34]">No orders found.</p>
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {filteredOrders.map((order) => {
                  const active = order.id === selectedOrderId;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => void selectOrder(order.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        active ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E7DCC2] bg-white hover:border-[#D6BC82]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#2D2515]">#{order.order_number}</p>
                          <p className="mt-0.5 text-xs text-[#7D6A45]">{order.customer_name}</p>
                        </div>
                        {order.is_new ? <span className="h-2.5 w-2.5 rounded-full bg-[#B42318]" /> : null}
                      </div>
                      <p className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClassName(order.status)}`}>
                        {toDisplayStatus(order.status)}
                      </p>
                      <p className="mt-2 text-xs text-[#7D6A45]">{formatDate(order.created_at)}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#6A562D]">
                        {order.items_count} item{order.items_count === 1 ? "" : "s"} • {formatMoney(order.total)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#7D6A45]">
                        Archived: {order.archived_at ? formatDate(order.archived_at) : "No"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="rounded-3xl border border-[#E6D8B8] bg-white p-5 shadow-sm">
            {loadingOrderDetail ? (
              <p className="flex items-center gap-2 px-2 py-8 text-sm text-[#6B5A34]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading order workspace...
              </p>
            ) : !selectedOrder ? (
              <p className="rounded-2xl border border-dashed border-[#DDCCA3] bg-[#FFFBF2] px-4 py-10 text-sm text-[#6B5A34]">Select an order to begin.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFE3C7] pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Order Workspace</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#2D2515]">#{selectedOrder.order_number}</h2>
                    <p className="mt-1 text-sm text-[#6B5A34]">Placed {formatDate(selectedOrder.created_at)} by {selectedOrder.customer_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/orders/${selectedOrder.order_number}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#D7BE84] bg-white px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                    >
                      Open Receipt
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {isDeliveryStage ? (
                      selectedOrder.shippo_label_url ? (
                        <a
                          href={selectedOrder.shippo_label_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335]"
                        >
                          Delivery Label
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void generateLabel()}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                        >
                          Generate Label
                        </button>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-5">
                  {STATUS_STEPS.map((step, index) => {
                    const completed = index <= stepIndex;
                    return (
                      <div key={step} className="rounded-xl border border-[#E5D7B8] bg-[#FFFCF4] px-2 py-2 text-center">
                        <p className={`text-[11px] font-semibold ${completed ? "text-[#6A541F]" : "text-[#9A8A63]"}`}>{index + 1}. {step}</p>
                      </div>
                    );
                  })}
                </div>

                <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Fulfilment Actions</p>
                      <p className="mt-1 text-xs text-[#6B5A34]">Current status: <span className="font-semibold">{toDisplayStatus(selectedOrder.status)}</span></p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(selectedOrder.status)}`}>
                      {toDisplayStatus(selectedOrder.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInstructions(true)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#D7BE84] bg-white px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                    >
                      <CircleHelp className="h-4 w-4" />
                      Instructions
                    </button>
                    <div className="flex-1" />
                    <div className="w-full max-w-[280px] space-y-2">
                      {primaryAction?.requiresTracking ? (
                        <input
                          value={dispatchTracking}
                          onChange={(event) => setDispatchTracking(event.target.value)}
                          placeholder="Enter tracking number"
                          className="h-10 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                        />
                      ) : null}

                      {primaryAction ? (
                        <button
                          type="button"
                          onClick={() => void handlePrimaryAction()}
                          disabled={
                            saving
                            || (isProductionMode && primaryAction.targetStatus === "packed" && !allItemsDone)
                            || (isPackedMode && primaryAction.targetStatus === "start_dispatch" && dispatchStage === "dispatch")
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#B89443] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                        >
                          <PackageCheck className="h-4 w-4" />
                          {topActionLabel}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="rounded-xl border border-[#E5D7B8] bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#7D6A45]">
                            {normalizedStatus(selectedOrder.status).includes("deliver")
                              ? "Delivered successfully."
                              : normalizedStatus(selectedOrder.status).includes("dispatch")
                                ? "Dispatched. Waiting for courier delivery updates."
                                : "No action available."}
                          </div>
                          {canTemporarilyMarkDelivered ? (
                            <button
                              type="button"
                              onClick={() => void applyStatus("delivered")}
                              disabled={saving}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#CDE3B2] bg-[#F2FAE8] px-3 py-2 text-xs font-semibold text-[#4D6E2A] transition hover:bg-[#E8F6D9] disabled:opacity-60"
                            >
                              Mark as Delivered (Temporary)
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedOrder.shippo_tracking_number || selectedOrder.tracking_url) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#D9C79C] bg-[#FFF9E9] px-3 py-1 font-semibold text-[#7A6231]">
                        <Truck className="h-3.5 w-3.5" />
                        Tracking: {selectedOrder.shippo_tracking_number}
                      </span>
                      {selectedOrder.tracking_url ? (
                        <a
                          href={selectedOrder.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[#D9C79C] bg-white px-3 py-1 font-semibold text-[#7A6231] hover:bg-[#FFF8EA]"
                        >
                          Open tracking
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {showProductionPanel || showPackagingPanel || showDispatchPanel ? (
                  <section className="rounded-2xl border border-[#E7DCC2] bg-white p-4">
                    {showProductionPanel ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Production</p>
                          <p className="text-xs font-semibold text-[#7D6A45]">Completed {completedCount}/{productionItems.length}</p>
                        </div>

                        {pendingProductionItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {pendingProductionItems.map((item, index) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveProductionItemId(item.id)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  activeProductionItem?.id === item.id
                                    ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                                    : "border-[#E1D4B8] bg-white text-[#7B6530] hover:bg-[#FFF8EA]"
                                }`}
                              >
                                {index + 1}. {item.product_name} • {designTypeLabel(normalizeDesignType(item.design_type))}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {activeProductionItem || allItemsDone ? (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#2D2515]">
                                {allItemsDone && !showCompletedImages
                                  ? `All products have been marked as complete and made (${completedCount}/${productionItems.length})`
                                  : activeProductionItem
                                    ? `${activeProductionItem.product_name} · Qty ${activeProductionItem.quantity} · ${designTypeLabel(normalizeDesignType(activeProductionItem.design_type))}`
                                    : "All products have been marked as complete and made"}
                              </p>
                              <div className="flex items-center gap-2">
                                {allItemsDone && !showCompletedImages ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowCompletedImages(true);
                                      setActiveProductionItemId(productionItems[0]?.id ?? null);
                                    }}
                                    className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                                  >
                                    Review Images Again
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={goToPreviousProduct}
                                      disabled={!activeProductionItem || productionItems.findIndex((item) => item.id === activeProductionItem.id) <= 0}
                                      className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA] disabled:opacity-50"
                                    >
                                      Go Back
                                    </button>
                                    {allItemsDone ? (
                                      <button
                                        type="button"
                                        onClick={() => setShowCompletedImages(false)}
                                        className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                                      >
                                        Hide Images
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={markCurrentProductDone}
                                        disabled={saving}
                                        className="rounded-lg bg-[#B89443] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                                      >
                                        Mark Product Complete
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {(!allItemsDone || showCompletedImages) && activeProductionItem ? (
                              <div className="rounded-lg border border-[#E7DCC2] bg-white p-2">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveDesignIndex((value) => (value === 0 ? activePreviewEntries.length - 1 : value - 1))}
                                    disabled={activePreviewEntries.length <= 1}
                                    className="rounded-lg border border-[#D7BE84] bg-white p-2 text-[#7B6530] disabled:opacity-50"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </button>

                                  <div className="flex min-h-[360px] flex-1 items-center justify-center bg-[#FFFDF8] p-2">
                                    {activePreview?.snapshot ? (
                                      <DesignPreview
                                        snapshot={activePreview.snapshot}
                                        width={560}
                                        alt={`${activeProductionItem.product_name}-${activePreview.viewKey}`}
                                      />
                                    ) : (
                                      <img loading="lazy" decoding="async"
                                        src={activeProductionItem.image_url || "/images/placeholder.jpg"}
                                        alt={activeProductionItem.product_name}
                                        className="max-h-[360px] w-auto rounded-lg object-contain"
                                      />
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setActiveDesignIndex((value) => (value === activePreviewEntries.length - 1 ? 0 : value + 1))}
                                    disabled={activePreviewEntries.length <= 1}
                                    className="rounded-lg border border-[#D7BE84] bg-white p-2 text-[#7B6530] disabled:opacity-50"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>

                                {activePreviewEntries.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {activePreviewEntries.map((entry, index) => (
                                      <button
                                        key={`${activeProductionItem.id}-${entry.viewKey}`}
                                        type="button"
                                        onClick={() => setActiveDesignIndex(index)}
                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                          safeDesignIndex === index
                                            ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                                            : "border-[#E1D4B8] bg-white text-[#7B6530]"
                                        }`}
                                      >
                                        {VIEW_LABELS[entry.viewKey] || entry.viewKey}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}

                                {(activeViewAssets.length > 0 || activeViewTextAssets.length > 0) ? (
                                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                                    {activeViewAssets.length > 0 ? (
                                      <div className="rounded-lg border border-[#E7DCC2] bg-[#FFFCF6] p-2">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Image Assets</p>
                                        <div className="flex flex-wrap gap-2">
                                          {activeViewAssets.map((asset, index) => (
                                            <div key={asset.id} className="flex items-center gap-2 rounded-lg border border-[#E1D4B8] bg-white px-2 py-1">
                                              <img loading="lazy" decoding="async" src={asset.url} alt={`Asset ${index + 1}`} className="h-8 w-8 rounded object-cover" />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const link = document.createElement("a");
                                                  link.href = asset.url;
                                                  link.download = `${selectedOrder?.order_number || "order"}_item${activeProductionItem.id}_asset${index + 1}.png`;
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  link.remove();
                                                }}
                                                className="rounded border border-[#D7BE84] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#7B6530] hover:bg-[#FFF4DF]"
                                              >
                                                Download
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeViewTextAssets.length > 0 ? (
                                      <div className="rounded-lg border border-[#E7DCC2] bg-[#FFFCF6] p-2">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Text Assets</p>
                                        <div className="space-y-2">
                                          {activeViewTextAssets.map((asset, index) => (
                                            <div key={asset.id} className="rounded-lg border border-[#E1D4B8] bg-white px-2 py-2">
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                  <p className="truncate text-[11px] font-semibold text-[#6A541F]">
                                                    Font: <span style={{ fontFamily: asset.fontFamily }}>{asset.fontFamily}</span>
                                                  </p>
                                                  <p className="mt-0.5 text-[10px] text-[#7B6530]">
                                                    Size: {Math.round(asset.fontSize)}px • Canvas: {asset.width}x{asset.height}
                                                  </p>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    const png = await renderTextLayerToPng(asset.layer);
                                                    if (!png) return;
                                                    downloadDataUrl(
                                                      png,
                                                      `${selectedOrder?.order_number || "order"}_item${activeProductionItem.id}_${activePreview?.viewKey || "front"}_text${index + 1}.png`
                                                    );
                                                  }}
                                                  className="inline-flex items-center gap-1 rounded border border-[#D7BE84] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#7B6530] hover:bg-[#FFF4DF]"
                                                >
                                                  <Type className="h-3 w-3" />
                                                  Download
                                                </button>
                                              </div>
                                              <p className="mt-1 line-clamp-2 text-[11px] text-[#2D2515]">
                                                {asset.text}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!selectedOrder || !activeProductionItem || !activePreview?.snapshot) return;
                                      const png = await renderSnapshotToPng(activePreview.snapshot);
                                      if (!png) return;
                                      downloadDataUrl(
                                        png,
                                        `${selectedOrder.order_number}_item${activeProductionItem.id}_${activePreview.viewKey}_full-design.png`
                                      );
                                    }}
                                    disabled={!activePreview?.snapshot}
                                    className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-50"
                                  >
                                    Download Full Image
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-[#6B5A34]">No remaining products in production queue.</p>
                        )}
                      </div>
                    ) : showDispatchPanel ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Dispatch</p>
                          <button
                            type="button"
                            onClick={() => setDispatchStage("idle")}
                            className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                          >
                            Close Dispatch
                          </button>
                        </div>

                        {isTimedDelivery ? (
                          <div className="rounded-xl border border-[#E9D9B6] bg-[#FFFAEE] p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Timed Delivery Schedule</p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <div className="rounded-lg border border-[#E7D9B9] bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Customer selected delivery</p>
                                <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatDateOnly(selectedDeliveryDate)}</p>
                              </div>
                              <div className="rounded-lg border border-[#E7D9B9] bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Dispatch on</p>
                                <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatDateOnly(requiredShipDate)}</p>
                              </div>
                            </div>
                            {dispatchLockedByDate ? (
                              <p className="mt-3 rounded-lg border border-[#E5C79F] bg-[#FFF1DF] px-3 py-2 text-xs font-semibold text-[#8B5E21]">
                                Dispatch is locked until {formatDateOnly(requiredShipDate)} to meet the timed delivery date.
                              </p>
                            ) : (
                              <p className="mt-3 text-xs font-semibold text-[#6E5A2E]">
                                Dispatch window is open. You can dispatch this timed order now.
                              </p>
                            )}
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Postage Service</p>
                            <p className="mt-1 text-sm font-semibold text-[#2D2515]">{postageService}</p>
                          </div>
                          <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Courier</p>
                            <p className="mt-1 text-sm font-semibold text-[#2D2515]">{courierProvider}</p>
                          </div>
                          <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Postage Paid</p>
                            <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatMoney(postagePricePaid)}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                          <p className="text-sm font-semibold text-[#2D2515]">Create shipping label</p>
                          <p className="mt-1 text-xs text-[#6B5A34]">
                            Use Shippo test mode to generate a label from this order's delivery address and autofill tracking.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleGenerateLabel()}
                              disabled={saving}
                              className="rounded-lg bg-[#B89443] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                            >
                              Generate Shipping Label
                            </button>
                            {selectedOrder.shippo_label_url ? (
                              <>
                                <a
                                  href={selectedOrder.shippo_label_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                                >
                                  Download Label
                                </a>
                                <a
                                  href={selectedOrder.shippo_label_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                                >
                                  Print Label
                                </a>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Tracking Number</p>
                          <input
                            value={dispatchTracking}
                            onChange={(event) => setDispatchTracking(event.target.value)}
                            placeholder="Auto-filled after label generation"
                            className="mt-2 h-10 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                          />
                        </div>

                        <div className="rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setDropoffOpen((prev) => !prev)}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                            >
                              {dropoffOpen ? "Close Nearest Drop-off Points" : "Open Nearest Drop-off Points"}
                            </button>
                            {dropoffOpen ? (
                              <button
                                type="button"
                                onClick={() => void fetchDropoffPoints()}
                                disabled={dropoffLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA] disabled:opacity-60"
                              >
                                <LocateFixed className="h-3.5 w-3.5" />
                                Refresh nearest points
                              </button>
                            ) : null}
                          </div>

                          {dropoffOpen ? (
                            <>
                              <p className="mt-2 text-xs text-[#6B5A34]">Find nearby {courierProvider} drop-off locations based on your current admin location.</p>

                              {adminCoords ? (
                                <p className="mt-2 text-xs text-[#7B6530]">
                                  Using your location: {adminCoords.lat.toFixed(4)}, {adminCoords.lng.toFixed(4)}
                                </p>
                              ) : null}

                              {dropoffLoading ? (
                                <p className="mt-3 text-xs font-semibold text-[#7B6530]">Finding nearby drop-off points...</p>
                              ) : null}

                              {dropoffError ? (
                                <p className="mt-3 rounded-lg border border-[#E8C9A7] bg-[#FFF6E8] px-2.5 py-2 text-xs font-semibold text-[#8A5E1E]">{dropoffError}</p>
                              ) : null}

                              {!dropoffLoading && dropoffPoints.length > 0 ? (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {dropoffPoints.map((point) => (
                                    <article key={point.id} className="rounded-lg border border-[#E2D2AE] bg-white p-2.5">
                                      <p className="text-sm font-semibold text-[#2D2515]">{point.name}</p>
                                      <p className="mt-1 text-xs text-[#6B5A34]">{point.address}</p>
                                      <p className="mt-1 text-[11px] text-[#7B6530]">
                                        Hours today: {point.openingHours || "Not available"}
                                        {typeof point.openNow === "boolean" ? ` (${point.openNow ? "Open now" : "Closed now"})` : ""}
                                      </p>
                                      <div className="mt-2 flex items-center justify-between">
                                        <p className="text-[11px] font-semibold text-[#7B6530]">
                                          {typeof point.distanceMiles === "number" ? `${point.distanceMiles.toFixed(1)} miles away` : "Nearby"}
                                        </p>
                                        <a
                                          href={point.mapsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="rounded-md border border-[#D7BE84] bg-[#FFFDF4] px-2 py-1 text-[11px] font-semibold text-[#7B6530] hover:bg-[#FFF4DF]"
                                        >
                                          Open in Maps
                                        </a>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void applyStatus("dispatched", dispatchTracking.trim() || selectedOrder.shippo_tracking_number || "")}
                            disabled={saving || dispatchLockedByDate || !(dispatchTracking.trim() || selectedOrder.shippo_tracking_number)}
                            className="rounded-xl bg-[#B89443] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                          >
                            Confirm Dispatch
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-xl border border-[#E8DAB8] bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Packaging</p>
                          <button
                            type="button"
                            onClick={() => setShowParcelSizes(true)}
                            className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                          >
                            Parcel sizes
                          </button>
                        </div>
                        <div className="space-y-3">
                          {selectedOrder.items.map((item) => (
                            <div key={`parcel-${item.id}`} className="flex flex-col gap-3 rounded-xl border border-[#EADDBF] bg-[#FFFDF8] p-3 md:flex-row md:items-start md:justify-between">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <img loading="lazy" decoding="async"
                                  src={item.image_url || "/images/placeholder.jpg"}
                                  alt={item.product_name}
                                  className="h-14 w-14 rounded-lg border border-[#E4D4AE] object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#2D2515]">
                                    {item.product_name} - {item.quantity}, {item.size || "N/A"}
                                  </p>
                                  <p className="mt-1 text-xs text-[#7D6A45]">Colour {item.colour || "N/A"}</p>
                                  <p className="mt-1 text-xs text-[#7D6A45]">Design type: {designTypeLabel(normalizeDesignType(item.design_type))}</p>
                                </div>
                              </div>

                              <div className="w-full max-w-[360px] space-y-1 md:text-right">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Packaging Size</p>
                                <p className="text-sm font-semibold text-[#2D2515]">{item.parcel_size_label || "Not set"}</p>
                                <p className="text-xs text-[#6B5A34]">{item.parcel_size_instructions || "No instructions set."}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-lg bg-[#FFF8EA] px-3 py-2 text-sm text-[#6B5A34]">
                          <p>
                            <span className="font-semibold text-[#2D2515]">Gift Packaging:</span>{" "}
                            {selectedOrder.gift_packaging ? "Selected" : "Not selected"} ({formatMoney(selectedOrder.gift_packaging_cost || 0)})
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-[#2D2515]">Gift Message:</span>{" "}
                            {selectedOrder.gift_message?.trim() || "No custom gift message was left."}
                          </p>
                        </div>

                      </div>
                    )}
                  </section>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),280px]">
                    <section className="space-y-4">
                      {isDeliveredMode ? (
                        <section className="rounded-2xl border border-[#CDE3B2] bg-[#F7FCEB] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4D6E2A]">Delivery Complete</p>
                          <h3 className="mt-2 text-lg font-bold text-[#2D2515]">Order delivered successfully</h3>
                          <p className="mt-1 text-sm text-[#5C7332]">
                            This order has been delivered to the customer and no further fulfilment action is required.
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {selectedOrder.tracking_url ? (
                              <a
                                href={selectedOrder.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-[#BFD99B] bg-white px-3 py-2 text-xs font-semibold text-[#4D6E2A] transition hover:bg-[#EEF8DE]"
                              >
                                Open Tracking
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleArchiveDeliveredOrder()}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#6E9A38] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5F872F] disabled:opacity-60"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archive Delivered Order
                            </button>
                          </div>
                        </section>
                      ) : (
                        <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Order Items & Production Assets</p>
                          <div className="mt-3 space-y-3">
                            {selectedOrder.items.map((item) => (
                              <article key={item.id} className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => window.open(item.image_url || "/images/placeholder.jpg", "_blank")}
                                      className="h-14 w-14 overflow-hidden rounded-lg border border-[#E4D4AE] bg-[#FFF9EC]"
                                    >
                                      <img loading="lazy" decoding="async" src={item.image_url || "/images/placeholder.jpg"} alt={item.product_name} className="h-full w-full object-cover" />
                                    </button>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-[#2D2515]">{item.product_name}</p>
                                      <p className="mt-1 text-xs text-[#7D6A45]">Qty {item.quantity} • Size {item.size || "N/A"} • Colour {item.colour || "N/A"}</p>
                                      <p className="mt-1 text-xs font-semibold text-[#6A541F]">Design type: {designTypeLabel(normalizeDesignType(item.design_type))}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-[#7B6530]">{formatMoney(item.line_total)} line total</p>
                                  <button
                                    type="button"
                                    onClick={() => setReviewingItemId(item.id)}
                                    className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                                  >
                                    Review design
                                  </button>
                                </div>
                                {showPackedNotes ? (
                                  <ul className="mt-3 space-y-1 text-xs text-[#6B5A34]">
                                    <li className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-[#4D7A2E]" />
                                      Packed in '{item.parcel_size_label || "assigned"}' packaging.
                                    </li>
                                    {selectedOrder.gift_packaging ? (
                                      <li className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#4D7A2E]" />
                                        Gift wrapped{selectedOrder.gift_message?.trim() ? " with custom message." : "."}
                                      </li>
                                    ) : null}
                                  </ul>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        </section>
                      )}
                    </section>

                    <aside className="space-y-4">
                      <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Customer</p>
                        <p className="mt-2 text-sm font-semibold text-[#2D2515]">{selectedOrder.customer_name}</p>
                        <p className="mt-1 text-xs text-[#6B5A34]">Email: {selectedOrder.customer_email || selectedOrder.email || "No email"}</p>
                        <p className="mt-1 text-xs text-[#6B5A34]">First name: {selectedOrder.first_name || "N/A"}</p>
                        <p className="mt-1 text-xs text-[#6B5A34]">Last name: {selectedOrder.last_name || "N/A"}</p>
                        {selectedOrder.user?.id ? (
                          <Link
                            href={`/admin/users/${selectedOrder.user.id}`}
                            target="_blank"
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                          >
                            <UserRound className="h-3.5 w-3.5" />
                            Open User Profile
                          </Link>
                        ) : (
                          <p className="mt-2 rounded-lg border border-[#E7DCC2] bg-[#FFF9EB] px-2 py-1 text-xs font-semibold text-[#7B6530]">
                            Guest account
                          </p>
                        )}
                        <p className="mt-3 text-xs text-[#6B5A34]">
                          {selectedOrder.address_line1}
                          {selectedOrder.address_line2 ? `, ${selectedOrder.address_line2}` : ""}, {selectedOrder.city}, {selectedOrder.postcode}, {selectedOrder.country}
                        </p>
                      </section>

                      <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Price Breakdown</p>
                        <div className="mt-2 space-y-1 text-sm text-[#6E5F41]">
                          <p className="flex justify-between"><span>Subtotal</span><span>{formatMoney(selectedOrder.subtotal)}</span></p>
                          <p className="flex justify-between"><span>Discount</span><span>-{formatMoney(selectedOrder.discount_amount)}</span></p>
                          <p className="flex justify-between"><span>VAT</span><span>{formatMoney(selectedOrder.vat)}</span></p>
                          <p className="flex justify-between"><span>Shipping</span><span>{formatMoney(selectedOrder.shipping)}</span></p>
                          <p className="mt-2 flex justify-between border-t border-[#EFE2C4] pt-2 text-base font-bold text-[#2D2516]"><span>Total</span><span>{formatMoney(selectedOrder.total)}</span></p>
                        </div>
                      </section>

                      {!isDeliveredMode ? (
                        <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Need Clarification?</p>
                          <input
                            value={messageSubject}
                            onChange={(event) => setMessageSubject(event.target.value)}
                            placeholder="Subject (optional)"
                            className="mt-2 h-10 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                          />
                          <textarea
                            value={messageBody}
                            onChange={(event) => setMessageBody(event.target.value)}
                            rows={4}
                            placeholder="Ask the customer for any missing details..."
                            className="mt-2 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSendMessage()}
                            disabled={saving || !messageBody.trim()}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" />
                            Send Message
                          </button>
                        </section>
                      ) : null}
                    </aside>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
        

        {notice ? (
          <div className="rounded-xl border border-[#D8C79F] bg-[#FFF8E8] px-3 py-2 text-sm font-semibold text-[#7B6530]">{notice}</div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-sm font-semibold text-[#9F3126]">
            <span className="inline-flex items-center gap-2">
              <CircleAlert className="h-4 w-4" />
              {error}
            </span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#E7DCC2] bg-white px-4 py-3 text-xs text-[#7D6A45]">
          <p className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">
            <Sparkles className="h-4 w-4" />
            Admin Process Checklist
          </p>
          <p className="mt-1">Review design assets, start production, pack, dispatch with tracking, and let courier sync delivery automatically.</p>
        </div>
        </>
        ) : (
          <AdminOrderReturnsPanel />
        )}
      </div>

      {activeAdminSection === "orders" && showInstructions ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#E8DAB8] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Fulfilment Instructions</p>
                <h3 className="mt-1 text-lg font-bold text-[#2D2515]">Order Processing Steps</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-lg border border-[#E1D4B8] px-2 py-1 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm text-[#6B5A34]">
              <p>1. Check order details and confirm product customisation.</p>
              <p>2. Press Start Production to enter the production workspace.</p>
              <p>3. Review each item design and mark each product done.</p>
              <p>4. Confirm all produced items are present and quality checked.</p>
              <p>5. Fold and pack each item securely.</p>
              <p>6. Add invoice and dispatch documents.</p>
              <p>7. Seal parcel and proceed to dispatch with tracking.</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeAdminSection === "orders" && showParcelSizes ? (
        <div className="fixed inset-0 z-[131] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#E8DAB8] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Parcel Sizes</p>
                <h3 className="mt-1 text-lg font-bold text-[#2D2515]">Packaging Guidance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowParcelSizes(false)}
                className="rounded-lg border border-[#E1D4B8] px-2 py-1 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(PARCEL_SIZE_PRESETS).map(([key, preset]) => (
                <div key={key} className="rounded-xl border border-[#E7DCC2] bg-[#FFFEFB] p-3">
                  <img loading="lazy" decoding="async" src={preset.image} alt={`${preset.label} parcel`} className="h-24 w-full rounded-lg object-contain" />
                  <p className="mt-2 text-sm font-semibold text-[#2D2515]">{preset.label}</p>
                  <p className="mt-1 text-xs text-[#6B5A34]">{preset.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeAdminSection === "orders" && reviewingItem ? (
        <div className="fixed inset-0 z-[132] flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E8DAB8] bg-white p-3 shadow-xl sm:p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Review Design</p>
                <h3 className="mt-1 text-base font-bold text-[#2D2515]">
                  {reviewingItem.product_name} • {designTypeLabel(normalizeDesignType(reviewingItem.design_type))}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingItemId(null)}
                className="rounded-lg border border-[#E1D4B8] px-2 py-1 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
              <button
                type="button"
                disabled={reviewingEntries.length <= 1}
                onClick={() => setReviewDesignIndex((value) => (value === 0 ? reviewingEntries.length - 1 : value - 1))}
                className="rounded-lg border border-[#D7BE84] bg-white p-2 text-[#7B6530] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex h-[min(62vh,520px)] min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#E7DCC2] bg-[#FFFDF8] p-2 sm:h-[min(68vh,620px)]">
                {reviewingEntry ? (
                  <DesignPreview
                    snapshot={reviewingEntry.snapshot}
                    width={reviewPreviewWidth}
                    alt={`${reviewingItem.product_name}-${reviewingEntry.viewKey}`}
                  />
                ) : (
                  <img loading="lazy" decoding="async"
                    src={reviewingItem.image_url || "/images/placeholder.jpg"}
                    alt={reviewingItem.product_name}
                    className="max-h-full w-auto rounded-lg object-contain"
                  />
                )}
              </div>

              <button
                type="button"
                disabled={reviewingEntries.length <= 1}
                onClick={() => setReviewDesignIndex((value) => (value === reviewingEntries.length - 1 ? 0 : value + 1))}
                className="rounded-lg border border-[#D7BE84] bg-white p-2 text-[#7B6530] disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {reviewingEntry ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#7B6530]">
                  View: {VIEW_LABELS[reviewingEntry.viewKey] || reviewingEntry.viewKey}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedOrder) return;
                    const png = await renderSnapshotToPng(reviewingEntry.snapshot);
                    if (!png) return;
                    downloadDataUrl(
                      png,
                      `${selectedOrder.order_number}_item${reviewingItem.id}_${reviewingEntry.viewKey}_design.png`
                    );
                  }}
                  className="rounded-lg border border-[#D7BE84] bg-white px-2.5 py-1 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                >
                  Download PNG
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <AdminOrdersProvider>
        <AdminOrderReturnsProvider>
          <OrdersWorkspace />
        </AdminOrderReturnsProvider>
      </AdminOrdersProvider>
    </AuthenticatedLayout>
  );
}
