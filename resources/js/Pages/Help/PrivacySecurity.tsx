import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function PrivacySecurity() {
  const articles: Article[] = [
    {
      id: "privacy-policy",
      title: "Privacy Policy Overview",
      content: (
        <p>
          Your privacy is important to us. We collect and use data in
          accordance with our{" "}
          <Link href="/privacy-policy" className="text-indigo-600 hover:underline font-medium">
            Privacy Policy
          </Link>
          , which explains how we handle your personal information.
        </p>
      ),
    },
    {
      id: "data-collection",
      title: "What data do you collect?",
      content: (
        <>
          <p>
            We collect limited personal data necessary for account management,
            order processing, and support. This includes your name, email, and
            payment information where applicable.
          </p>
          <p className="mt-3">
            We never sell your data to third parties. All information is stored
            securely in compliance with data protection laws.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "How is my data protected?",
      content: (
        <>
          <p>
            We use industry-standard encryption (SSL/TLS) and advanced security
            protocols to protect your information both in transit and at rest.
          </p>
          <p className="mt-3">
            Access to your data is restricted to authorized personnel only.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Do you use cookies?",
      content: (
        <p>
          Yes, we use cookies to improve your browsing experience, analyze site
          traffic, and remember your preferences. You can manage or disable
          cookies in your browser settings.
        </p>
      ),
    },
    {
      id: "delete-data",
      title: "How can I delete my data?",
      content: (
        <p>
          You can request deletion of your account and data by contacting{" "}
          <Link href="/support" className="text-indigo-600 hover:underline font-medium">
            customer support
          </Link>
          . Once processed, your data will be permanently removed from our
          servers.
        </p>
      ),
    },
  ];

  const [selected, setSelected] = useState<Article>(articles[0]);

  return (
    <AuthenticatedLayout>
      <Head title="Privacy & Security" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Help Header */}
        <HelpHeader currentCategory="Privacy & Security" />

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
                  onClick={() => setSelected(article)}
                  className={`block text-left w-full px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                    selected.id === article.id
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
