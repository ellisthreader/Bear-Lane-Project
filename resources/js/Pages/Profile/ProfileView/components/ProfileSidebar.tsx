import React from "react";
import axios from "axios";
import { router, usePage } from "@inertiajs/react";
import { ChevronDown, Shield } from "lucide-react";
import { useProfileViewContext } from "../ProfileViewContext";

type SidebarOrder = {
  id: number;
  order_number: string;
};

type UserOrdersResponse = {
  success?: boolean;
  orders?: Array<{
    id: number | string;
    order_number?: string | null;
  }>;
};

export default function ProfileSidebar() {
  const page = usePage<{ auth?: { user?: { is_admin?: boolean } } }>();
  const isAdmin = Boolean(page.props.auth?.user?.is_admin);
  const { activeTab, setActiveTab, handleLogout, openEditModal, savedDesigns } = useProfileViewContext();
  const showProfileMenu = activeTab === "profile";
  const showDesignsMenu = activeTab === "designs";
  const showOrdersMenu = activeTab === "orders";
  const [orders, setOrders] = React.useState<SidebarOrder[]>([]);

  const openProfileQuickLink = (path: string) => {
    router.get(path);
  };

  React.useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await axios.get<UserOrdersResponse>("/user-orders");
        if (response.data.success && Array.isArray(response.data.orders)) {
          const mappedOrders = response.data.orders
            .map((order) => ({
              id: Number(order.id),
              order_number: String(order.order_number || ""),
            }))
            .filter((order) => order.order_number);
          setOrders(mappedOrders);
        } else {
          setOrders([]);
        }
      } catch {
        setOrders([]);
      }
    }

    fetchOrders();
  }, []);

  return (
    <aside className="h-fit w-full rounded-3xl border border-[#E2D2A8] bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:w-72">
      <div className="flex flex-col">
        {isAdmin && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => router.get("/admin/dashboard")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7BE84] text-[#7B6530] transition hover:bg-[#FFF8E6]"
              aria-label="Open admin dashboard"
              title="Admin Dashboard"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="mb-2 overflow-hidden rounded-2xl border border-[#E9D9B6] bg-[#FFFEFA]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
            }}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "profile" ? "bg-[#C6A75E] text-white" : "text-[#6D5A2F] hover:bg-[#FFF8E6]"
            }`}
          >
            <span>Profile</span>
            <ChevronDown className={`h-4 w-4 transition ${showProfileMenu ? "rotate-180" : ""}`} />
          </button>

          {showProfileMenu && (
            <div className="space-y-1 bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EE] p-2">
              <button
                type="button"
                onClick={openEditModal}
                className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs font-semibold tracking-wide text-[#6D5A2F] transition hover:border-[#E4D3A8] hover:bg-white"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => openProfileQuickLink("/profile/address-book")}
                className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs font-semibold tracking-wide text-[#6D5A2F] transition hover:border-[#E4D3A8] hover:bg-white"
              >
                Address Book
              </button>
              <button
                type="button"
                onClick={() => openProfileQuickLink("/profile/payment-methods")}
                className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs font-semibold tracking-wide text-[#6D5A2F] transition hover:border-[#E4D3A8] hover:bg-white"
              >
                Payment Details
              </button>
            </div>
          )}
        </div>
        <div className="mb-2 overflow-hidden rounded-2xl border border-[#E9D9B6] bg-[#FFFEFA]">
          <button
            type="button"
            onClick={() => setActiveTab("designs")}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "designs" ? "bg-[#C6A75E] text-white" : "text-[#6D5A2F] hover:bg-[#FFF8E6]"
            }`}
          >
            <span>My Designs</span>
            <ChevronDown className={`h-4 w-4 transition ${showDesignsMenu ? "rotate-180" : ""}`} />
          </button>

          {showDesignsMenu && (
            <div className="max-h-64 space-y-1 overflow-y-auto bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EE] p-2">
              {savedDesigns.length === 0 ? (
                <p className="px-3 py-2 text-xs font-semibold tracking-wide text-[#9A8A63]">No saved designs yet</p>
              ) : (
                savedDesigns.map((design) => (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => {
                      if (!design.product_slug) {
                        setActiveTab("designs");
                        return;
                      }
                      router.get(`/design/${encodeURIComponent(design.product_slug)}`, { savedDesign: design.id });
                    }}
                    className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs font-semibold tracking-wide text-[#6D5A2F] transition hover:border-[#E4D3A8] hover:bg-white"
                    title={design.name}
                  >
                    {design.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="mb-2 overflow-hidden rounded-2xl border border-[#E9D9B6] bg-[#FFFEFA]">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "orders" ? "bg-[#C6A75E] text-white" : "text-[#6D5A2F] hover:bg-[#FFF8E6]"
            }`}
          >
            <span>Order History</span>
            <ChevronDown className={`h-4 w-4 transition ${showOrdersMenu ? "rotate-180" : ""}`} />
          </button>

          {showOrdersMenu && (
            <div className="max-h-64 space-y-1 overflow-y-auto bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EE] p-2">
              {orders.length === 0 ? (
                <p className="px-3 py-2 text-xs font-semibold tracking-wide text-[#9A8A63]">No orders yet</p>
              ) : (
                orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => router.get(`/orders/${encodeURIComponent(order.order_number)}`)}
                    className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-xs font-semibold tracking-wide text-[#6D5A2F] transition hover:border-[#E4D3A8] hover:bg-white"
                  >
                    #{order.order_number}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded-2xl border border-[#D7BE84] px-4 py-3 text-left text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E6]"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
