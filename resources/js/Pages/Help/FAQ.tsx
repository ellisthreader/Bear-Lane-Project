import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I track my order?",
    answer:
      "You can track your order by visiting your account’s 'Orders' page. Once shipped, you’ll find a tracking number and carrier link under each order.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We accept returns within 30 days of delivery for most items. Items must be unused and in original packaging. Start your return through the Returns page.",
  },
  {
    question: "How long do refunds take?",
    answer:
      "Refunds are typically processed within 5–7 business days after we receive your returned item. You’ll be notified once your refund is issued.",
  },
  {
    question: "Can I change or cancel my order?",
    answer:
      "Orders can only be changed or canceled before they are shipped. Please contact our support team as soon as possible if you need to make changes.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Click 'Forgot Password' on the login page and follow the instructions. You’ll receive an email with a secure link to reset your password.",
  },
  {
    question: "Is my personal data secure?",
    answer:
      "Yes, we take your privacy seriously. All personal data is encrypted and handled according to GDPR and industry-standard security practices.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/help"; // fallback
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="FAQ" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* 🔙 Back Button */}
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* HEADER */}
          <div className="text-center space-y-5">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              We’re here to help. Browse common questions for quick answers.
            </p>
          </div>

          {/* FAQ ACCORDION */}
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${
                    isOpen ? "ring-2 ring-indigo-400/40" : ""
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex justify-between items-center text-left px-6 py-5 focus:outline-none"
                  >
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="text-indigo-500 w-5 h-5" />
                    ) : (
                      <ChevronDown className="text-gray-400 w-5 h-5" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pt-4 pb-8 text-gray-700 dark:text-gray-300 text-base leading-relaxed border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
