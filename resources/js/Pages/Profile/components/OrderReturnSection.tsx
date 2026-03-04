import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Package,
  ShieldCheck,
  Truck,
  Upload,
} from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

type OrderReturnItem = {
  id: number;
  product_name: string;
  size?: string | null;
  colour?: string | null;
  quantity: number;
  image_url?: string | null;
  line_total?: number;
};

type OrderReturnRequest = {
  id: number;
  status: string;
  reason_code: string;
  reason_label: string;
  requested_at?: string | null;
  admin_note?: string | null;
  shippo_label_url?: string | null;
  shippo_tracking_number?: string | null;
  return_shipping_service?: string | null;
  return_shipping_amount?: number | null;
  return_shipping_currency?: string | null;
  customer_shipped_at?: string | null;
  refund_amount?: number | null;
  stripe_refund_id?: string | null;
  stripe_refund_currency?: string | null;
  stripe_payment_amount?: number | null;
  stripe_fee_amount?: number | null;
  stripe_net_amount?: number | null;
  additional_info_submitted_at?: string | null;
};

type ReturnEligibility = {
  delivered: boolean;
  can_request: boolean;
  message?: string | null;
  delivery_date?: string | null;
  eligibility_expires_at?: string | null;
  days_left?: number | null;
};

type DropoffPoint = {
  id: string;
  placeId?: string | null;
  name: string;
  address: string;
  mapsUrl: string;
  openingHours?: string | null;
  openNow?: boolean | null;
  distanceMiles?: number | null;
};

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";

export type ReturnEnabledOrder = {
  id: number;
  order_number: string;
  status?: string;
  items: OrderReturnItem[];
  subtotal?: number;
  shipping?: number;
  total?: number;
  return_eligibility?: ReturnEligibility | null;
  return_requests?: OrderReturnRequest[];
};

type OrderReturnSectionProps = {
  order: ReturnEnabledOrder;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
};

type ReasonOption = {
  value: string;
  label: string;
};

type ReasonGroup = {
  label: string;
  options: ReasonOption[];
};

const REASON_GROUPS: ReasonGroup[] = [
  {
    label: "Product condition issues",
    options: [
      { value: "item_arrived_damaged", label: "Item arrived damaged" },
      { value: "item_faulty_defective", label: "Item is faulty / defective" },
      { value: "incorrect_item_received", label: "Incorrect item received" },
      { value: "missing_parts_incomplete", label: "Missing parts / incomplete" },
    ],
  },
  {
    label: "Order / fulfilment issues",
    options: [
      { value: "wrong_size_received", label: "Wrong size received" },
      { value: "wrong_variant_received", label: "Wrong variant received" },
      { value: "ordered_multiple_by_mistake", label: "Ordered multiple by mistake" },
    ],
  },
  {
    label: "Other",
    options: [{ value: "other", label: "Other" }],
  },
];

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
const distanceInMiles = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const earthKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (earthKm * c) * 0.621371;
};

const loadGoogleMapsPlaces = async () => {
  if (window.google?.maps?.places) return window.google;

  if (window.google?.maps && typeof window.google.maps.importLibrary === "function") {
    await window.google.maps.importLibrary("places");
    if (window.google?.maps?.places) return window.google;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is missing.");
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="profile-returns-dropoff"]');
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
    script.dataset.googleMaps = "profile-returns-dropoff";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  });

  if (!window.google?.maps?.places) {
    throw new Error("Google Places library is unavailable.");
  }

  return window.google;
};

