import React from "react";
import { usePage, Link, Head } from "@inertiajs/react";
import { Check, CircleHelp, ExternalLink, FileText, MessageCircle, Receipt, Truck } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { designTypeLabel, normalizeDesignType } from "@/Utils/designType";

type OrderItem = {
  id: number;
  product_name?: string;
  quantity?: number;
  size?: string | null;
  colour?: string | null;
  design_type?: "printing" | "embroidery" | string | null;
  unit_price?: number;
  line_total?: number;
  image_url?: string | null;
};

type Order = {
  id: number;
  order_number: string;
  created_at?: string;
  status?: string;
  shippo_tracking_number?: string | null;
  tracking_url?: string | null;
  items?: OrderItem[];
  subtotal?: number;
  discount_amount?: number;
  vat?: number;
  shipping?: number;
  total?: number;
  payment_method?: string | null;
  invoice_url?: string | null;
  invoice_path?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string | null;
  city?: string;
  postcode?: string;
  country?: string;
  shipping_rate?: string | null;
  shipping_method?: string | null;
  delivery_type?: string | null;
  selected_delivery_date?: string | null;
  calculated_ship_date?: string | null;
  billing_first_name?: string;
  billing_last_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string | null;
  billing_city?: string;
  billing_postcode?: string;
  billing_country?: string;
};

const valueOrFallback = (value?: string | null, fallback = "Not provided") =>
  value && value.trim().length > 0 ? value : fallback;

