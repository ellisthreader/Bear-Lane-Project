import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import HelpHeader from "../../Pages/Help/HelpHeader";

interface Article {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function AccountManagement() {
  const articles: Article[] = [
    {
      id: "create-account",
      title: "How do I create an account?",
      content: (
        <p>
          Creating an account is quick and free! Simply go to the{" "}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            registration page
          </Link>{" "}
          and enter your details to get started.
        </p>
      ),
    },
    {
      id: "reset-password",
      title: "How do I reset my password?",
      content: (
        <>
          <p>
            Click{" "}
            <Link href="/forgot-password" className="text-indigo-600 hover:underline font-medium">
              Forgot Password
            </Link>{" "}
            on the login page. You’ll receive an email with a reset link.
          </p>
          <p className="mt-3">
            If you don’t see the email, check your spam or junk folder.
          </p>
        </>
      ),
    },
    {
      id: "update-info",
      title: "How do I update my account information?",
      content: (
        <p>
          You can update your name, email, or password anytime from your{" "}
          <Link href="/profile" className="text-indigo-600 hover:underline font-medium">
            Account Settings
          </Link>{" "}
          page.
        </p>
      ),
    },
    {
      id: "delete-account",
      title: "Can I delete my account?",
      content: (
        <p>
          Yes, please reach out to{" "}
          <Link href="/support" className="text-indigo-600 hover:underline font-medium">
            customer support
          </Link>{" "}
          to request account deletion. This process is permanent and will remove all
          associated data.
        </p>
      ),
    },
    {
      id: "login-issues",
      title: "I can’t log in to my account",
      content: (
        <p>
          Make sure your email and password are correct. If you’re still unable to
          log in, try resetting your password or clearing your browser cache.
        </p>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState(articles[0].id);
  const selectedArticle = articles.find((a) => a.id === selectedId)!;

  return (
    <AuthenticatedLayout>
      <Head title="Account Management" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300 pt-24 pb-16 px-6">
        {/* Help Header */}
        <HelpHeader currentCategory="Account Management" />

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
