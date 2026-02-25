import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function OrdersShipping() {
  const articles: Article[] = [
    {
      id: "delivery-info",
      title: "Delivery Information",
      content: (
        <>
          <p>
            Orders are typically processed within <strong>1–3 business days</strong>.
            Once shipped, you’ll receive a confirmation email with your tracking link.
          </p>
          <p className="mt-3">
            Delivery times vary based on location. Standard shipping takes
            <strong> 3–7 business days</strong> for domestic orders, and
            <strong> 7–14 business days</strong> for international destinations.
          </p>
        </>
      ),
    },
    {
      id: "track-order",
      title: "How do I track my order?",
      content: (
        <>
          <p>
            To track your order, go to your{" "}
            <Link href="/user-orders" className="text-indigo-600 hover:underline font-medium">
              Orders page
            </Link>
            . Each order includes a tracking number and courier link once it ships.
          </p>
          <p className="mt-3">
            You can also track directly from the shipping confirmation email we send.
          </p>
        </>
      ),
    },
    {
      id: "change-order",
      title: "I want to change my order/address",
      content: (
        <>
          <p>
            We can update your order or address <strong>before it ships</strong>.
            Please contact{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              customer support
            </Link>{" "}
            as soon as possible with your order number.
          </p>
          <p className="mt-3">
            Once an order has shipped, we’re unable to make changes to the delivery
            address or items.
          </p>
        </>
      ),
    },
    {
      id: "wrong-order",
      title: "I've received my order but it's wrong",
      content: (
        <>
          <p>
            We’re sorry to hear that! If your order arrived incomplete, damaged,
            or incorrect, please{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              contact support
            </Link>{" "}
            within <strong>7 days of delivery</strong>.
          </p>
          <p className="mt-3">
            Include your order number and a photo (if applicable) so we can resolve
            it quickly.
          </p>
        </>
      ),
    },
    {
      id: "customs",
      title: "Customs & Import Fees",
      content: (
        <>
          <p>
            International orders may be subject to customs duties, import taxes,
            or other fees imposed by your country’s regulations.
          </p>
          <p className="mt-3">
            These charges are the responsibility of the recipient and are not
            included in the product or shipping cost. We recommend checking your
            local customs office for more information.
          </p>
        </>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState(articles[0].id);
  const selected = articles.find((a) => a.id === selectedId)!;

  return (
    <AuthenticatedLayout>
      <Head title="Orders & Shipping" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Header */}
        <HelpHeader currentCategory="Orders & Shipping" />

        {/* Main Layout */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700 p-6 sticky top-28 self-start transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 border-b pb-2 border-gray-200 dark:border-gray-700">
              Articles
            </h2>

            <nav className="space-y-3">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedId(article.id)}
                  className={`block text-left w-full px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                    selected.id === article.id
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {article.title}
                </button>
              ))}
            </nav>

            <div className="mt-6">
              <Link
                href="/help"
                className="text-indigo-600 hover:underline text-sm font-medium"
              >
                ← Back to Help Centre
              </Link>
            </div>
          </aside>

          {/* Content */}
          <main className="w-full lg:w-[720px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700 p-10 transition-all duration-300">
            <div className="prose dark:prose-invert break-words max-w-none text-gray-700 dark:text-gray-300 leading-relaxed space-y-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                {selected.title}
              </h1>
              {selected.content}
            </div>
          </main>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
