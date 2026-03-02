import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { Check, ChevronDown, Star, Truck } from "lucide-react";
import OrderReturnSection, { type ReturnEnabledOrder } from "./components/OrderReturnSection";

interface OrderItem {
  id: number;
  product_name: string;
  size?: string | null;
  colour?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
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

export default function OrdersTab({ sortBy = "newest" }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const [returnModalOrderId, setReturnModalOrderId] = useState<number | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

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

  const getActiveReturnRequest = (order: Order): ReturnRequestSummary | null => {
    const requests = Array.isArray(order.return_requests) ? order.return_requests : [];
    return requests.find((request) =>
      ["pending", "approved", "more_info_requested", "received"].includes(String(request.status || ""))
    ) || null;
  };

  const getStatusLabel = (order: Order) => {
    if (getActiveReturnRequest(order)) return "Pending return";
    const s = (order.status ?? "").toLowerCase().trim();
    if (["cancelled", "canceled"].some((v) => s.includes(v))) return "Cancelled";
    if (["delivered"].some((v) => s.includes(v))) return "Delivered";
    if (["out for delivery", "outfordelivery", "dispatched", "shipped"].some((v) => s.includes(v))) return "Dispatched";
    if (["in_production", "in production", "processing", "packed"].some((v) => s.includes(v))) return "Preparing";
    return "Order placed";
  };

  const getStatusStyles = (order: Order) => {
    if (getActiveReturnRequest(order)) {
      return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
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
        const activeReturnRequest = getActiveReturnRequest(order);
        const canRequestReturn = Boolean(order.return_eligibility?.can_request) && !activeReturnRequest;
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
                  {activeReturnRequest ? (
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
                        <p className="text-xs font-semibold text-[#6A541F]">Active return request in progress.</p>
                        <p className="mt-1 text-xs text-[#7D6A45]">
                          #{activeReturnRequest.id} • {activeReturnRequest.reason_label} • Pending review
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
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#6E5A2E]">£{Number(item.line_total || 0).toFixed(2)}</p>
                              <p className="mt-0.5 text-xs text-[#8A7B5A]">£{Number(item.unit_price || 0).toFixed(2)} each</p>
                            </div>
                          </div>
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
                    ) : activeReturnRequest ? (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-[#D9C79C] bg-[#FFF9E9] px-3 py-2 text-xs font-semibold text-[#7A6231]">
                        Pending Return
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setReviewNotice("Leave review will be available soon.")}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D7BE84] bg-[#FFFDF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Leave Review
                    </button>

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
      {reviewNotice ? (
        <p className="inline-flex rounded-lg border border-[#E5D7B8] bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#7A6231]">
          {reviewNotice}
        </p>
      ) : null}
    </>
  );
}
