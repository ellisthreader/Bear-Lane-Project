import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminOrderUser = {
  id: number;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar: string | null;
};

type LayerAsset = {
  uid: string;
  type: string;
  url: string;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  rotation?: number;
};

type AdminOrderItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  size: string | null;
  colour: string | null;
  design_type?: "printing" | "embroidery" | string | null;
  parcel_size_key?: "very_small" | "small" | "medium" | "large" | null;
  parcel_size_label?: string | null;
  parcel_size_instructions?: string | null;
  product_length?: number | null;
  product_width?: number | null;
  product_height?: number | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_images: string[];
  preview_snapshot?: Record<string, unknown> | null;
  preview_by_view?: Record<string, Record<string, unknown> | undefined>;
  layer_assets?: LayerAsset[];
  design_payload?: Record<string, unknown> | null;
};

type AdminOrderSummary = {
  id: number;
  order_number: string;
  status: string | null;
  total: number;
  created_at: string | null;
  customer_name: string;
  customer_email: string | null;
  user: AdminOrderUser | null;
  items_count: number;
  shippo_label_url: string | null;
  shippo_tracking_number: string | null;
  tracking_url?: string | null;
  is_new: boolean;
  archived_at?: string | null;
};

type AdminOrderDetail = AdminOrderSummary & {
  subtotal: number;
  discount_amount: number;
  vat: number;
  shipping: number;
  payment_intent_id: string | null;
  delivery_type: string | null;
  delivery_price: number | null;
  shipping_rate: string | null;
  gift_packaging: boolean;
  gift_packaging_cost: number;
  gift_message: string | null;
  selected_delivery_date: string | null;
  calculated_ship_date: string | null;
  shippo_selected_service: string | null;
  shippo_selected_rate_id: string | null;
  invoice_url: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  items: AdminOrderItem[];
};

type StatusOption = {
  value: string;
  label: string;
};

type AdminOrdersContextValue = {
  loadingOrders: boolean;
  loadingOrderDetail: boolean;
  saving: boolean;
  orders: AdminOrderSummary[];
  selectedOrderId: number | null;
  selectedOrder: AdminOrderDetail | null;
  statusOptions: StatusOption[];
  newOrdersCount: number;
  error: string | null;
  refreshOrders: () => Promise<void>;
  selectOrder: (orderId: number) => Promise<void>;
  updateStatus: (status: string, trackingNumber?: string) => Promise<void>;
  sendMessage: (message: string, subject?: string) => Promise<{ sent_to_inbox: boolean; sent_email: boolean }>;
  generateLabel: () => Promise<void>;
  archiveOrder: () => Promise<void>;
};

const AdminOrdersContext = createContext<AdminOrdersContextValue | null>(null);

const getCookieValue = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
  || getCookieValue("XSRF-TOKEN")
  || "";

