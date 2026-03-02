import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useAdminOrderReturns, type UpdateReturnAction } from "@/Context/AdminOrderReturnsContext";

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
  if (value.includes("receive")) return "Return received";
  if (value.includes("refund")) return "Refund issued";
  return "Pending";
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
  } = useAdminOrderReturns();

  const [search, setSearch] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setTrackingNumber(selectedReturn?.shippo_tracking_number || "");
    setNote(selectedReturn?.admin_note || "");
    setRefundAmount(selectedReturn?.refund_amount ? String(selectedReturn.refund_amount) : "");
    setActionModalOpen(false);
  }, [selectedReturn?.id, selectedReturn?.shippo_tracking_number, selectedReturn?.admin_note, selectedReturn?.refund_amount]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return returnRequests;

    return returnRequests.filter((request) => (
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
  }, [returnRequests, search]);

  const hasTrackingNumber = trackingNumber.trim() !== "";
  const isReceived = String(selectedReturn?.status || "") === "received";

  const confirmArrival = async () => {
    try {
      await updateReturnStatus("mark_received", note, undefined, trackingNumber);
      setNotice("Return marked as arrived. You can now take action.");
    } catch {
      // handled by context
    }
  };

  const runFinalAction = async (action: UpdateReturnAction) => {
    try {
      const parsedRefund = refundAmount.trim() !== "" && Number.isFinite(Number(refundAmount))
        ? Number(refundAmount)
        : undefined;

      await updateReturnStatus(action, note, parsedRefund, trackingNumber);
      setActionModalOpen(false);
      if (action === "issue_refund") {
        setNotice("Refund issued successfully.");
      } else if (action === "request_more_info") {
        setNotice("Requested more information from customer.");
      } else if (action === "reject") {
        setNotice("Return declined. Send product back to customer.");
      }
    } catch {
      // handled by context
    }
  };

  return (
    <section className="rounded-3xl border border-[#E6D8B8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D2B]">Returns Command Centre</p>
          <h3 className="mt-1 text-xl font-bold text-[#2D2515]">Returns & Refund Management</h3>
          <p className="mt-1 text-sm text-[#6B5A34]">Review evidence, verify return shipment, confirm arrival, then take action.</p>
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

              <div className="grid gap-2 sm:grid-cols-3">
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
              </div>

              <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Reason</p>
                <p className="mt-1 text-sm font-semibold text-[#2D2515]">{selectedReturn.reason_label}</p>
                {selectedReturn.reason_text ? <p className="mt-1 text-xs text-[#6B5A34]">{selectedReturn.reason_text}</p> : null}
              </div>

              <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
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

              <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Return Shipment Verification</p>
                <p className="mt-2 text-xs text-[#6B5A34]">
                  Customer should ship to Bear Lane, 390 Springfield Road, Chelmsford, CM2 6AT, GB.
                </p>
                <p className="mt-1 text-xs text-[#6B5A34]">
                  Service selected by customer: {selectedReturn.return_shipping_service || "N/A"}
                  {selectedReturn.return_shipping_amount !== null && selectedReturn.return_shipping_amount !== undefined
                    ? ` · ${formatMoney(selectedReturn.return_shipping_amount, selectedReturn.return_shipping_currency || "GBP")}`
                    : ""}
                </p>

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
                    disabled={saving || !hasTrackingNumber}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B89443] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Confirm Item Arrived
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#E7DCC2] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Take Action</p>
                <p className="mt-1 text-xs text-[#6B5A34]">
                  Actions are available once the return is marked as received.
                </p>
                <button
                  type="button"
                  onClick={() => setActionModalOpen(true)}
                  disabled={saving || !isReceived}
                  className="mt-2 inline-flex rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                >
                  Open Action Modal
                </button>
              </div>
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

      {actionModalOpen && selectedReturn ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#E8DAB8] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Return Actions</p>
                <h3 className="mt-1 text-lg font-bold text-[#2D2515]">Order #{selectedReturn.order_number}</h3>
                <p className="mt-1 text-xs text-[#6B5A34]">Choose how you want to proceed with this returned order.</p>
              </div>
              <button
                type="button"
                onClick={() => setActionModalOpen(false)}
                className="rounded-lg border border-[#E1D4B8] px-2 py-1 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF8EA]"
              >
                Close
              </button>
            </div>

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
                onClick={() => void runFinalAction("request_more_info")}
                disabled={saving}
                className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                Request More Info
              </button>
              <button
                type="button"
                onClick={() => void runFinalAction("issue_refund")}
                disabled={saving || refundAmount.trim() === ""}
                className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                Issue Refund
              </button>
              <button
                type="button"
                onClick={() => void runFinalAction("reject")}
                disabled={saving}
                className="rounded-lg border border-[#E7C09E] bg-[#FFF6EA] px-3 py-2 text-xs font-semibold text-[#8B4B1F] transition hover:bg-[#FFEFD9] disabled:opacity-60"
              >
                Decline & Send Back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
