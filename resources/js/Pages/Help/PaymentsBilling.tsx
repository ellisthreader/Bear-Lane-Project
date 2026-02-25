import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function PaymentsBilling() {
  const articles: Article[] = [
    {
      id: "payment-methods",
      title: "What payment methods do you accept?",
      content: (
        <p>
          We accept major credit and debit cards, PayPal, and Apple Pay. All
          transactions are processed securely using SSL encryption.
        </p>
      ),
    },
    {
      id: "invoice",
      title: "How do I get an invoice?",
      content: (
        <p>
          Once your order is placed, you’ll receive a confirmation email with
          your invoice attached. You can also download it anytime from your{" "}
          <Link href="/user-orders" className="text-indigo-600 hover:underline font-medium">
            Orders page
          </Link>.
        </p>
      ),
    },
    {
      id: "payment-failed",
      title: "My payment failed — what should I do?",
      content: (
        <p>
          Double-check that your payment details are correct and your card has
          sufficient funds. You can also try another payment method or contact
          your bank for more details.
        </p>
      ),
    },
    {
      id: "refund-time",
      title: "How long do refunds take?",
      content: (
        <p>
          Refunds typically take <strong>3–5 business days</strong> to appear on
          your original payment method, depending on your bank or provider.
        </p>
      ),
    },
    {
      id: "billing-issues",
      title: "I have a billing issue — who can I contact?",
      content: (
        <p>
          Please reach out to{" "}
          <Link href="/support" className="text-indigo-600 hover:underline font-medium">
            customer support
          </Link>{" "}
          with your order number, and we’ll review the issue as soon as possible.
        </p>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState(articles[0].id);
  const selectedArticle = articles.find((a) => a.id === selectedId)!;

  return (
    <AuthenticatedLayout>
      <Head title="Payments & Billing" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Help Header */}
        <HelpHeader currentCategory="Payments & Billing" />

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
                    selectedArticle.id === article.id
                      ? "bg-indigo-600 text-white shadow-lg scale-[1.02]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.01]"
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
                {selectedArticle.title}
              </h1>
              {selectedArticle.content}
            </div>
          </main>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
