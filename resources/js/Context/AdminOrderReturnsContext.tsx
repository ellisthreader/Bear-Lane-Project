import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ReturnOrderSummary = {
  id: number;
  order_number: string;
  status: string | null;
  created_at: string | null;
  total: number;
  shipping: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
};

type ReturnSelectedItem = {
  id: number;
  product_name: string;
  size: string | null;
  colour: string | null;
  quantity: number;
  line_total: number;
  image_url: string | null;
};

type ReturnHistoryEntry = {
  id: number;
  status: string;
  requested_at: string | null;
  reason_label: string;
};

type AdminReturnRequestSummary = {
  id: number;
  order_id: number;
  order_number: string;
  status: string;
  requested_at: string | null;
  customer_name: string;
  customer_email: string | null;
  reason_code: string;
  reason_label: string;
  reason_category: string;
  delivery_date: string | null;
  eligibility_expires_at: string | null;
  days_left: number | null;
  is_within_window: boolean;
  admin_override: boolean;
  selected_items_count: number;
  return_shipping_service?: string | null;
  return_shipping_amount?: number | null;
  return_shipping_currency?: string | null;
};

type AdminReturnRequestDetail = AdminReturnRequestSummary & {
  reason_text: string | null;
  admin_note: string | null;
  proof_urls: string[];
  selected_items: ReturnSelectedItem[];
  refund_amount: number | null;
  shippo_label_url: string | null;
  shippo_tracking_number: string | null;
  order: ReturnOrderSummary | null;
  history: ReturnHistoryEntry[];
};

type UpdateReturnAction = "approve" | "reject" | "request_more_info" | "issue_refund" | "mark_received" | "override";

type AdminOrderReturnsContextValue = {
  loadingList: boolean;
  loadingDetail: boolean;
  saving: boolean;
  returnRequests: AdminReturnRequestSummary[];
  selectedReturnId: number | null;
  selectedReturn: AdminReturnRequestDetail | null;
  pendingCount: number;
  error: string | null;
  refreshReturnRequests: () => Promise<void>;
  selectReturnRequest: (returnRequestId: number) => Promise<void>;
  updateReturnStatus: (action: UpdateReturnAction, note?: string, refundAmount?: number, returnTrackingNumber?: string) => Promise<void>;
  generateReturnLabel: () => Promise<void>;
};

const AdminOrderReturnsContext = createContext<AdminOrderReturnsContextValue | null>(null);

const getCookieValue = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
  || getCookieValue("XSRF-TOKEN")
  || "";

export function AdminOrderReturnsProvider({ children }: { children: ReactNode }) {
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnRequests, setReturnRequests] = useState<AdminReturnRequestSummary[]>([]);
  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<AdminReturnRequestDetail | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchReturnDetail = useCallback(async (returnRequestId: number) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/admin/orders/returns/${returnRequestId}/data`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Unable to load return details (${response.status}).`);
      }

      const payload = await response.json();
      setSelectedReturn(payload.return_request || null);
    } catch (fetchError) {
      setSelectedReturn(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load return details.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const refreshReturnRequests = useCallback(async () => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await fetch("/admin/orders/returns/data", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Unable to load returns (${response.status}).`);
      }

      const payload = await response.json();
      const nextReturns = (payload.return_requests || []) as AdminReturnRequestSummary[];
      const nextPendingCount = Number(payload.pending_count || 0);

      setReturnRequests(nextReturns);
      setPendingCount(nextPendingCount);

      const nextSelectedId = nextReturns.some((entry) => entry.id === selectedReturnId)
        ? selectedReturnId
        : nextReturns[0]?.id ?? null;

      setSelectedReturnId(nextSelectedId);
      if (nextSelectedId) {
        await fetchReturnDetail(nextSelectedId);
      } else {
        setSelectedReturn(null);
      }
    } catch (fetchError) {
      setReturnRequests([]);
      setPendingCount(0);
      setSelectedReturn(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load returns.");
    } finally {
      setLoadingList(false);
    }
  }, [fetchReturnDetail, selectedReturnId]);

  useEffect(() => {
    void refreshReturnRequests();
  }, [refreshReturnRequests]);

  const selectReturnRequest = useCallback(async (returnRequestId: number) => {
    setSelectedReturnId(returnRequestId);
    await fetchReturnDetail(returnRequestId);
  }, [fetchReturnDetail]);

  const updateReturnStatus = useCallback(async (action: UpdateReturnAction, note?: string, refundAmount?: number, returnTrackingNumber?: string) => {
    if (!selectedReturnId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/admin/orders/returns/${selectedReturnId}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-XSRF-TOKEN": getCookieValue("XSRF-TOKEN"),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action,
          note: note?.trim() || undefined,
          refund_amount: typeof refundAmount === "number" ? refundAmount : undefined,
          return_tracking_number: returnTrackingNumber?.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 419) {
          throw new Error("Your admin session expired. Refresh the page and try again.");
        }
        throw new Error(payload?.message || "Unable to update return request.");
      }

      const updated = payload.return_request as AdminReturnRequestDetail;
      setSelectedReturn(updated);
      setReturnRequests((prev) => {
        const next = prev.map((entry) => (
          entry.id === updated.id
            ? {
                ...entry,
                status: updated.status,
                admin_override: updated.admin_override,
                is_within_window: updated.is_within_window,
                days_left: updated.days_left,
                reason_label: updated.reason_label,
                selected_items_count: updated.selected_items_count,
              }
            : entry
        ));
        setPendingCount(next.filter((entry) => String(entry.status) === "pending").length);
        return next;
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update return request.");
      throw updateError;
    } finally {
      setSaving(false);
    }
  }, [selectedReturnId]);

  const generateReturnLabel = useCallback(async () => {
    if (!selectedReturnId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/admin/orders/returns/${selectedReturnId}/label`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-XSRF-TOKEN": getCookieValue("XSRF-TOKEN"),
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 419) {
          throw new Error("Your admin session expired. Refresh the page and try again.");
        }
        throw new Error(payload?.message || "Unable to generate return label.");
      }

      const updated = payload.return_request as AdminReturnRequestDetail;
      setSelectedReturn(updated);
      setReturnRequests((prev) => prev.map((entry) => (
        entry.id === updated.id
          ? { ...entry, status: updated.status }
          : entry
      )));
    } catch (labelError) {
      setError(labelError instanceof Error ? labelError.message : "Unable to generate return label.");
      throw labelError;
    } finally {
      setSaving(false);
    }
  }, [selectedReturnId]);

  const value = useMemo<AdminOrderReturnsContextValue>(() => ({
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
  }), [
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
  ]);

  return <AdminOrderReturnsContext.Provider value={value}>{children}</AdminOrderReturnsContext.Provider>;
}

export function useAdminOrderReturns() {
  const context = useContext(AdminOrderReturnsContext);
  if (!context) {
    throw new Error("useAdminOrderReturns must be used within AdminOrderReturnsProvider");
  }
  return context;
}

export type {
  AdminReturnRequestSummary,
  AdminReturnRequestDetail,
  UpdateReturnAction,
};