const findDropoffByPostcode = async (courier: string, postcode: string): Promise<DropoffPoint[]> => {
  const trimmedPostcode = postcode.trim();
  if (trimmedPostcode === "") {
    throw new Error("Enter a postcode to find drop-off points.");
  }

  const googleApi = await loadGoogleMapsPlaces();
  const map = new googleApi.maps.Map(document.createElement("div"));
  const placesService = new googleApi.maps.places.PlacesService(map);
  const geocoder = new googleApi.maps.Geocoder();
  const queries = dropoffQueriesForCourier(courier);
  const weekdayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date()).toLowerCase();

  const origin = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    geocoder.geocode({ address: `${trimmedPostcode}, UK` }, (results: any[], status: string) => {
      if ((status === "OK" || status === googleApi.maps.GeocoderStatus.OK) && Array.isArray(results) && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: Number(loc.lat()), lng: Number(loc.lng()) });
        return;
      }
      reject(new Error("Postcode not found. Please check and try again."));
    });
  });

  const runQuery = (query: string) => new Promise<any[]>((resolve, reject) => {
    placesService.textSearch(
      {
        query,
        location: new googleApi.maps.LatLng(origin.lat, origin.lng),
        radius: 18000,
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
        reject(new Error("Unable to fetch drop-off points right now."));
      }
    );
  });

  const collected: DropoffPoint[] = [];
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
        openingHours: null,
        openNow: null,
        distanceMiles,
      });
    }
  }

  const deduped = Array.from(new Map(collected.map((point) => [point.id, point])).values())
    .sort((a, b) => (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 8);

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
    deduped.map(async (point) => {
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

const formatDateTime = (value?: string | null) => {
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

const formatMoney = (value?: number | null, currency = "GBP") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
};

const getStatusLabel = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("approve")) return "Approved";
  if (value.includes("reject")) return "Declined";
  if (value.includes("more_info")) return "More info requested";
  if (value.includes("in_transit")) return "Parcel sent";
  if (value.includes("exchange")) return "Exchange arranged";
  if (value.includes("receive")) return "Item received";
  if (value.includes("refund")) return "Refund issued";
  return "Pending review";
};

const getStatusClassName = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("approve")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (value.includes("reject")) return "border-[#F4C7C1] bg-[#FFF2F1] text-[#9F3126]";
  if (value.includes("in_transit")) return "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]";
  if (value.includes("refund") || value.includes("receive") || value.includes("exchange")) {
    return "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]";
  }
  return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
};

const getProgressStep = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending" || value === "more_info_requested") return 1;
  if (value === "approved") return 2;
  if (value === "in_transit") return 3;
  if (["received", "refunded", "exchange_offered", "rejected"].includes(value)) return 4;
  return 1;
};

