import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Mail, Send, ArrowLeft } from "lucide-react";

export default function Support() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Message sent successfully! (Demo only)");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/help"; // fallback if opened directly
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Send a Message" />

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 pt-24 pb-10 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Back Button */}
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Support Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 space-y-8 transition-colors duration-300">
            
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Contact Support
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Have a question, issue, or feedback? Fill out the form below, and our
                support team will get back to you as soon as possible.
              </p>
            </div>

            {/* Contact Card */}
            <div className="flex items-center space-x-3 p-4 bg-indigo-100 dark:bg-indigo-950 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Mail className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
              <div>
                <p className="text-gray-900 dark:text-gray-200 font-semibold">
                  Email us directly:
                </p>
                <a
                  href="mailto:support@example.com"
                  className="text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 font-medium transition-colors"
                >
                  support@example.com
                </a>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Your Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Your Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="I need help with my order"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Describe your issue or question..."
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-colors duration-200"
              >
                <Send className="w-5 h-5" />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