const formatDate = (date?: string) => {
  if (!date) return "Unknown date";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const estimateDelivery = (order: Order) => {
  const explicitDate = order.selected_delivery_date || order.calculated_ship_date;
  const deliveryType = (order.delivery_type || "").toUpperCase();
  if (deliveryType === "TIMED" && explicitDate) {
    return formatDate(explicitDate);
  }

  const base = order.created_at ? new Date(order.created_at) : new Date();
  if (Number.isNaN(base.getTime())) return "TBC";

  const type = (order.delivery_type || order.shipping_method || "").toLowerCase();
  const daysToAdd = type.includes("next") ? 1 : type.includes("express") ? 2 : 4;
  base.setDate(base.getDate() + daysToAdd);

  return base.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getTrackingStage = (status?: string) => {
  const s = (status ?? "").toLowerCase().trim();
  if (["delivered"].some((v) => s.includes(v))) return 3;
  if (["out for delivery", "outfordelivery", "dispatched", "shipped"].some((v) => s.includes(v))) return 2;
  if (["in_production", "in production", "processing", "packed"].some((v) => s.includes(v))) return 1;
  return 0;
};

export default function OrderDetails() {
  const { order, auth } = usePage<{ order: Order; auth?: { user?: { is_admin?: boolean } } }>().props;
  const isAdminViewer = Boolean(auth?.user?.is_admin);

  if (!order) {
    return <p className="mt-10 text-center text-gray-700">Order not found</p>;
  }

  const invoiceHref = order.invoice_url || (order.invoice_path ? `/storage/${order.invoice_path}` : null);
  const trackingRef = order.shippo_tracking_number;
  const trackingStage = getTrackingStage(order.status);
  const trackingSteps = ["Order placed", "Preparing", "Dispatched", "Delivered"];

  return (
    <AuthenticatedLayout>
      <Head title={`Order Receipt #${order.order_number}`} />

      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] to-[#FFF8EA] px-4 pb-12 pt-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex justify-start">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A38A58]">
              <Link href="/profile" className="hover:text-[#8A6D2B] hover:underline">
                Account
              </Link>{" "}
              &gt; {order.order_number}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6D5AA] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A8252]">Order Receipt</p>
                <h1 className="mt-1 text-2xl font-bold text-[#2C2415]">Order #{order.order_number}</h1>
                <p className="mt-1 text-sm text-[#7C6A47]">Date placed: {formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdminViewer ? (
                  <Link
                    href="/admin/dashboard"
                    className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                  >
                    Back to Admin Panel
                  </Link>
                ) : (
                  <Link
                    href="/profile"
                    className="rounded-lg border border-[#E3D3A8] bg-[#FFFCF3] px-3 py-2 text-sm font-semibold text-[#6D5A33] transition hover:bg-[#FFF5DE]"
                  >
                    Back to profile
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#8A6D2B]" />
              <h2 className="text-lg font-semibold text-[#2D2415]">Tracking Information</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-[#DAC89A] bg-[#FFF8E9] px-3 py-1 font-semibold text-[#725C2E]">
                Tracking: {trackingRef || "Tracking pending"}
              </span>
              {order.tracking_url ? (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-[#DAC89A] bg-white px-3 py-1 font-semibold text-[#725C2E] hover:bg-[#FFFAEF]"
                >
                  {trackingRef || "Open tracking"} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1 sm:gap-2">
              {trackingSteps.map((step, stepIndex) => {
                const isComplete = stepIndex <= trackingStage;
                const isCurrent = stepIndex === trackingStage;
                return (
                  <div key={step} className="relative flex flex-col items-center text-center">
                    <div
                      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isComplete ? "border-[#C6A75E] bg-[#C6A75E]" : "border-[#D8C79C] bg-white"
                      }`}
                    >
                      {isComplete && <Check className="h-4 w-4 text-white" />}
                      {isCurrent && <span className="absolute -inset-1 rounded-full border border-[#C6A75E]/40" />}
                    </div>
                    <p className={`mt-2 text-[11px] font-semibold leading-tight ${isCurrent ? "text-[#6F5A2D]" : "text-[#8A7B5A]"}`}>{step}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-[#2D2415]">Product Card{order.items?.length === 1 ? "" : "s"}</h2>
            <div className="space-y-3">
              {order.items?.length ? (
                order.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#EADDBB] bg-[#FFFCF5] p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image_url || "/images/placeholder.jpg"}
                        alt={item.product_name || "Product"}
                        className="h-16 w-16 rounded-lg border border-[#E4D4AE] bg-white object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/images/placeholder.jpg";
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#312713]">{item.product_name || "Product"}</p>
                        <p className="mt-1 text-xs text-[#7F704F]">
                          Size: {valueOrFallback(item.size, "N/A")} · Quantity: {Number(item.quantity || 0)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#7F704F]">Colour: {valueOrFallback(item.colour, "N/A")}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[#6A541F]">
                          Design type: {designTypeLabel(normalizeDesignType(item.design_type))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#6E5A2E]">£{Number(item.line_total || 0).toFixed(2)}</p>
                        <p className="mt-0.5 text-xs text-[#8A7B5A]">£{Number(item.unit_price || 0).toFixed(2)} each</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#E9DCBB] bg-[#FFFCF7] px-3 py-2 text-sm text-[#8A7B5A]">
                  No items found in this order.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#8A6D2B]" />
              <h2 className="text-lg font-semibold text-[#2D2415]">Price Card</h2>
            </div>
            <div className="space-y-2 text-sm text-[#6E5F41]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>£{Number(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-£{Number(order.discount_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT</span>
                <span>£{Number(order.vat || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>£{Number(order.shipping || 0).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#EFE2C4] pt-2 text-base font-bold text-[#2D2516]">
                <span>Total</span>
                <span>£{Number(order.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2D2415]">Shipping Address</h3>
              <p className="mt-2 text-sm leading-6 text-[#6E5F41]">
                {valueOrFallback(`${order.first_name || ""} ${order.last_name || ""}`.trim())}
                <br />
                {valueOrFallback(order.address_line1)}
                {order.address_line2 ? (
                  <>
                    <br />
                    {order.address_line2}
                  </>
                ) : null}
                <br />
                {valueOrFallback(order.city)}, {valueOrFallback(order.postcode)}
                <br />
                {valueOrFallback(order.country)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2D2415]">Billing Address</h3>
              <p className="mt-2 text-sm leading-6 text-[#6E5F41]">
                {valueOrFallback(
                  `${order.billing_first_name || order.first_name || ""} ${order.billing_last_name || order.last_name || ""}`.trim(),
                )}
                <br />
                {valueOrFallback(order.billing_address_line1 || order.address_line1)}
                {(order.billing_address_line2 || order.address_line2) ? (
                  <>
                    <br />
                    {order.billing_address_line2 || order.address_line2}
                  </>
                ) : null}
                <br />
                {valueOrFallback(order.billing_city || order.city)}, {valueOrFallback(order.billing_postcode || order.postcode)}
                <br />
                {valueOrFallback(order.billing_country || order.country)}
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2D2415]">Shipping Method</h3>
              <div className="mt-2 space-y-1 text-sm text-[#6E5F41]">
                <p>
                  Method: <span className="font-medium text-[#2D2415]">{valueOrFallback(order.delivery_type, "Standard")}</span>
                </p>
                <p>
                  Service: <span className="font-medium text-[#2D2415]">{valueOrFallback(order.shipping_rate || order.shipping_method, "Courier Service")}</span>
                </p>
                <p>
                  Estimated delivery: <span className="font-medium text-[#2D2415]">{estimateDelivery(order)}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2D2415]">Contact Information</h3>
              <p className="mt-2 text-sm text-[#6E5F41]">{valueOrFallback(order.email)}</p>
              <p className="mt-1 text-sm text-[#6E5F41]">{valueOrFallback(order.phone)}</p>
            </div>

            <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2D2415]">Payment Method</h3>
              <p className="mt-2 text-sm text-[#6E5F41]">{valueOrFallback(order.payment_method, "Card")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#2D2415]">Invoice</h3>
                <p className="mt-1 text-sm text-[#7E704F]">Download your invoice for records or accounting.</p>
              </div>
              {invoiceHref ? (
                <a
                  href={invoiceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A6D2B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#755A22]"
                >
                  <FileText className="h-4 w-4" />
                  Get Invoice
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BCA77B] px-4 py-2.5 text-sm font-semibold text-white/90"
                >
                  <FileText className="h-4 w-4" />
                  Invoice unavailable
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5D4A9] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CircleHelp className="h-4 w-4 text-[#8A6D2B]" />
              <h3 className="text-base font-semibold text-[#2D2415]">Need Help?</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E3D3A8] bg-[#FFFCF3] px-3 py-2 text-sm font-semibold text-[#6D5A33] transition hover:bg-[#FFF5DE]"
              >
                <CircleHelp className="h-4 w-4" />
                Help Centre
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E3D3A8] bg-[#FFFCF3] px-3 py-2 text-sm font-semibold text-[#6D5A33] transition hover:bg-[#FFF5DE]"
              >
                <MessageCircle className="h-4 w-4" />
                Live Chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
