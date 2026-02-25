import React from "react";
import { usePage, Link, Head } from "@inertiajs/react";
import { FileText, Truck, HelpCircle } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function OrderDetails() {
  const { order } = usePage<{ order: any }>().props;
  console.log(order);

  if (!order)
    return (
      <p className="text-center mt-10 text-gray-700 dark:text-gray-300">
        Order not found
      </p>
    );

  const darkMode =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <AuthenticatedLayout>
      <Head title={`Order #${order.order_number}`} />

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 space-y-6 transition-colors duration-300">
          
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Order #{order.order_number}
            </h2>
            <Link
              href="/profile/edit?tab=orders"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors duration-200"
            >
              ← Back
            </Link>
          </div>

          {/* ORDER ITEMS */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Order Items
            </h3>

            <div className="space-y-2">
              {order.items?.length > 0 ? (
                order.items.map((item: any) => {
                  const imagePath = item.image_url || "/images/placeholder.jpg";

                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={imagePath}
                          alt={item.product_name || "Product"}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "/images/placeholder.jpg";
                          }}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-gray-800 dark:text-gray-100 font-medium">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        £{Number(item.line_total ?? 0).toFixed(2)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No items in this order.
                </p>
              )}
            </div>

            {/* ✅ Track Order Button */}
            {order.tracking_url ? (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                <Truck className="w-4 h-4" />
                Track Order
              </a>
            ) : (
              <button
                disabled
                className="w-full mt-3 bg-gray-400 text-white py-2.5 rounded-lg font-medium cursor-not-allowed text-sm"
              >
                Tracking Not Available
              </button>
            )}
          </section>

          {/* ORDER SUMMARY */}
          <section className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Order Summary
            </h3>
            <div className="text-gray-600 dark:text-gray-300 space-y-1 text-sm">
              <p>
                Order Date:{" "}
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>Discounts: £{Number(order.discount_amount ?? 0).toFixed(2)}</p>
              <p>Delivery: £{Number(order.shipping ?? 0).toFixed(2)}</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Total: £{Number(order.total ?? 0).toFixed(2)}
              </p>
            </div>
          </section>

          {/* DELIVERY ADDRESS */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Delivery Address
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {order.first_name} {order.last_name}
              <br />
              {order.address_line1}
              {order.address_line2 && (
                <>
                  <br />
                  {order.address_line2}
                </>
              )}
              <br />
              {order.city}, {order.postcode}
              <br />
              {order.country}
            </p>
          </section>

          {/* PAYMENT + INVOICE SECTION */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Payment & Invoice
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {order.payment_method ?? "Debit/Credit Card"}
            </p>

            {/* 🧾 Compact Polished Invoice Button */}
            {order.invoice_url || order.invoice_path ? (
              <a
                href={order.invoice_url || `/storage/${order.invoice_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 text-sm ${
                  darkMode
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <FileText className="w-4 h-4" />
                View Invoice (PDF)
              </a>
            ) : (
              <button
                disabled
                className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-4 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed w-full"
              >
                Invoice Unavailable
              </button>
            )}
          </section>

          {/* HELP */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" /> Need Help?
            </h3>
            <div className="flex flex-col space-y-1 text-sm">
              <Link
                href="/help"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
              >
                Help Centre
              </Link>
              <Link
                href="/support"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
              >
                Send a Message
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