export default function OrderReturnSection({ order, isOpen, onClose, onSubmitted }: OrderReturnSectionProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<number, number>>({});
  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [dropoffPostcode, setDropoffPostcode] = useState("");
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [dropoffError, setDropoffError] = useState<string | null>(null);
  const [dropoffPoints, setDropoffPoints] = useState<DropoffPoint[]>([]);
  const [markSentLoading, setMarkSentLoading] = useState(false);
  const [stepsNotice, setStepsNotice] = useState<string | null>(null);
  const [moreEvidenceFiles, setMoreEvidenceFiles] = useState<File[]>([]);
  const [moreEvidenceMessage, setMoreEvidenceMessage] = useState("");
  const [moreEvidenceSubmitting, setMoreEvidenceSubmitting] = useState(false);
  const [moreEvidenceError, setMoreEvidenceError] = useState<string | null>(null);

  const eligibility = order.return_eligibility || null;
  const requests = order.return_requests || [];
  const activeRequest = useMemo(() => requests[0] || null, [requests]);

  const activeStatus = String(activeRequest?.status || "").toLowerCase();
  const selectedItemIds = useMemo(
    () => Object.entries(selectedItemQuantities)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([itemId]) => Number(itemId)),
    [selectedItemQuantities]
  );
  const selectedUnitsCount = useMemo(
    () => Object.values(selectedItemQuantities).reduce((sum, quantity) => sum + Number(quantity || 0), 0),
    [selectedItemQuantities]
  );
  const courierProvider = detectCourierProvider(activeRequest?.return_shipping_service);
  const canOpenStepsModal = Boolean(activeRequest && ["approved", "in_transit", "received", "exchange_offered"].includes(activeStatus));
  const canMarkSent = activeStatus === "approved";
  const hasMarkedSent = ["in_transit", "received", "refunded", "exchange_offered", "rejected"].includes(activeStatus);
  const canUploadMoreEvidence = activeStatus === "more_info_requested";
  const isCompletedStatus = ["refunded", "rejected", "exchange_offered"].includes(activeStatus);
  const isRefundCompleted = activeStatus === "refunded";
  const isPendingFinalDecision = activeStatus === "received";
  const showLabelCard = !["refunded", "rejected", "exchange_offered", "received"].includes(activeStatus);
  const currentProgressStep = getProgressStep(activeStatus);
  const returnProgress = [
    { title: "Claim submitted", description: "Your return request was received." },
    { title: "Review decision", description: "Admin review, approval, or more information request." },
    activeStatus === "in_transit"
      ? { title: "Waiting for receipt", description: "Your parcel has been sent. We are waiting for it to be received." }
      : { title: "Send parcel", description: "Attach your label and drop off your package." },
    { title: "Final outcome", description: "Refund, exchange, or final status update." },
  ];

  const canRequest = Boolean(eligibility?.can_request) && !activeRequest;

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError(null);
    setSelectedItemQuantities({});
    setReasonCode("");
    setReasonText("");
    setOptionalMessage("");
    setProofFiles([]);
    setStepsModalOpen(false);
    setDropoffPostcode("");
    setDropoffPoints([]);
    setDropoffError(null);
    setDropoffLoading(false);
    setMarkSentLoading(false);
    setStepsNotice(null);
    setMoreEvidenceFiles([]);
    setMoreEvidenceMessage("");
    setMoreEvidenceSubmitting(false);
    setMoreEvidenceError(null);
  }, [isOpen, order.id]);

  const goNext = () => {
    setError(null);

    if (step === 1) {
      if (selectedItemIds.length === 0) {
        setError("Select at least one item to return.");
        return;
      }
      if (!reasonCode) {
        setError("Select a return reason.");
        return;
      }
      if (reasonCode === "other" && reasonText.trim() === "") {
        setError("Please provide details for the 'Other' reason.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (proofFiles.length === 0) {
        setError("Upload at least one image as return evidence.");
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 1) return;
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const toggleItem = (itemId: number, maxQuantity: number) => {
    setSelectedItemQuantities((prev) => {
      const isSelected = Number(prev[itemId] || 0) > 0;
      if (isSelected) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: 1,
      };
    });
  };

  const setItemQuantity = (itemId: number, nextQuantity: number, maxQuantity: number) => {
    const clampedQuantity = Math.min(Math.max(1, Number(nextQuantity || 1)), Math.max(1, Number(maxQuantity || 1)));
    setSelectedItemQuantities((prev) => ({
      ...prev,
      [itemId]: clampedQuantity,
    }));
  };

  const submitReturn = async () => {
    if (submitting) return;

    setError(null);

    if (!canRequest) {
      setError(activeRequest
        ? "A return request is already in progress for this order."
        : (eligibility?.message || "This order is not eligible for return."));
      return;
    }

    if (selectedItemIds.length === 0 || !reasonCode || proofFiles.length === 0) {
      setError("Complete all return steps before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      selectedItemIds.forEach((id) => formData.append("item_ids[]", String(id)));
      selectedItemIds.forEach((id) => {
        const quantity = Number(selectedItemQuantities[id] || 1);
        formData.append(`item_quantities[${id}]`, String(quantity));
      });
      formData.append("reason_code", reasonCode);

      const composedMessage = reasonCode === "other"
        ? reasonText.trim()
        : optionalMessage.trim();
      if (composedMessage !== "") {
        formData.append("reason_text", composedMessage);
      }

      proofFiles.forEach((file) => formData.append("proofs[]", file));

      await axios.post(`/orders/${order.id}/returns`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await onSubmitted();
      onClose();
    } catch (submitError: unknown) {
      const message =
        axios.isAxiosError(submitError)
          ? String(submitError.response?.data?.message || "Could not submit return request right now.")
          : "Could not submit return request right now.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const searchDropoffPoints = async () => {
    setDropoffLoading(true);
    setDropoffError(null);
    setDropoffPoints([]);

    try {
      const points = await findDropoffByPostcode(courierProvider, dropoffPostcode);
      if (points.length === 0) {
        setDropoffError(`No ${courierProvider} drop-off points were found near that postcode.`);
      }
      setDropoffPoints(points);
    } catch (searchError) {
      setDropoffError(searchError instanceof Error ? searchError.message : "Unable to find drop-off points.");
    } finally {
      setDropoffLoading(false);
    }
  };

  const markItemSent = async () => {
    if (!activeRequest || markSentLoading || !canMarkSent) return;

    setMarkSentLoading(true);
    setStepsNotice(null);

    try {
      await axios.patch(`/orders/${order.id}/returns/${activeRequest.id}/mark-sent`);
      await onSubmitted();
      setStepsNotice("Return marked as sent. We will update you once it is received.");
    } catch (markError: unknown) {
      const message =
        axios.isAxiosError(markError)
          ? String(markError.response?.data?.message || "Could not update return status right now.")
          : "Could not update return status right now.";
      setDropoffError(message);
    } finally {
      setMarkSentLoading(false);
    }
  };

  const submitMoreEvidence = async () => {
    if (!activeRequest || moreEvidenceSubmitting) return;
    if (moreEvidenceFiles.length === 0) {
      setMoreEvidenceError("Upload at least one image.");
      return;
    }

    setMoreEvidenceSubmitting(true);
    setMoreEvidenceError(null);

    try {
      const formData = new FormData();
      moreEvidenceFiles.forEach((file) => formData.append("proofs[]", file));
      if (moreEvidenceMessage.trim() !== "") {
        formData.append("message", moreEvidenceMessage.trim());
      }

      await axios.post(`/orders/${order.id}/returns/${activeRequest.id}/more-evidence`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await onSubmitted();
      setMoreEvidenceFiles([]);
      setMoreEvidenceMessage("");
      setStepsNotice("Additional evidence submitted. Your return is back under review.");
    } catch (submitError: unknown) {
      const message =
        axios.isAxiosError(submitError)
          ? String(submitError.response?.data?.message || "Could not submit evidence right now.")
          : "Could not submit evidence right now.";
      setMoreEvidenceError(message);
    } finally {
      setMoreEvidenceSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-[#E8DAB8] bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-[#E7DCC2] px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8862]">Returns</p>
              <h3 className="mt-1 text-xl font-bold text-[#2D2515]">Order #{order.order_number}</h3>
              <p className="mt-1 text-sm text-[#6E5F41]">Delivered orders can be returned within 30 days with image proof.</p>
              {eligibility?.delivery_date ? (
                <p className="mt-1 text-xs text-[#7D6A45]">
                  Delivered: {formatDateOnly(eligibility.delivery_date)} • Window ends: {formatDateOnly(eligibility.eligibility_expires_at)}
                  {typeof eligibility.days_left === "number" ? ` • ${eligibility.days_left} day${eligibility.days_left === 1 ? "" : "s"} left` : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E1D4B8] px-3 py-1.5 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
            >
              Close
            </button>
          </div>

          {activeRequest ? (
            <div className="px-5 py-4">
              <div className="rounded-xl border border-[#D8C9A5] bg-[#FFFEFB] p-4">
                <p className="text-sm font-semibold text-[#6A541F]">
                  {isCompletedStatus ? "Return request complete." : "Return request in progress."}
                </p>
                <p className="mt-1 text-sm text-[#7D6A45]">
                  #{activeRequest.id} • {activeRequest.reason_label} • {getStatusLabel(activeRequest.status)}
                </p>
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClassName(activeRequest.status)}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {getStatusLabel(activeRequest.status)}
                </span>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {returnProgress.map((progress, index) => {
                    const progressStep = index + 1;
                    const isDone = isRefundCompleted ? true : progressStep < currentProgressStep;
                    const isCurrent = isRefundCompleted ? false : progressStep === currentProgressStep;

                    return (
                      <div
                        key={progress.title}
                        className={`rounded-lg border px-2 py-2 ${
                          isCurrent
                            ? "border-[#D1B46F] bg-[#FFF3D6]"
                            : isDone
                              ? "border-[#CDE3B2] bg-[#F2FAE8]"
                              : "border-[#E7DCC2] bg-white"
                        }`}
                      >
                        <p className="text-[11px] font-semibold text-[#2D2515]">{progressStep}. {progress.title}</p>
                        <p className="mt-1 text-[10px] text-[#7D6A45]">{progress.description}</p>
                      </div>
                    );
                  })}
                </div>

                {activeRequest.admin_note ? (
                  <p className="mt-3 rounded-lg border border-[#E7DCC2] bg-white px-3 py-2 text-xs text-[#6B5A34]">
                    <span className="font-semibold text-[#2D2515]">Admin note:</span> {activeRequest.admin_note}
                  </p>
                ) : null}

                {showLabelCard && activeRequest.shippo_label_url ? (
                  <div className="mt-3 rounded-lg border border-[#E7DCC2] bg-white px-3 py-2 text-xs text-[#6B5A34]">
                    <p className="font-semibold text-[#2D2515]">Return label ready</p>
                    <p className="mt-1">Tracking: {activeRequest.shippo_tracking_number || "N/A"}</p>
                    <a
                      href={activeRequest.shippo_label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-[#8A6D2B] underline underline-offset-4"
                    >
                      Open return label
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}

                {isPendingFinalDecision ? (
                  <div className="mt-3 rounded-lg border border-[#E8D0A0] bg-[#FFF5E2] px-3 py-2 text-xs text-[#8C6221]">
                    <p className="font-semibold">Pending admin final decision</p>
                    <p className="mt-1">
                      Your return has been received and is now being reviewed for the final outcome.
                    </p>
                  </div>
                ) : null}

                {activeStatus === "refunded" ? (
                  <div className="mt-3 rounded-lg border border-[#CDE3B2] bg-[#F2FAE8] p-3 text-xs text-[#4D6E2A]">
                    <p className="font-semibold text-[#2D2515]">Refund issued</p>
                    <p className="mt-2">Payment amount: {formatMoney(activeRequest.stripe_payment_amount, activeRequest.stripe_refund_currency || "GBP")}</p>
                    <p className="mt-1">Fees: - {formatMoney(activeRequest.stripe_fee_amount, activeRequest.stripe_refund_currency || "GBP")}</p>
                    <p className="mt-1">Refunded amount: - {formatMoney(activeRequest.refund_amount, activeRequest.stripe_refund_currency || "GBP")}</p>
                    <p className="mt-1">Net amount: {formatMoney(activeRequest.stripe_net_amount, activeRequest.stripe_refund_currency || "GBP")}</p>
                    <p className="mt-1">Reference: {activeRequest.stripe_refund_id || "N/A"}</p>
                    <p className="mt-2">
                      It may take a few business days for the refund to appear in your bank account.
                    </p>
                    {activeRequest.stripe_refund_id ? (
                      <a
                        href={`/orders/${order.id}/returns/${activeRequest.id}/refund-statement`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-[#4D6E2A] underline underline-offset-4"
                      >
                        Download refund statement
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {activeStatus === "rejected" ? (
                  <div className="mt-3 rounded-lg border border-[#E8D0A0] bg-[#FFF5E2] px-3 py-2 text-xs text-[#8C6221]">
                    <p className="font-semibold text-[#2D2515]">Final outcome: Refund declined</p>
                    <p className="mt-1">{activeRequest.admin_note?.trim() || "Please check your return updates for more details."}</p>
                  </div>
                ) : null}

                {canUploadMoreEvidence ? (
                  <div className="mt-3 rounded-lg border border-[#E7DCC2] bg-white p-3">
                    <p className="text-xs font-semibold text-[#2D2515]">Step 2 action: Upload requested evidence</p>
                    <p className="mt-1 text-xs text-[#6B5A34]">Add photos and a message below. This stays in the same return modal.</p>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#D7BE84] bg-[#FFFDF6] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]">
                      <Upload className="h-4 w-4" />
                      Upload additional evidence images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          setMoreEvidenceFiles(Array.from(event.target.files || []));
                          setMoreEvidenceError(null);
                        }}
                      />
                    </label>
                    {moreEvidenceFiles.length > 0 ? (
                      <p className="mt-2 text-xs text-[#6B5A34]">{moreEvidenceFiles.length} file{moreEvidenceFiles.length === 1 ? "" : "s"} selected.</p>
                    ) : null}

                    <textarea
                      value={moreEvidenceMessage}
                      onChange={(event) => {
                        setMoreEvidenceMessage(event.target.value);
                        setMoreEvidenceError(null);
                      }}
                      rows={3}
                      placeholder="Add any extra details for the admin team..."
                      className="mt-3 w-full rounded-lg border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                    />

                    {moreEvidenceError ? (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {moreEvidenceError}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void submitMoreEvidence()}
                      disabled={moreEvidenceSubmitting || moreEvidenceFiles.length === 0}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      {moreEvidenceSubmitting ? "Submitting..." : "Submit more evidence"}
                    </button>
                  </div>
                ) : null}

                {canOpenStepsModal ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStepsModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-[#FFFDF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Open Return Steps
                    </button>
                    <button
                      type="button"
                      onClick={() => void markItemSent()}
                      disabled={!canMarkSent || markSentLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      {markSentLoading ? "Updating..." : canMarkSent ? "I have sent the item" : hasMarkedSent ? "Item already marked as sent" : "Waiting for approval"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 border-b border-[#EFE2C5] px-5 py-3">
                {["Reason", "Evidence", "Submit claim"].map((label, index) => {
                  const stepNumber = (index + 1) as 1 | 2 | 3;
                  const active = step === stepNumber;
                  const done = step > stepNumber;
                  return (
                    <div
                      key={label}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold ${
                        active
                          ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                          : done
                            ? "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]"
                            : "border-[#E7DCC2] bg-[#FFFEFB] text-[#7D6A45]"
                      }`}
                    >
                      {index + 1}. {label}
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
                {step === 1 ? (
                  <div>
                    <p className="text-sm font-semibold text-[#2D2515]">Step 1: Select item(s) and return reason</p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {order.items.map((item) => {
                        const checked = Number(selectedItemQuantities[item.id] || 0) > 0;
                        const selectedQuantity = Number(selectedItemQuantities[item.id] || 1);
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border px-3 py-2 transition ${
                              checked ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E8DAB8] bg-[#FFFEFB]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleItem(item.id, item.quantity)}
                                className="h-4 w-4 rounded border-[#CBB37B] text-[#B89443] focus:ring-[#B89443]"
                              />
                              <img
                                src={item.image_url || "/images/placeholder.jpg"}
                                alt={item.product_name}
                                className="h-10 w-10 rounded border border-[#E4D4AE] object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[#2D2515]">{item.product_name}</p>
                                <p className="text-[11px] text-[#7D6A45]">Bought qty {item.quantity} • Size {item.size || "N/A"}</p>
                              </div>
                            </div>

                            {checked ? (
                              <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-[#DCCAA0] bg-white px-2 py-1.5">
                                <span className="text-[11px] font-semibold text-[#6A541F]">Return quantity</span>
                                <select
                                  value={String(selectedQuantity)}
                                  onChange={(event) => setItemQuantity(item.id, Number(event.target.value), item.quantity)}
                                  className="h-8 rounded-md border border-[#DCCAA0] bg-[#FFFEFB] px-2 text-xs font-semibold text-[#6A541F] outline-none focus:border-[#C9A85B]"
                                >
                                  {Array.from({ length: Math.max(1, item.quantity) }, (_, index) => index + 1).map((qty) => (
                                    <option key={`${item.id}-${qty}`} value={qty}>{qty}</option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 space-y-2">
                      {REASON_GROUPS.map((group) => (
                        <div key={group.label} className="rounded-lg border border-[#E8DAB8] bg-[#FFFEFB] p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B8862]">{group.label}</p>
                          <div className="mt-1 space-y-1">
                            {group.options.map((option) => (
                              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[#FFF8EA]">
                                <input
                                  type="radio"
                                  name={`return-reason-${order.id}`}
                                  value={option.value}
                                  checked={reasonCode === option.value}
                                  onChange={(event) => setReasonCode(event.target.value)}
                                  className="h-3.5 w-3.5 border-[#CBB37B] text-[#B89443] focus:ring-[#B89443]"
                                />
                                <span className="text-xs text-[#3A2F18]">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {reasonCode === "other" ? (
                      <textarea
                        value={reasonText}
                        onChange={(event) => setReasonText(event.target.value)}
                        rows={3}
                        placeholder="Please describe your return reason..."
                        className="mt-2 w-full rounded-lg border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                      />
                    ) : null}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#2D2515]">Step 2: Upload evidence</p>

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#D7BE84] bg-[#FFFDF6] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]">
                      <Upload className="h-4 w-4" />
                      Upload return evidence images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => setProofFiles(Array.from(event.target.files || []))}
                      />
                    </label>
                    {proofFiles.length > 0 ? (
                      <p className="text-xs text-[#6B5A34]">{proofFiles.length} file{proofFiles.length === 1 ? "" : "s"} selected.</p>
                    ) : null}

                    <textarea
                      value={optionalMessage}
                      onChange={(event) => setOptionalMessage(event.target.value)}
                      rows={3}
                      placeholder="Optional message for support team..."
                      className="w-full rounded-lg border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                    />

                    <div className="rounded-lg border border-[#E8DAB8] bg-[#FFFEFB] px-4 py-4 text-sm text-[#6B5A34]">
                      <p className="inline-flex items-center gap-1 font-semibold text-[#2D2515]"><ShieldCheck className="h-4 w-4" /> Evidence tips</p>
                      <p className="mt-2">1. Include clear photos of the issue and full product.</p>
                      <p className="mt-1">2. Add packaging photo when possible.</p>
                      <p className="mt-1">3. Submit up to 6 photos for fastest review.</p>
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#2D2515]">Step 3: Submit return claim</p>

                    <div className="rounded-lg border border-[#E8DAB8] bg-[#FFFEFB] p-3 text-xs text-[#6B5A34]">
                      <p><span className="font-semibold text-[#2D2515]">Items selected:</span> {selectedItemIds.length}</p>
                      <p className="mt-1"><span className="font-semibold text-[#2D2515]">Units to return:</span> {selectedUnitsCount}</p>
                      <p className="mt-1"><span className="font-semibold text-[#2D2515]">Reason:</span> {REASON_GROUPS.flatMap((g) => g.options).find((o) => o.value === reasonCode)?.label || "N/A"}</p>
                      <p className="mt-1"><span className="font-semibold text-[#2D2515]">Evidence files:</span> {proofFiles.length}</p>
                    </div>

                    <div className="rounded-lg border border-[#E8DAB8] bg-[#FFFEFB] px-4 py-4 text-sm text-[#6B5A34]">
                      <p className="inline-flex items-center gap-1 font-semibold text-[#2D2515]"><Package className="h-4 w-4" /> What happens next</p>
                      <p className="mt-2">1. Your claim goes to our admin team for review.</p>
                      <p className="mt-1">2. You will get a decision notification if approved or declined.</p>
                      <p className="mt-1">3. If approved, we will issue your return label and guided return steps.</p>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#EFE2C5] px-5 py-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1 || submitting}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E1D4B8] px-3 py-2 text-xs font-semibold text-[#7B6530] disabled:opacity-50"
                >
                  Back
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335]"
                  >
                    Continue
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitReturn()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit return claim"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {stepsModalOpen && activeRequest ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#E8DAB8] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7DCC2] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6D2B]">Approved Return</p>
                <h3 className="mt-1 text-lg font-bold text-[#2D2515]">Return steps for order #{order.order_number}</h3>
                <p className="mt-1 text-xs text-[#6B5A34]">Courier: {courierProvider}</p>
              </div>
              <button
                type="button"
                onClick={() => setStepsModalOpen(false)}
                className="rounded-lg border border-[#E1D4B8] px-2 py-1 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="rounded-xl border border-[#E8DAB8] bg-[#FFFEFB] p-4 text-sm text-[#6B5A34]">
                <p className="font-semibold text-[#2D2515]">1. Print and attach your label</p>
                <p className="mt-1">Print the shipping label, place the item in its original packaging where possible, and seal the box securely.</p>
                {activeRequest.shippo_label_url ? (
                  <a
                    href={activeRequest.shippo_label_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-[#8A6D2B] underline underline-offset-4"
                  >
                    Open shipping label
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-[#8A5E1E]">Label is being prepared. We will notify you as soon as it is ready.</p>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-[#E8DAB8] bg-[#FFFEFB] p-4 text-sm text-[#6B5A34]">
                <p className="font-semibold text-[#2D2515]">2. Drop off at a nearby point</p>
                <p className="mt-1">Enter your postcode to find nearby {courierProvider} drop-off points and opening times.</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={dropoffPostcode}
                    onChange={(event) => setDropoffPostcode(event.target.value)}
                    placeholder="Enter postcode"
                    className="h-10 w-full max-w-[220px] rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                  />
                  <button
                    type="button"
                    onClick={() => void searchDropoffPoints()}
                    disabled={dropoffLoading || dropoffPostcode.trim() === ""}
                    className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                  >
                    {dropoffLoading ? "Searching..." : "Find drop-off points"}
                  </button>
                </div>

                {dropoffError ? (
                  <p className="mt-3 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">{dropoffError}</p>
                ) : null}

                {dropoffPoints.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {dropoffPoints.map((point) => (
                      <div key={point.id} className="rounded-lg border border-[#E7DCC2] bg-white px-3 py-2 text-xs text-[#6B5A34]">
                        <p className="font-semibold text-[#2D2515]">{point.name}</p>
                        <p className="mt-0.5">{point.address}</p>
                        <p className="mt-1">
                          {point.openNow === true ? "Open now" : point.openNow === false ? "Closed now" : "Status unavailable"}
                          {point.openingHours ? ` • ${point.openingHours}` : ""}
                          {typeof point.distanceMiles === "number" ? ` • ${point.distanceMiles.toFixed(1)} miles` : ""}
                        </p>
                        <a
                          href={point.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 font-semibold text-[#8A6D2B] underline underline-offset-4"
                        >
                          Open in Maps
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl border border-[#E8DAB8] bg-[#FFFEFB] p-4 text-sm text-[#6B5A34]">
                <p className="font-semibold text-[#2D2515]">3. Confirm it has been sent</p>
                <p className="mt-1">
                  {hasMarkedSent
                    ? "Parcel marked as sent. We are now waiting for the item to be received."
                    : "After dropping off the parcel, mark it as sent so we can track and process faster."}
                </p>
                <button
                  type="button"
                  onClick={() => void markItemSent()}
                  disabled={!canMarkSent || markSentLoading}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                >
                  {markSentLoading ? "Updating..." : canMarkSent ? "I have sent the item" : hasMarkedSent ? "Waiting for item to be received" : "Waiting for approval"}
                </button>
                <p className="mt-2 text-xs">Status: {getStatusLabel(activeRequest.status)} • Last update: {formatDateTime(activeRequest.customer_shipped_at || activeRequest.requested_at)}</p>
              </div>

              {stepsNotice ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#CDE3B2] bg-[#F2FAE8] px-3 py-2 text-xs font-semibold text-[#4D6E2A]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {stepsNotice}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