export function AdminOrdersProvider({ children }: { children: ReactNode }) {
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    setLoadingOrderDetail(true);
    setError(null);
    try {
      const response = await fetch(`/admin/orders/${orderId}/data`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Unable to load order details (${response.status}).`);
      }
      const payload = await response.json();
      setSelectedOrder(payload.order || null);
    } catch (fetchError) {
      setSelectedOrder(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load order details.");
    } finally {
      setLoadingOrderDetail(false);
    }
  }, []);

  const selectOrder = useCallback(async (orderId: number) => {
    setSelectedOrderId(orderId);
    await fetchOrderDetail(orderId);
  }, [fetchOrderDetail]);

  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true);
    setError(null);
    try {
      const response = await fetch("/admin/orders/data", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Unable to load orders (${response.status}).`);
      }

      const payload = await response.json();
      const nextOrders = (payload.orders || []) as AdminOrderSummary[];
      setOrders(nextOrders);
      setStatusOptions((payload.status_options || []) as StatusOption[]);
      setNewOrdersCount(Number(payload.new_orders_count || 0));

      const preferredId =
        nextOrders.some((order) => order.id === selectedOrderId)
          ? selectedOrderId
          : nextOrders[0]?.id ?? null;

      setSelectedOrderId(preferredId);
      if (preferredId) {
        await fetchOrderDetail(preferredId);
      } else {
        setSelectedOrder(null);
      }
    } catch (fetchError) {
      setOrders([]);
      setSelectedOrder(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  }, [fetchOrderDetail, selectedOrderId]);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const updateStatus = useCallback(async (status: string, trackingNumber?: string) => {
    if (!selectedOrderId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/admin/orders/${selectedOrderId}/status`, {
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
          status,
          tracking_number: trackingNumber?.trim() || undefined,
        }),
      });
      if (!response.ok) {
        if (response.status === 419) {
          throw new Error("Your admin session expired. Refresh the page and try again.");
        }
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Unable to update status.");
      }
      const payload = await response.json();
      const updatedOrder = payload.order as AdminOrderDetail;
      setSelectedOrder(updatedOrder);
      setOrders((prev) => {
        const next = prev.map((order) =>
          order.id === updatedOrder.id
              ? {
                  ...order,
                  status: updatedOrder.status,
                  shippo_tracking_number: updatedOrder.shippo_tracking_number,
                  tracking_url: updatedOrder.tracking_url,
                  shippo_label_url: updatedOrder.shippo_label_url,
                  is_new: updatedOrder.is_new,
                }
              : order
        );
        setNewOrdersCount(next.filter((order) => order.is_new).length);
        return next;
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update status.");
      throw updateError;
    } finally {
      setSaving(false);
    }
  }, [selectedOrderId]);

  const sendMessage = useCallback(async (message: string, subject?: string) => {
    if (!selectedOrderId) {
      throw new Error("No order selected.");
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/admin/orders/${selectedOrderId}/message`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-XSRF-TOKEN": getCookieValue("XSRF-TOKEN"),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ message, subject }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 419) {
          throw new Error("Your admin session expired. Refresh the page and try again.");
        }
        throw new Error(payload?.message || "Unable to send message.");
      }

      return {
        sent_to_inbox: Boolean(payload?.sent_to_inbox),
        sent_email: Boolean(payload?.sent_email),
      };
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
      throw sendError;
    } finally {
      setSaving(false);
    }
  }, [selectedOrderId]);

  const generateLabel = useCallback(async () => {
    if (!selectedOrderId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/admin/orders/${selectedOrderId}/label`, {
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
        throw new Error(payload?.message || "Unable to generate label.");
      }

      const updatedOrder = payload.order as AdminOrderDetail;
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === updatedOrder.id
              ? {
                  ...order,
                  shippo_label_url: updatedOrder.shippo_label_url,
                  shippo_tracking_number: updatedOrder.shippo_tracking_number,
                  tracking_url: updatedOrder.tracking_url,
                }
              : order
          )
        );
      }
    } catch (labelError) {
      setError(labelError instanceof Error ? labelError.message : "Unable to generate label.");
      throw labelError;
    } finally {
      setSaving(false);
    }
  }, [selectedOrderId]);

  const archiveOrder = useCallback(async () => {
    if (!selectedOrderId) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/admin/orders/${selectedOrderId}/archive`, {
        method: "PATCH",
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
        throw new Error(payload?.message || "Unable to archive order.");
      }

      await refreshOrders();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive order.");
      throw archiveError;
    } finally {
      setSaving(false);
    }
  }, [refreshOrders, selectedOrderId]);

  const value = useMemo<AdminOrdersContextValue>(() => ({
    loadingOrders,
    loadingOrderDetail,
    saving,
    orders,
    selectedOrderId,
    selectedOrder,
    statusOptions,
    newOrdersCount,
    error,
    refreshOrders,
    selectOrder,
    updateStatus,
    sendMessage,
    generateLabel,
    archiveOrder,
  }), [
    loadingOrders,
    loadingOrderDetail,
    saving,
    orders,
    selectedOrderId,
    selectedOrder,
    statusOptions,
    newOrdersCount,
    error,
    refreshOrders,
    selectOrder,
    updateStatus,
    sendMessage,
    generateLabel,
    archiveOrder,
  ]);

  return <AdminOrdersContext.Provider value={value}>{children}</AdminOrdersContext.Provider>;
}

export function useAdminOrders() {
  const context = useContext(AdminOrdersContext);
  if (!context) {
    throw new Error("useAdminOrders must be used within AdminOrdersProvider");
  }
  return context;
}

export type {
  AdminOrderSummary,
  AdminOrderDetail,
  AdminOrderItem,
  StatusOption,
};
