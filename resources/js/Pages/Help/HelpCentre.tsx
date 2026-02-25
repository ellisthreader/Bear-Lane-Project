import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  Search,
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  HelpCircle,
} from "lucide-react";

// Centralized articles dataset
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

export default function HelpCentre() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  const filteredArticles = allArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
      <Head title="Help Centre" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto space-y-14 relative">
          {/* BACK BUTTON */}
          <div className="absolute -top-10 left-0">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back</span>
            </button>
          </div>

          {/* HEADER */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100">
              Help Centre
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Find answers to your questions, manage your orders, and learn more
              about using our platform.
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-300"
            />
          </div>

          {/* SEARCH RESULTS */}
          {searchTerm ? (
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Search results for "{searchTerm}"
              </h2>
              {filteredArticles.length > 0 ? (
                <ul className="space-y-4">
                  {filteredArticles.map((article) => (
                    <li key={article.link}>
                      <Link
                        href={article.link}
                        className="text-indigo-600 hover:underline text-lg font-medium"
                      >
                        {article.title}
                      </Link>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                        {article.content.substring(0, 120)}...
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  No articles found for "{searchTerm}".
                </p>
              )}
            </div>
          ) : (
            <>
              {/* MAIN HELP TOPICS GRID */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    title: "Orders & Shipping",
                    desc: "Track orders, view shipping info, or learn about delivery times.",
                    link: "/help/orders",
                  },
                  {
                    title: "Returns & Refunds",
                    desc: "How to return items, get refunds, or resolve issues.",
                    link: "/help/returns",
                  },
                  {
                    title: "Account Management",
                    desc: "Update your profile, change your password, or manage preferences.",
                    link: "/help/account",
                  },
                  {
                    title: "Payments & Billing",
                    desc: "Learn about payment methods, invoices, and billing issues.",
                    link: "/help/payments",
                  },
                  {
                    title: "Technical Support",
                    desc: "Troubleshoot technical problems or report bugs.",
                    link: "/help/technical",
                  },
                  {
                    title: "Privacy & Security",
                    desc: "Understand how we protect your data and privacy.",
                    link: "/help/privacy",
                  },
                ].map((topic) => (
                  <Link
                    key={topic.title}
                    href={topic.link}
                    className="block p-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {topic.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {topic.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* CONTACT SUPPORT */}
          <div className="mt-20 bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Still need help?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-lg">
              Our support team is available 7 days a week to assist you with
              orders, accounts, and general inquiries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-8">
              {/* Email Support */}
              <Link
                href="/support"
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Mail className="w-6 h-6 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Email Support
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Send us a message
                </span>
              </Link>

              {/* Live Chat */}
              <Link
                href="/help/livechat"
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <MessageSquare className="w-6 h-6 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Live Chat
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Chat with us instantly
                </span>
              </Link>

              {/* Call Us */}
              <a
                href="tel:+441234567890"
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Phone className="w-6 h-6 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Call Us
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  +44 1234 567890
                </span>
              </a>

              {/* FAQ */}
              <Link
                href="/faq"
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <HelpCircle className="w-6 h-6 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  FAQ
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Browse common questions
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
