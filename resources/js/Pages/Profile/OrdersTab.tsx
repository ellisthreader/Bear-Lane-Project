// resources/js/Pages/Profile/OrdersTab.tsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface OrderTotals {
  subtotal?: number;
  discount?: number;
  vat?: number;
  shipping?: number;
  total?: number;
}

interface Order {
  id: number;
  order_number: string;
  status?: string;
  items?: OrderItem[];
  totals?: OrderTotals;
  created_at: string;
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const contentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await axios.get("/user-orders");
        console.log("Fetched orders:", response.data);

        if (response.data.success && Array.isArray(response.data.orders)) {
          setOrders(response.data.orders);
        } else {
          console.warn("Unexpected orders response:", response.data);
          setOrders([]);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusElement = (status?: string) => {
    const s = (status ?? "").toLowerCase().trim();

    if (["paid", "purchased", "ordered", "processing"].some((v) => s.includes(v)))
      return <span className="text-blue-500 font-medium">Processing</span>;

    if (["dispatched", "shipped"].some((v) => s.includes(v)))
      return <span className="text-indigo-500 font-medium">Dispatched</span>;

    if (["out for delivery", "outfordelivery"].some((v) => s.includes(v)))
      return <span className="text-orange-500 font-medium">Out for Delivery</span>;

    if (["delivered"].some((v) => s.includes(v)))
      return <span className="text-green-500 font-medium">Delivered</span>;

    return <span className="text-red-500 font-medium">Unknown Status</span>;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Unknown date";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading)
    return <p className="text-gray-600 dark:text-gray-400">Loading your orders...</p>;
  if (!orders.length)
    return <p className="text-gray-600 dark:text-gray-400">You have no orders yet.</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Your Orders
      </h3>

      {orders.map((order) => {
        if (!order) return null;

        const isExpanded = expandedOrderIds.includes(order.id);
        const contentHeight = contentRefs.current[order.id]?.scrollHeight || 0;
        const totals = order.totals || {};

        return (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md transition hover:shadow-lg"
          >
            {/* Header */}
            <button
              onClick={() => toggleExpand(order.id)}
              className="w-full flex justify-between items-center p-4 focus:outline-none"
            >
              <div>
                <span className="text-gray-800 dark:text-gray-200 font-semibold">
                  Order #{order.order_number}
                </span>
              </div>
              <div>{getStatusElement(order.status)}</div>
            </button>

            {/* Animated Expandable Content */}
            <div
              ref={(el) => (contentRefs.current[order.id] = el)}
              style={{
                height: isExpanded ? contentHeight : 0,
                transition: "height 0.3s ease",
              }}
              className="overflow-hidden px-4"
            >
              <div className="pt-2 pb-4 space-y-3">
                {/* Order Date */}
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Placed on: {formatDate(order.created_at)}
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  {order.items?.length ? (
                    order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg"
                      >
                        <span className="text-gray-700 dark:text-gray-200">
                          {item.product_name} x {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          £{Number(item.line_total || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      No items in this order.
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-1">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Subtotal:</span>
                    <span>£{Number(totals.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Discount:</span>
                    <span>£{Number(totals.discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>VAT:</span>
                    <span>£{Number(totals.vat || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Shipping:</span>
                    <span>£{Number(totals.shipping || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 text-lg mt-1">
                    <span>Total:</span>
                    <span>£{Number(totals.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Manage Order Button */}
                <div className="pt-3">
                  <Link
                    href={`/orders/${order.order_number}`}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition inline-block text-center"
                  >
                    Manage Order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
