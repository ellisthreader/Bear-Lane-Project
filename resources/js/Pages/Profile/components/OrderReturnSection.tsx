import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, ChevronRight, Package, ShieldCheck, Upload } from "lucide-react";

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
};

type ReturnEligibility = {
  delivered: boolean;
  can_request: boolean;
  message?: string | null;
  delivery_date?: string | null;
  eligibility_expires_at?: string | null;
  days_left?: number | null;
};

type ReturnShippingRate = {
  object_id: string;
  service_name: string;
  provider?: string | null;
  estimated_days?: number | null;
  amount: number;
  currency?: string | null;
};

type ReturnAddress = {
  name: string;
  street1: string;
  city: string;
  zip: string;
  country: string;
};

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

const getStatusLabel = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("approve")) return "Approved";
  if (value.includes("reject")) return "Rejected";
  if (value.includes("more_info")) return "More info requested";
  if (value.includes("receive")) return "Item received";
  if (value.includes("refund")) return "Refund issued";
  return "Pending review";
};

const getStatusClassName = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("approve")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (value.includes("reject")) return "border-[#F4C7C1] bg-[#FFF2F1] text-[#9F3126]";
  if (value.includes("refund") || value.includes("receive")) {
    return "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]";
  }
  return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
};

export default function OrderReturnSection({ order, isOpen, onClose, onSubmitted }: OrderReturnSectionProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [shippingRates, setShippingRates] = useState<ReturnShippingRate[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string>("");
  const [returnAddress, setReturnAddress] = useState<ReturnAddress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibility = order.return_eligibility || null;
  const requests = order.return_requests || [];
  const activeRequest = useMemo(
    () => requests.find((request) => ["pending", "approved", "more_info_requested", "received"].includes(String(request.status || ""))),
    [requests]
  );

  const selectedRate = useMemo(
    () => shippingRates.find((rate) => rate.object_id === selectedRateId) || null,
    [selectedRateId, shippingRates]
  );

  const canRequest = Boolean(eligibility?.can_request) && !activeRequest;

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError(null);
    setSelectedItemIds([]);
    setReasonCode("");
    setReasonText("");
    setOptionalMessage("");
    setProofFiles([]);
    setShippingRates([]);
    setShippingLoading(false);
    setShippingError(null);
    setSelectedRateId("");
    setReturnAddress(null);
  }, [isOpen, order.id]);

  useEffect(() => {
    if (!isOpen || step !== 3 || shippingRates.length > 0 || shippingLoading) return;

    const fetchShipping = async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const response = await axios.get(`/orders/${order.id}/returns/shipping-options`);
        const rates = Array.isArray(response.data?.rates) ? response.data.rates : [];
        const cheapestRateId = String(response.data?.cheapest_rate_id || "");
        const address = response.data?.return_address || null;

        setShippingRates(rates);
        setSelectedRateId(cheapestRateId || String(rates[0]?.object_id || ""));
        setReturnAddress(address);
      } catch (fetchError: unknown) {
        const message =
          axios.isAxiosError(fetchError)
            ? String(fetchError.response?.data?.message || "Could not load return shipping options right now.")
            : "Could not load return shipping options right now.";
        setShippingError(message);
      } finally {
        setShippingLoading(false);
      }
    };

    void fetchShipping();
  }, [isOpen, order.id, shippingLoading, shippingRates.length, step]);

  const goNext = () => {
    setError(null);

    if (step === 1) {
      if (selectedItemIds.length === 0) {
        setError("Select at least one item to return.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!reasonCode) {
        setError("Select a return reason.");
        return;
      }
      if (reasonCode === "other" && reasonText.trim() === "") {
        setError("Please provide details for the 'Other' reason.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!selectedRateId) {
        setError("Choose a shipping option to continue.");
        return;
      }
      setStep(4);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 1) return;
    setStep((prev) => (prev === 4 ? 3 : prev === 3 ? 2 : 1));
  };

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
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

    if (selectedItemIds.length === 0 || !reasonCode || !selectedRate || proofFiles.length === 0) {
      setError("Complete all return steps before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      selectedItemIds.forEach((id) => formData.append("item_ids[]", String(id)));
      formData.append("reason_code", reasonCode);
      const composedMessage = reasonCode === "other"
        ? reasonText.trim()
        : optionalMessage.trim();
      if (composedMessage !== "") {
        formData.append("reason_text", composedMessage);
      }

      formData.append("selected_rate_object_id", selectedRate.object_id);
      formData.append("selected_rate_service", selectedRate.service_name);
      formData.append("selected_rate_amount", String(selectedRate.amount));
      formData.append("selected_rate_currency", String(selectedRate.currency || "GBP"));

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

  if (!isOpen) return null;

  return (
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
              <p className="text-sm font-semibold text-[#6A541F]">Active return request in progress.</p>
              <p className="mt-1 text-sm text-[#7D6A45]">
                #{activeRequest.id} • {activeRequest.reason_label} • {getStatusLabel(activeRequest.status)}
              </p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClassName(activeRequest.status)}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {getStatusLabel(activeRequest.status)}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 border-b border-[#EFE2C5] px-5 py-3">
              {["Items", "Reason", "Shipping", "Confirm"].map((label, index) => {
                const stepNumber = (index + 1) as 1 | 2 | 3 | 4;
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
                  <p className="text-sm font-semibold text-[#2D2515]">Select the item(s) you want to return</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {order.items.map((item) => {
                      const checked = selectedItemIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                            checked ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E8DAB8] bg-[#FFFEFB]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 rounded border-[#CBB37B] text-[#B89443] focus:ring-[#B89443]"
                          />
                          <img
                            src={item.image_url || "/images/placeholder.jpg"}
                            alt={item.product_name}
                            className="h-10 w-10 rounded border border-[#E4D4AE] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#2D2515]">{item.product_name}</p>
                            <p className="text-[11px] text-[#7D6A45]">Qty {item.quantity} • Size {item.size || "N/A"}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <p className="text-sm font-semibold text-[#2D2515]">What is the reason for your return?</p>
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
                      placeholder="Please describe your return request..."
                      className="mt-2 w-full rounded-lg border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                    />
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <p className="text-sm font-semibold text-[#2D2515]">Choose your return shipping option</p>
                  <p className="mt-1 text-xs text-[#7D6A45]">
                    Pack the item back into the original box where possible. The cheapest option is pre-selected for you.
                  </p>

                  {returnAddress ? (
                    <div className="mt-3 rounded-lg border border-[#E8DAB8] bg-[#FFFEFB] px-3 py-2 text-xs text-[#6B5A34]">
                      <p className="font-semibold text-[#2D2515]">Return address</p>
                      <p>{returnAddress.name}</p>
                      <p>{returnAddress.street1}, {returnAddress.city}, {returnAddress.zip}, {returnAddress.country}</p>
                    </div>
                  ) : null}

                  {shippingLoading ? (
                    <p className="mt-3 rounded-lg border border-[#E7DCC2] bg-[#FFFEFB] px-3 py-2 text-xs text-[#6B5A34]">Loading shipping options...</p>
                  ) : null}

                  {shippingError ? (
                    <p className="mt-3 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">{shippingError}</p>
                  ) : null}

                  {!shippingLoading && shippingRates.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {shippingRates.map((rate, index) => {
                        const selected = selectedRateId === rate.object_id;
                        const cheapest = index === 0;

                        return (
                          <button
                            key={rate.object_id}
                            type="button"
                            onClick={() => setSelectedRateId(rate.object_id)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                              selected ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E8DAB8] bg-[#FFFEFB] hover:bg-[#FFF8EA]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-[#2D2515]">{rate.service_name}</p>
                                <p className="text-xs text-[#7D6A45]">
                                  {rate.estimated_days ? `${rate.estimated_days} day delivery estimate` : "Delivery estimate unavailable"}
                                  {cheapest ? " • Cheapest" : ""}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-[#2D2515]">{formatMoney(rate.amount, String(rate.currency || "GBP"))}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#2D2515]">Upload proof and confirm return</p>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#D7BE84] bg-[#FFFDF6] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]">
                    <Upload className="h-4 w-4" />
                    Upload return proof images
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
                    <p className="inline-flex items-center gap-1 font-semibold text-[#2D2515]"><Package className="h-4 w-4" /> Return steps</p>
                    <p className="mt-2">1. Pack the product securely.</p>
                    <p className="mt-1">2. Use the selected shipping service to return the parcel. Use QR code in store or print label and attach it to the parcel.</p>
                    <p className="mt-1">3. Our team will review and update you as soon as it arrives.</p>
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
                className="rounded-lg border border-[#D7BE84] bg-white px-3 py-2 text-xs font-semibold text-[#7B6530] disabled:opacity-50"
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335]"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitReturn()}
                    disabled={submitting || proofFiles.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit Return Request"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
