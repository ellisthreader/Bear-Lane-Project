import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function TechnicalSupport() {
  const articles: Article[] = [
    {
      id: "troubleshooting",
      title: "Troubleshooting common issues",
      content: (
        <>
          <p>If something isn’t working properly, try the following steps:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Refresh the page or restart your browser/app.</li>
            <li>Clear your cache and cookies.</li>
            <li>Ensure your internet connection is stable.</li>
            <li>Try using a different browser or device.</li>
          </ul>
          <p className="mt-3">
            If the issue persists, please{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              contact technical support
            </Link>{" "}
            and include a detailed description or screenshot.
          </p>
        </>
      ),
    },
    {
      id: "site-errors",
      title: "I found a bug or error on the site",
      content: (
        <>
          <p>
            We appreciate your help in improving our platform! Please report
            bugs via our{" "}
            <Link href="/support" className="text-indigo-600 hover:underline font-medium">
              Support page
            </Link>{" "}
            and include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Steps to reproduce the issue</li>
            <li>Your browser and device</li>
            <li>Any error messages you saw</li>
          </ul>
        </>
      ),
    },
    {
      id: "app-issues",
      title: "App not loading or crashing",
      content: (
        <>
          <p>
            If the app isn’t loading, try reinstalling it or clearing local data.
            Make sure your app is updated to the latest version.
          </p>
          <p className="mt-3">
            You can also check our{" "}
            <Link href="/status" className="text-indigo-600 hover:underline font-medium">
              system status page
            </Link>{" "}
            to see if we’re experiencing downtime.
          </p>
        </>
      ),
    },
    {
      id: "notifications",
      title: "I’m not receiving notifications or emails",
      content: (
        <p>
          Please check your spam/junk folder and whitelist our domain in your
          email settings. If using a mobile device, ensure notifications are
          enabled for our app.
        </p>
      ),
    },
    {
      id: "feature-request",
      title: "Can I suggest a new feature?",
      content: (
        <p>
          We’d love to hear your ideas! Submit your suggestions through our{" "}
          <Link href="/support" className="text-indigo-600 hover:underline font-medium">
            feedback form
          </Link>{" "}
          or community forum. Our team regularly reviews user feedback to
          improve future updates.
        </p>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState(articles[0].id);
  const selectedArticle = articles.find((a) => a.id === selectedId)!;

  return (
    <AuthenticatedLayout>
      <Head title="Technical Support" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Help Header */}
        <HelpHeader currentCategory="Technical Support" />

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
