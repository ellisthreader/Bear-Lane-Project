import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { Check, ChevronDown, ImagePlus, Loader2, Star, Truck, X } from "lucide-react";
import OrderReturnSection, { type ReturnEnabledOrder } from "./components/OrderReturnSection";
import { designTypeLabel, normalizeDesignType } from "@/Utils/designType";

interface OrderItemReviewSummary {
  id: number;
  rating: number;
  message: string;
  created_at?: string | null;
  images_count?: number;
}

interface OrderItem {
  id: number;
  product_id?: number | null;
  product_slug?: string | null;
  product_name: string;
  size?: string | null;
  colour?: string | null;
  design_type?: "printing" | "embroidery" | string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  review?: OrderItemReviewSummary | null;
}

interface ReturnEligibility {
  delivered: boolean;
  can_request: boolean;
  message?: string | null;
  delivery_date?: string | null;
  eligibility_expires_at?: string | null;
  days_left?: number | null;
}

interface ReturnRequestSummary {
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
}

interface Order extends ReturnEnabledOrder {
  id: number;
  order_number: string;
  status?: string;
  items: OrderItem[];
  subtotal?: number;
  discount_amount?: number;
  vat?: number;
  shipping?: number;
  total?: number;
  shippo_tracking_number?: string | null;
  tracking_url?: string | null;
  delivery_type?: string | null;
  selected_delivery_date?: string | null;
  calculated_ship_date?: string | null;
  return_eligibility?: ReturnEligibility | null;
  return_requests?: ReturnRequestSummary[];
  created_at: string;
}

type SortBy = "newest" | "oldest";

type OrdersTabProps = {
  sortBy?: SortBy;
};

type ActiveReviewTarget = {
  orderId: number;
  itemId: number;
} | null;

