import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useAdminOrderReturns, type UpdateReturnAction } from "@/Context/AdminOrderReturnsContext";

type ReturnShippingRate = {
  object_id: string;
  service_name: string;
  provider?: string | null;
  estimated_days?: number | null;
  amount: number;
  currency?: string | null;
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
  if (value.includes("in_transit")) return "Customer sent";
  if (value.includes("exchange")) return "Exchange arranged";
  if (value.includes("receive")) return "Return received";
  if (value.includes("refund")) return "Refund issued";
  return "Pending";
};

const getStatusClassName = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("approve")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (value.includes("reject")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (value.includes("in_transit")) return "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]";
  if (value.includes("refund") || value.includes("receive") || value.includes("exchange")) {
    return "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]";
  }
  return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
};

const getWorkflowStep = (status?: string | null) => {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending" || value === "more_info_requested") return 1;
  if (value === "approved" || value === "in_transit") return 2;
  if (value === "received") return 3;
  if (["refunded", "exchange_offered", "rejected"].includes(value)) return 4;
  return 1;
};

export default function AdminOrderReturnsPanel() {
  const {
    loadingList,
    loadingDetail,
    saving,
    returnRequests,
    selectedReturnId,
    selectedReturn,
    pendingCount,
    error,
    refreshReturnRequests,
    selectReturnRequest,
    updateReturnStatus,
    generateReturnLabel,
  } = useAdminOrderReturns();

  const [search, setSearch] = useState("");
  const [returnsView, setReturnsView] = useState<"active" | "archived" | "all">("active");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [shippingRates, setShippingRates] = useState<ReturnShippingRate[]>([]);
  const [shippingRatesLoading, setShippingRatesLoading] = useState(false);
  const [shippingRatesError, setShippingRatesError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState("");

  useEffect(() => {
    setTrackingNumber(selectedReturn?.shippo_tracking_number || "");
    setNote(selectedReturn?.admin_note || "");
    setRefundAmount(selectedReturn?.refund_amount ? String(selectedReturn.refund_amount) : "");
    setShippingRates([]);
    setShippingRatesError(null);
    setShippingRatesLoading(false);
    setSelectedRateId(String(selectedReturn?.return_shipping_rate_id || ""));
    setStep(getWorkflowStep(selectedReturn?.status) as 1 | 2 | 3 | 4);
  }, [
    selectedReturn?.id,
    selectedReturn?.status,
    selectedReturn?.shippo_tracking_number,
    selectedReturn?.admin_note,
    selectedReturn?.refund_amount,
    selectedReturn?.return_shipping_rate_id,
  ]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byArchiveState = returnRequests.filter((request) => {
      if (returnsView === "all") return true;
      if (returnsView === "archived") return Boolean(request.archived_at);
      return !request.archived_at;
    });

    if (!query) return byArchiveState;

    return byArchiveState.filter((request) => (
      [
        request.order_number,
        request.customer_name,
        request.customer_email || "",
        request.reason_label,
        request.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ));
  }, [returnRequests, search, returnsView]);

  const selectedRate = useMemo(
    () => shippingRates.find((rate) => rate.object_id === selectedRateId) || null,
    [shippingRates, selectedRateId]
  );

  const statusLower = String(selectedReturn?.status || "").toLowerCase();
  const canReviewActions = statusLower === "pending" || statusLower === "more_info_requested";
  const canUseLabelStep = ["approved", "in_transit", "received", "refunded", "exchange_offered"].includes(statusLower);
  const canMarkReceived = statusLower === "approved" || statusLower === "in_transit";
  const canFinalise = ["received", "refunded", "exchange_offered"].includes(statusLower);
  const isFinalOutcomeStatus = ["refunded", "rejected"].includes(statusLower);

  const workflowSteps = [
    { id: 1, title: "Review request" },
    { id: 2, title: "Approve & label" },
    { id: 3, title: "Receive parcel" },
    { id: 4, title: "Final action" },
  ] as const;

  const loadShippingOptions = async () => {
    if (!selectedReturnId) return;

    setShippingRatesLoading(true);
    setShippingRatesError(null);

    try {
      const response = await fetch(`/admin/orders/returns/${selectedReturnId}/shipping-options`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load return shipping options.");
      }

      const rates = Array.isArray(payload?.rates) ? payload.rates : [];
      setShippingRates(rates);
      setSelectedRateId(String(payload?.selected_rate_id || rates[0]?.object_id || ""));
    } catch (loadError) {
      setShippingRates([]);
      setShippingRatesError(loadError instanceof Error ? loadError.message : "Unable to load return shipping options.");
    } finally {
      setShippingRatesLoading(false);
    }
  };

  const runAction = async (action: UpdateReturnAction, successMessage?: string) => {
    try {
      const parsedRefund = refundAmount.trim() !== "" && Number.isFinite(Number(refundAmount))
        ? Number(refundAmount)
        : undefined;

      await updateReturnStatus(action, note, parsedRefund, trackingNumber);
      if (successMessage) setNotice(successMessage);
      return true;
    } catch {
      return false;
    }
  };

  const approveReturn = async () => {
    const ok = await runAction("approve", "Return approved. Continue to Step 2 to generate the label.");
    if (ok) {
      await loadShippingOptions();
      setStep(2);
    }
  };

  const declineReturn = async () => {
    if (note.trim() === "") {
      setNotice("Add a decline note before rejecting this return.");
      return;
    }
    const ok = await runAction("reject", "Return declined and customer notified.");
    if (ok) setStep(4);
  };

  const createLabel = async () => {
    try {
      await generateReturnLabel(selectedRate ? {
        object_id: selectedRate.object_id,
        service_name: selectedRate.service_name,
        amount: selectedRate.amount,
        currency: selectedRate.currency,
      } : undefined);
      setNotice("Return label generated and customer notified.");
      setStep(3);
    } catch {
      // handled by context
    }
  };

  const confirmArrival = async () => {
    const ok = await runAction("mark_received", "Return marked as received. Continue to final action.");
    if (ok) setStep(4);
  };

  const archiveReturn = async () => {
    const ok = await runAction("archive", "Completed return archived.");
    if (ok) {
      await refreshReturnRequests();
    }
  };

  const goNextStep = () => setStep((prev) => (prev >= 4 ? 4 : ((prev + 1) as 1 | 2 | 3 | 4)));
  const goPrevStep = () => setStep((prev) => (prev <= 1 ? 1 : ((prev - 1) as 1 | 2 | 3 | 4)));

  return (
    <section className="rounded-3xl border border-[#E6D8B8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D2B]">Returns Command Centre</p>
          <h3 className="mt-1 text-xl font-bold text-[#2D2515]">Returns & Refund Management</h3>
          <p className="mt-1 text-sm text-[#6B5A34]">Process each return in sequence: review, label, receive, then finalise.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7D7B3] bg-[#FFF9EB] px-3 py-1 text-xs font-semibold text-[#7A6231]">
            Pending {pendingCount}
            {pendingCount > 0 ? <span className="h-2 w-2 rounded-full bg-[#B42318]" /> : null}
          </span>
          <button
            type="button"
            onClick={() => void refreshReturnRequests()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search return requests"
              className="h-10 w-full rounded-xl border border-[#E1D4B8] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#C9A85B]"
            />
          </div>
          <div className="mt-3 inline-flex rounded-xl border border-[#E1D4B8] bg-white p-1">
            <button
              type="button"
              onClick={() => setReturnsView("active")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                returnsView === "active" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setReturnsView("archived")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                returnsView === "archived" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
              }`}
            >
              Archived
            </button>
            <button
              type="button"
              onClick={() => setReturnsView("all")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                returnsView === "all" ? "bg-[#B89443] text-white" : "text-[#7B6530] hover:bg-[#FFF4DF]"
              }`}
            >
              All
            </button>
          </div>

          {loadingList ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-[#E7DCC2] bg-white px-3 py-3 text-xs text-[#6B5A34]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading returns...
            </p>
          ) : filteredRequests.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[#D8C9A5] bg-white px-3 py-6 text-sm text-[#7D6A45]">
              No return requests yet.
            </p>
          ) : (
            <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {filteredRequests.map((request) => {
                const active = request.id === selectedReturnId;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => void selectReturnRequest(request.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E7DCC2] bg-white hover:border-[#D6BC82]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#2D2515]">#{request.order_number}</p>
                      <p className="mt-0.5 text-[11px] text-[#7D6A45]">{request.customer_name}</p>
                    </div>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClassName(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[#6A562D]">{request.reason_label}</p>
                    {request.archived_at ? (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7D6A45]">
                        Archived {formatDateTime(request.archived_at)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-[#7D6A45]">Return value {formatMoney(request.selected_items_value, "GBP")}</p>
                    <p className="mt-0.5 text-[11px] text-[#7D6A45]">Requested {formatDateTime(request.requested_at)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-[#E7DCC2] bg-[#FFFEFB] p-4">
          {loadingDetail ? (
            <p className="flex items-center gap-2 text-sm text-[#6B5A34]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading return details...
            </p>
          ) : !selectedReturn ? (
            <p className="rounded-xl border border-dashed border-[#D8C9A5] bg-white px-4 py-10 text-sm text-[#7D6A45]">
              Select a return request to review.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Return Request</p>
                  <h4 className="mt-1 text-lg font-bold text-[#2D2515]">#{selectedReturn.id} • Order #{selectedReturn.order_number}</h4>
                  <p className="mt-1 text-xs text-[#6B5A34]">Requested {formatDateTime(selectedReturn.requested_at)} by {selectedReturn.customer_name}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(selectedReturn.status)}`}>
                  {getStatusLabel(selectedReturn.status)}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-[#E7DCC2] bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Delivery date</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatDateOnly(selectedReturn.delivery_date)}</p>
                </div>
                <div className="rounded-xl border border-[#E7DCC2] bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">30-day deadline</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatDateOnly(selectedReturn.eligibility_expires_at)}</p>
                </div>
                <div className="rounded-xl border border-[#E7DCC2] bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Countdown</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D2515]">
                    {typeof selectedReturn.days_left === "number"
                      ? `${selectedReturn.days_left} day${selectedReturn.days_left === 1 ? "" : "s"} left`
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E7DCC2] bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Return value</p>
                  <p className="mt-1 text-sm font-semibold text-[#2D2515]">{formatMoney(selectedReturn.selected_items_value, "GBP")}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                {workflowSteps.map((workflow) => {
                  const isFinalCompleted = workflow.id === 4 && isFinalOutcomeStatus;
                  const isDone = workflow.id < step;
                  const isCurrent = workflow.id === step;
                  return (
                    <div
                      key={workflow.id}
                      className={`rounded-xl border px-3 py-2 ${
                        isFinalCompleted
                          ? "border-[#CDE3B2] bg-[#F2FAE8]"
                          : isCurrent
                          ? "border-[#D1B46F] bg-[#FFF3D6]"
                          : isDone
                            ? "border-[#CDE3B2] bg-[#F2FAE8]"
                            : "border-[#E7DCC2] bg-white"
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#2D2515]">Step {workflow.id}</p>
                      <p className="mt-1 text-[11px] text-[#6B5A34]">{workflow.title}</p>
                    </div>
                  );
                })}
              </div>

              {step === 1 ? (
                <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Step 1 • Review Request</p>
                  <p className="mt-2 text-sm font-semibold text-[#2D2515]">{selectedReturn.reason_label}</p>
                  {selectedReturn.reason_text ? <p className="mt-1 text-xs text-[#6B5A34]">{selectedReturn.reason_text}</p> : null}
                  {selectedReturn.additional_info_submitted_at ? (
                    <p className="mt-2 rounded-lg border border-[#CDE3B2] bg-[#F2FAE8] px-3 py-2 text-xs font-semibold text-[#4D6E2A]">
                      Customer added additional information on {formatDateTime(selectedReturn.additional_info_submitted_at)}.
                    </p>
                  ) : null}

                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Uploaded Proof</p>
                    {selectedReturn.proof_urls.length === 0 ? (
                      <p className="mt-2 text-xs text-[#7D6A45]">No proof images uploaded.</p>
                    ) : (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {selectedReturn.proof_urls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-lg border border-[#E4D4AE] bg-[#FFFEFB]"
                          >
                            <img src={url} alt="Return proof" className="h-28 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="Admin note (required for decline and message actions)..."
                    className="mt-3 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void approveReturn()}
                      disabled={saving || !canReviewActions}
                      className="rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      Approve Return
                    </button>
                    <button
                      type="button"
                      onClick={() => void declineReturn()}
                      disabled={saving || !canReviewActions}
                      className="rounded-lg border border-[#E7C09E] bg-[#FFF6EA] px-3 py-2 text-xs font-semibold text-[#8B4B1F] transition hover:bg-[#FFEFD9] disabled:opacity-60"
                    >
                      Decline Return
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction("request_more_info", "Requested more information from customer.")}
                      disabled={saving || !canReviewActions}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Request More Info
                    </button>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={goNextStep}
                      disabled={!canUseLabelStep}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Step 2 • Approve & Generate Label</p>
                  {!canUseLabelStep ? (
                    <p className="mt-2 text-xs text-[#8B4B1F]">Approve this return in Step 1 before creating a label.</p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-[#6B5A34]">Choose a service, then generate the customer return label.</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void loadShippingOptions()}
                          disabled={saving || shippingRatesLoading}
                          className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                        >
                          {shippingRatesLoading ? "Loading options..." : "Load Shipping Options"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void createLabel()}
                          disabled={saving || !canUseLabelStep}
                          className="rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                        >
                          Generate Label
                        </button>
                      </div>

                      {shippingRatesError ? (
                        <p className="mt-2 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
                          {shippingRatesError}
                        </p>
                      ) : null}

                      {shippingRates.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {shippingRates.map((rate) => {
                            const selected = selectedRateId === rate.object_id;
                            return (
                              <button
                                key={rate.object_id}
                                type="button"
                                onClick={() => setSelectedRateId(rate.object_id)}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                  selected ? "border-[#D1B46F] bg-[#FFF3D6]" : "border-[#E8DAB8] bg-[#FFFEFB] hover:bg-[#FFF8EA]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-[#2D2515]">{rate.service_name}</p>
                                    <p className="text-[11px] text-[#7D6A45]">
                                      {rate.estimated_days ? `${rate.estimated_days} day estimate` : "Estimate unavailable"}
                                    </p>
                                  </div>
                                  <p className="text-xs font-bold text-[#2D2515]">{formatMoney(rate.amount, String(rate.currency || "GBP"))}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {selectedReturn.shippo_label_url ? (
                        <div className="mt-3 rounded-lg border border-[#D8C9A5] bg-[#FFFEFB] px-3 py-2 text-xs text-[#6B5A34]">
                          <p className="font-semibold text-[#2D2515]">Label generated</p>
                          <p className="mt-1">Tracking: {selectedReturn.shippo_tracking_number || "N/A"}</p>
                          <a
                            href={selectedReturn.shippo_label_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 font-semibold text-[#8A6D2B] underline underline-offset-4"
                          >
                            Open return label
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : null}
                    </>
                  )}

                  <div className="mt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={goPrevStep}
                      className="rounded-lg border border-[#E1D4B8] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
                    >
                      Previous Step
                    </button>
                    <button
                      type="button"
                      onClick={goNextStep}
                      disabled={!selectedReturn.shippo_label_url && statusLower === "approved"}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Step 3 • Receive Parcel</p>
                  <p className="mt-2 text-xs text-[#6B5A34]">
                    Service selected: {selectedReturn.return_shipping_service || selectedRate?.service_name || "N/A"}
                    {selectedReturn.return_shipping_amount !== null && selectedReturn.return_shipping_amount !== undefined
                      ? ` · ${formatMoney(selectedReturn.return_shipping_amount, selectedReturn.return_shipping_currency || "GBP")}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#6B5A34]">Customer marked sent: {formatDateTime(selectedReturn.customer_shipped_at)}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                      placeholder="Customer return tracking number"
                      className="h-10 w-full max-w-[300px] rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                    />
                    <button
                      type="button"
                      onClick={() => void confirmArrival()}
                      disabled={saving || !canMarkReceived}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Confirm Item Arrived
                    </button>
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={goPrevStep}
                      className="rounded-lg border border-[#E1D4B8] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
                    >
                      Previous Step
                    </button>
                    <button
                      type="button"
                      onClick={goNextStep}
                      disabled={!canFinalise}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Step 4 • Final Action</p>
                  {isFinalOutcomeStatus ? (
                    <div className="mt-2 rounded-xl border border-[#CDE3B2] bg-[#F2FAE8] p-4">
                      <p className="text-sm font-semibold text-[#2D2515]">
                        {statusLower === "refunded" ? "Refund issued to user successfully." : "Refund request declined successfully."}
                      </p>
                      {statusLower === "refunded" ? (
                        <div className="mt-2 space-y-1 text-xs text-[#4D6E2A]">
                          <p>Payment amount: {formatMoney(selectedReturn.stripe_payment_amount, String(selectedReturn.stripe_refund_currency || "GBP"))}</p>
                          <p>Fees: - {formatMoney(selectedReturn.stripe_fee_amount, String(selectedReturn.stripe_refund_currency || "GBP"))}</p>
                          <p>Refunded amount: - {formatMoney(selectedReturn.refund_amount, String(selectedReturn.stripe_refund_currency || "GBP"))}</p>
                          <p>Net amount: {formatMoney(selectedReturn.stripe_net_amount, String(selectedReturn.stripe_refund_currency || "GBP"))}</p>
                          <p>Reference: {selectedReturn.stripe_refund_id || "N/A"}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[#4D6E2A]">
                          {selectedReturn.admin_note?.trim() || "No decline reason was saved."}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {statusLower === "refunded" && selectedReturn.stripe_refund_id ? (
                          <a
                            href={`/admin/orders/returns/${selectedReturn.id}/refund-statement`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-[#B7CF95] bg-white px-3 py-2 text-xs font-semibold text-[#4D6E2A] transition hover:bg-[#F6FBEF]"
                          >
                            Download Refund Statement
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void archiveReturn()}
                          disabled={saving}
                          className="rounded-lg border border-[#B7CF95] bg-white px-3 py-2 text-xs font-semibold text-[#4D6E2A] transition hover:bg-[#F6FBEF] disabled:opacity-60"
                        >
                          Archive Return
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-[#6B5A34]">Issue refund, message user, or decline refund with a reason.</p>

                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={4}
                        placeholder="Message / internal note..."
                        className="mt-3 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                      />

                      <input
                        value={refundAmount}
                        onChange={(event) => setRefundAmount(event.target.value)}
                        placeholder="Refund amount (£)"
                        className="mt-2 h-10 w-full max-w-[220px] rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void runAction("issue_refund", "Refund issued successfully.")}
                          disabled={saving || refundAmount.trim() === ""}
                          className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                        >
                          Issue Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction("reject", "Refund declined and user notified.")}
                          disabled={saving || note.trim() === ""}
                          className="rounded-lg border border-[#E7C09E] bg-[#FFF6EA] px-3 py-2 text-xs font-semibold text-[#8B4B1F] transition hover:bg-[#FFEFD9] disabled:opacity-60"
                        >
                          Decline Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction("message_user", "Customer message sent.")}
                          disabled={saving || note.trim() === ""}
                          className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                        >
                          Message User
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex justify-start">
                    <button
                      type="button"
                      onClick={goPrevStep}
                      className="rounded-lg border border-[#E1D4B8] px-3 py-2 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
                    >
                      Previous Step
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {notice ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#CDE3B2] bg-[#F2FAE8] px-3 py-2 text-xs font-semibold text-[#4D6E2A]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
