import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "./HelpHeader";

// Centralized articles dataset (same as before)
const allArticles = [
  {
    title: "Delivery Information",
    content: "Orders are typically processed within 1–3 business days...",
    link: "/help/orders#delivery-info",
  },
  {
    title: "How do I track my order?",
    content: "To track your order, go to your Orders page...",
    link: "/help/orders#track-order",
  },
  {
    title: "Return Policy",
    content: "We accept returns within 30 days of delivery...",
    link: "/help/returns#return-policy",
  },
  {
    title: "Refund Processing Time",
    content: "Once we receive and inspect your returned item...",
    link: "/help/returns#refund-processing",
  },
  {
    title: "How do I create an account?",
    content: "Creating an account is quick and free...",
    link: "/help/account#create-account",
  },
  {
    title: "Troubleshooting common issues",
    content: "If something isn’t working properly, try the following steps...",
    link: "/help/technical#troubleshooting",
  },
  // Add all other articles here...
];

export default function HelpSearchResults() {
  const { q } = usePage().props as { q: string }; // get query from Inertia

  const searchTerm = (q || "").toLowerCase();

  const results = allArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm) ||
      article.content.toLowerCase().includes(searchTerm)
  );

  return (
    <AuthenticatedLayout>
      <Head title={`Search results for "${q}"`} />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-24 pb-16 px-6">
        <HelpHeader currentCategory="" />

        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Search Results for "{q}"
          </h1>

          {results.length > 0 ? (
            <ul className="space-y-4">
              {results.map((res) => (
                <li key={res.link}>
                  <Link
                    href={res.link}
                    className="text-indigo-600 hover:underline text-lg font-medium"
                  >
                    {res.title}
                  </Link>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {res.content.substring(0, 120)}...
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              No articles found for "{q}".
            </p>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