export default function OrdersTab({ sortBy = "newest" }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const [returnModalOrderId, setReturnModalOrderId] = useState<number | null>(null);
  const [activeReviewTarget, setActiveReviewTarget] = useState<ActiveReviewTarget>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get("/user-orders");
      if (response.data.success && Array.isArray(response.data.orders)) {
        const mapped = response.data.orders.map((order: Partial<Order>) => ({
          ...order,
          items: Array.isArray(order.items) ? order.items : [],
          return_requests: Array.isArray(order.return_requests) ? order.return_requests : [],
        })) as Order[];
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = (id: number) => {
    setExpandedOrderIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const getLatestReturnRequest = (order: Order): ReturnRequestSummary | null => {
    const requests = Array.isArray(order.return_requests) ? order.return_requests : [];
    return requests[0] || null;
  };

  const getActiveReturnRequest = (order: Order): ReturnRequestSummary | null => {
    const requests = Array.isArray(order.return_requests) ? order.return_requests : [];
    return requests.find((request) =>
      ["pending", "approved", "more_info_requested", "in_transit", "received", "exchange_offered"].includes(String(request.status || ""))
    ) || null;
  };

  const getReturnStatusMeta = (status?: string | null) => {
    const value = String(status || "").toLowerCase().trim();
    if (value === "approved") {
      return { label: "Approved", styles: "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]" };
    }
    if (value === "refunded") {
      return { label: "Refund issued", styles: "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]" };
    }
    if (value === "rejected") {
      return { label: "Return declined", styles: "border-[#F4C7C1] bg-[#FFF2F1] text-[#9F3126]" };
    }
    if (value === "more_info_requested") {
      return { label: "More info requested", styles: "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]" };
    }
    if (value === "in_transit") {
      return { label: "Return in transit", styles: "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]" };
    }
    if (value === "received") {
      return { label: "Return received", styles: "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]" };
    }
    if (value === "exchange_offered") {
      return { label: "Exchange arranged", styles: "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]" };
    }
    if (value === "pending") {
      return { label: "Pending return", styles: "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]" };
    }
    return null;
  };

  const getStatusLabel = (order: Order) => {
    const latestReturnRequest = getLatestReturnRequest(order);
    const returnStatus = getReturnStatusMeta(latestReturnRequest?.status);
    if (returnStatus) return returnStatus.label;
    const s = (order.status ?? "").toLowerCase().trim();
    if (["cancelled", "canceled"].some((v) => s.includes(v))) return "Cancelled";
    if (["delivered"].some((v) => s.includes(v))) return "Delivered";
    if (["out for delivery", "outfordelivery", "dispatched", "shipped"].some((v) => s.includes(v))) return "Dispatched";
    if (["in_production", "in production", "processing", "packed"].some((v) => s.includes(v))) return "Preparing";
    return "Order placed";
  };

  const getStatusStyles = (order: Order) => {
    const latestReturnRequest = getLatestReturnRequest(order);
    const returnStatus = getReturnStatusMeta(latestReturnRequest?.status);
    if (returnStatus) {
      return returnStatus.styles;
    }
    const s = (order.status ?? "").toLowerCase().trim();
    if (["delivered"].some((v) => s.includes(v))) {
      return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
    }
    if (["out for delivery", "outfordelivery", "dispatched", "shipped"].some((v) => s.includes(v))) {
      return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
    }
    if (["in_production", "in production", "processing", "packed"].some((v) => s.includes(v))) {
      return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
    }
    return "border-[#E5D9BF] bg-[#FFFDF6] text-[#7E6A3E]";
  };

  const getTrackingStage = (status?: string) => {
    const s = (status ?? "").toLowerCase().trim();
    if (["delivered"].some((v) => s.includes(v))) return 4;
    if (["out for delivery", "outfordelivery", "dispatched", "shipped"].some((v) => s.includes(v))) return 3;
    if (["packed"].some((v) => s.includes(v))) return 2;
    if (["in_production", "in production", "processing"].some((v) => s.includes(v))) return 1;
    return 0;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Unknown date";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();

      if (sortBy === "oldest") return aCreated - bCreated;
      return bCreated - aCreated;
    });
    return copy;
  }, [orders, sortBy]);

  const modalOrder = useMemo(
    () => orders.find((order) => order.id === returnModalOrderId) || null,
    [orders, returnModalOrderId]
  );
  const activeReviewOrder = useMemo(
    () => orders.find((order) => order.id === activeReviewTarget?.orderId) || null,
    [orders, activeReviewTarget?.orderId]
  );
  const activeReviewItem = useMemo(
    () => activeReviewOrder?.items.find((item) => item.id === activeReviewTarget?.itemId) || null,
    [activeReviewOrder, activeReviewTarget?.itemId]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E8D9B4] bg-[#FFFCF4] px-5 py-6 text-sm font-medium text-[#7E6A3E]">
        Loading your orders...
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E6D7B0] bg-[#FFFDF8] px-6 py-12 text-center">
        <img src="/icons/NoOrders.png" alt="No orders" className="mx-auto mb-6 w-full max-w-[260px]" />
        <h3 className="text-2xl font-bold text-[#251E11]">No Orders yet</h3>
        <p className="mt-2 text-sm text-[#7A6C4D]">Browse our store to get started</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
        >
          Go to store
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {sortedOrders.map((order, index) => {
        const trackingRef = order.shippo_tracking_number;
        const isExpanded = expandedOrderIds.includes(order.id);
        const isDeliveredOrder = String(order.status || "").toLowerCase().includes("deliver");
        const latestReturnRequest = getLatestReturnRequest(order);
        const activeReturnRequest = getActiveReturnRequest(order);
        const displayReturnRequest = activeReturnRequest || latestReturnRequest;
        const activeReturnStatus = getReturnStatusMeta(displayReturnRequest?.status);
        const canRequestReturn = Boolean(order.return_eligibility?.can_request) && !displayReturnRequest;
        const trackingStage = getTrackingStage(order.status);
        const trackingSteps = [
          { label: "Order placed", description: "Your order has been confirmed and queued." },
          { label: "Starting production", description: "Our team has started producing your item." },
          { label: "Packaged item", description: "The order has been packed and quality checked." },
          { label: "Dispatching item", description: "The parcel is with the courier network." },
          { label: "Delivered", description: "Delivered to your address." },
        ];

        return (
          <div
            key={order.id}
            style={{ animationDelay: `${index * 40}ms` }}
            className="rounded-2xl border border-[#E4D3A8] bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <button
              type="button"
              onClick={() => toggleExpand(order.id)}
              className="w-full rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#978055]">Order Number</p>
                  <p className="text-lg font-bold text-[#2C2415]">#{order.order_number}</p>
                  <p className="mt-1 text-xs text-[#7F704F]">Placed on {formatDate(order.created_at)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles(order)}`}>
                    <span className="h-2 w-2 rounded-full bg-current opacity-75" />
                    {getStatusLabel(order)}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#8A6F37] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>
            </button>

            <div className={`grid transition-all duration-300 ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="space-y-4 border-t border-[#EFE2C5] px-4 pb-4 pt-3">
                  {displayReturnRequest ? (
                    <div className="rounded-xl border border-[#E6D7B0] bg-gradient-to-r from-[#FFFCF5] to-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8862]">Returns</p>
                      <p className="mt-2 text-sm text-[#6E5F41]">Delivered orders can be returned within 30 days with image proof.</p>
                      <p className="mt-1 text-xs text-[#7D6A45]">
                        Delivered: {order.return_eligibility?.delivery_date ? formatDate(order.return_eligibility.delivery_date) : "N/A"} • Window ends:{" "}
                        {order.return_eligibility?.eligibility_expires_at ? formatDate(order.return_eligibility.eligibility_expires_at) : "N/A"} •{" "}
                        {typeof order.return_eligibility?.days_left === "number"
                          ? `${order.return_eligibility.days_left} day${order.return_eligibility.days_left === 1 ? "" : "s"} left`
                          : "N/A"}
                      </p>
                      <div className="mt-3 rounded-lg border border-[#D8C9A5] bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-[#6A541F]">
                          {activeReturnStatus?.label === "Refund issued"
                            ? "Refund completed."
                            : activeReturnStatus?.label === "Approved"
                              ? "Return request approved."
                              : "Return request in progress."}
                        </p>
                        <p className="mt-1 text-xs text-[#7D6A45]">
                          #{displayReturnRequest.id} • {displayReturnRequest.reason_label} • {activeReturnStatus?.label || String(displayReturnRequest.status || "").replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#E6D7B0] bg-gradient-to-r from-[#FFFCF5] to-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8862]">Tracking</p>
                        {trackingRef && order.tracking_url ? (
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-[#DAC89A] bg-white px-3 py-1 text-xs font-semibold text-[#725C2E] hover:bg-[#FFFAEF]"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            {trackingRef}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#DAC89A] bg-white px-3 py-1 text-xs font-semibold text-[#725C2E]">
                            <Truck className="h-3.5 w-3.5" />
                            {trackingRef || "Tracking pending"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-1 sm:gap-2">
                        {trackingSteps.map((step, stepIndex) => {
                          const isComplete = stepIndex <= trackingStage;
                          const isCurrent = stepIndex === trackingStage;
                          return (
                            <div key={step.label} className="relative flex flex-col items-center text-center">
                              <div className="flex w-full items-center justify-center">
                                <div
                                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                    isComplete ? "border-[#C6A75E] bg-[#C6A75E]" : "border-[#D8C79C] bg-white"
                                  }`}
                                >
                                  {isComplete && <Check className="h-4 w-4 text-white" />}
                                  {isCurrent && <span className="absolute -inset-1 rounded-full border border-[#C6A75E]/40" />}
                                </div>
                                {stepIndex < trackingSteps.length - 1 && (
                                  <div
                                    className={`absolute left-1/2 top-3.5 z-0 ml-4 h-[3px] w-[calc(100%-2rem)] rounded-full transition ${
                                      stepIndex < trackingStage ? "bg-[#C6A75E]" : "bg-[#E6D7B0]"
                                    }`}
                                  />
                                )}
                              </div>
                              <p className={`mt-2 text-[11px] font-semibold leading-tight ${isCurrent ? "text-[#6F5A2D]" : "text-[#8A7B5A]"}`}>
                                {step.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 space-y-2">
                        {trackingSteps.map((step, stepIndex) => {
                          const isReached = stepIndex <= trackingStage;
                          return (
                            <div
                              key={`${step.label}-update`}
                              className={`rounded-lg border px-3 py-2 ${
                                isReached
                                  ? "border-[#DCCB9F] bg-white"
                                  : "border-[#EEE2C7] bg-[#FFFDF7]"
                              }`}
                            >
                              <p className={`text-xs font-semibold ${isReached ? "text-[#6F5A2D]" : "text-[#8A7B5A]"}`}>{step.label}</p>
                              <p className="mt-0.5 text-[11px] text-[#8A7B5A]">{step.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {order.items.length ? (
                      order.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[#EADDBB] bg-[#FFFCF5] p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || "/images/placeholder.jpg"}
                              alt={item.product_name}
                              className="h-16 w-16 rounded-lg border border-[#E4D4AE] bg-white object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#312713]">{item.product_name}</p>
                              <p className="mt-1 text-xs text-[#7F704F]">
                                Size: {item.size || "N/A"} · Qty: {item.quantity}
                              </p>
                              {item.colour && <p className="mt-0.5 text-xs text-[#7F704F]">Colour: {item.colour}</p>}
                              <p className="mt-0.5 text-xs font-semibold text-[#6A541F]">
                                Design type: {designTypeLabel(normalizeDesignType(item.design_type))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#6E5A2E]">£{Number(item.line_total || 0).toFixed(2)}</p>
                              <p className="mt-0.5 text-xs text-[#8A7B5A]">£{Number(item.unit_price || 0).toFixed(2)} each</p>
                            </div>
                          </div>
                          {isDeliveredOrder ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {item.review?.id ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#CDE3B2] bg-[#F2FAE8] px-2.5 py-1 text-[11px] font-semibold text-[#4D6E2A]">
                                  <Star className="h-3.5 w-3.5 fill-current" />
                                  Reviewed {Number(item.review.rating || 0).toFixed(1)}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveReviewTarget({ orderId: order.id, itemId: item.id })}
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-[#FFFDF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  Leave Review
                                </button>
                              )}
                              {item.product_slug ? (
                                <a
                                  href={`/product/${item.product_slug}`}
                                  className="inline-flex items-center rounded-lg border border-[#E1D4B8] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF8EA]"
                                >
                                  View Product
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canRequestReturn ? (
                      <button
                        type="button"
                        onClick={() => setReturnModalOrderId(order.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-[#FFFDF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                      >
                        Request Return
                      </button>
                    ) : displayReturnRequest ? (
                      <button
                        type="button"
                        onClick={() => setReturnModalOrderId(order.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D9C79C] bg-[#FFF9E9] px-3 py-2 text-xs font-semibold text-[#7A6231] transition hover:bg-[#FFF3D6]"
                      >
                        View Return
                      </button>
                    ) : null}

                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>
      {modalOrder ? (
        <OrderReturnSection
          order={modalOrder}
          isOpen={Boolean(modalOrder)}
          onClose={() => setReturnModalOrderId(null)}
          onSubmitted={fetchOrders}
        />
      ) : null}
      {activeReviewOrder && activeReviewItem ? (
        <LeaveReviewModal
          order={activeReviewOrder}
          item={activeReviewItem}
          onClose={() => setActiveReviewTarget(null)}
          onSubmitted={async () => {
            await fetchOrders();
            setActiveReviewTarget(null);
          }}
        />
      ) : null}
    </>
  );
}

function renderRatingStars(value: number, className = "h-6 w-6") {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  return Array.from({ length: 5 }).map((_, index) => {
    const fill = Math.max(0, Math.min(1, safe - index));
    return (
      <span key={`review-rating-${index}`} className={`relative inline-flex ${className}`}>
        <Star className={`${className} text-[#E4D4AE]`} />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Star className={`${className} fill-current text-[#C8941C]`} />
        </span>
      </span>
    );
  });
}

function LeaveReviewModal({
  order,
  item,
  onClose,
  onSubmitted,
}: {
  order: Order;
  item: OrderItem;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
}) {
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imagePreviews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((entry) => URL.revokeObjectURL(entry.url));
    };
  }, [imagePreviews]);

  const handleImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const remaining = Math.max(0, 4 - images.length);
    if (remaining <= 0) return;
    setImages((prev) => [...prev, ...selected.slice(0, remaining)]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitReview = async () => {
    setError(null);
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 6) {
      setError("Please write at least a short message about your experience.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rating", String(rating));
      formData.append("message", trimmedMessage);
      images.forEach((file) => formData.append("images[]", file));

      const response = await axios.post(`/orders/${order.id}/items/${item.id}/reviews`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to submit your review.");
      }

      await onSubmitted();
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      setError(typeof serverMessage === "string" ? serverMessage : "Unable to submit your review right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-3xl border border-[#E1CF9F] bg-white shadow-[0_20px_70px_rgba(40,30,10,0.28)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#EFE2C5] bg-gradient-to-r from-[#FFF9EA] to-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9C8452]">Leave us a review</p>
            <h3 className="mt-1 text-lg font-bold text-[#2B2416]">{item.product_name}</h3>
            <p className="mt-1 text-xs text-[#7D6A45]">
              Order #{order.order_number} • Delivered item review
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E1D4B8] bg-white p-2 text-[#6D5A31] transition hover:bg-[#FFF8E8]"
            aria-label="Close review modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-[#E8DDC3] bg-[#FFFCF6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Your rating</p>
            <div className="mt-3">
              <div className="relative inline-flex">
                <div className="inline-flex gap-1">{renderRatingStars(rating)}</div>
                <div className="absolute inset-0 grid grid-cols-10">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const value = (index + 1) / 2;
                    return (
                      <button
                        key={`rating-pick-${value}`}
                        type="button"
                        onClick={() => setRating(value)}
                        className="h-6"
                        aria-label={`Rate ${value} stars`}
                      />
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#6F5A2D]">{rating.toFixed(1)} out of 5</p>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#E9DAB9] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#C79D46] [&::-webkit-slider-thumb]:bg-[#FFF6DF]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Your message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Tell other customers about quality, fit, print quality, and overall experience."
              className="mt-2 w-full rounded-2xl border border-[#E1D4B8] bg-[#FFFEFA] px-4 py-3 text-sm text-[#2D2515] outline-none transition focus:border-[#C9A85B]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Review photos (optional)</label>
            <label className="mt-2 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8C598] bg-[#FFFCF4] text-sm font-semibold text-[#6D5A31] transition hover:bg-[#FFF5E0]">
              <ImagePlus className="h-4 w-4" />
              Upload images (max 4)
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImagesSelected} />
            </label>

            {imagePreviews.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {imagePreviews.map((entry, index) => (
                  <div key={`${entry.file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-[#E7DCC2] bg-white">
                    <img src={entry.url} alt={`Review upload ${index + 1}`} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#EFE2C5] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E1D4B8] bg-white px-4 py-2 text-sm font-semibold text-[#6D5A31] transition hover:bg-[#FFF8EA]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            {submitting ? "Submitting..." : "Publish Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
