import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function ReturnsRefunds() {
  const articles: Article[] = [
    {
      id: "return-policy",
      title: "Return Policy",
      content: (
        <>
          <p>
            We accept returns within <strong>30 days of delivery</strong> for most
            items, provided they are unused, in original packaging, and in resalable
            condition.
          </p>
          <p className="mt-3">
            To initiate a return, please contact{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              our support team
            </Link>{" "}
            with your order number and reason for return.
          </p>
        </>
      ),
    },
    {
      id: "refund-processing",
      title: "Refund Processing Time",
      content: (
        <>
          <p>
            Once we receive and inspect your returned item, your refund will be
            processed within <strong>5–7 business days</strong>.
          </p>
          <p className="mt-3">
            Refunds are issued to your original payment method. Depending on your
            bank or provider, it may take additional time to appear on your statement.
          </p>
        </>
      ),
    },
    {
      id: "nonreturnable",
      title: "Non-Returnable Items",
      content: (
        <>
          <p>
            Certain products such as <strong>gift cards, personalized items, and
            final sale goods</strong> are non-returnable.
          </p>
          <p className="mt-3">
            Please check the product description before purchasing for any return
            restrictions.
          </p>
        </>
      ),
    },
    {
      id: "exchange-item",
      title: "Can I exchange an item?",
      content: (
        <>
          <p>
            Yes! We offer exchanges for items of equal or lesser value. Simply
            contact{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              support
            </Link>{" "}
            within 30 days to arrange an exchange.
          </p>
        </>
      ),
    },
    {
      id: "refund-status",
      title: "How do I check my refund status?",
      content: (
        <>
          <p>
            You can check your refund status by visiting your{" "}
            <Link href="/user-orders" className="text-indigo-600 hover:underline font-medium">
              Orders page
            </Link>{" "}
            or by contacting our support team with your order number.
          </p>
        </>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState(articles[0].id);
  const selectedArticle = articles.find((a) => a.id === selectedId)!;

  return (
    <AuthenticatedLayout>
      <Head title="Returns & Refunds" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Header */}
        <HelpHeader currentCategory="Returns & Refunds" />

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
