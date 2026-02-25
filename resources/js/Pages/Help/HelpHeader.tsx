import React, { useState } from "react";
import { Link, router } from "@inertiajs/react";
import { Search } from "lucide-react";

interface HelpHeaderProps {
  currentCategory?: string;
}

export default function HelpHeader({ currentCategory }: HelpHeaderProps) {
  const categories = [
    { name: "Orders & Shipping", link: "/help/orders" },
    { name: "Returns & Refunds", link: "/help/returns" },
    { name: "Account Management", link: "/help/account" },
    { name: "Payments & Billing", link: "/help/payments" },
    { name: "Technical Support", link: "/help/technical" },
    { name: "Privacy & Security", link: "/help/privacy" },
  ];

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() === "") return;
    router.get("/help/search", { q: searchTerm });
  };

  return (
    <div className="text-center mb-14">
      {/* Header */}
      <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
        Help Centre
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
        Find answers quickly — choose a category or search for what you need.
      </p>

      {/* Search + Category Row */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        {/* Category Selector */}
        <div className="flex flex-col items-start w-full md:w-auto">
          <label className="text-gray-700 dark:text-gray-300 font-medium mb-2 ml-1">
            Category
          </label>
          <select
            className="w-72 md:w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm hover:shadow-md transition-all duration-200"
            value={currentCategory || ""}
            onChange={(e) => {
              const selected = categories.find(
                (cat) => cat.name === e.target.value
              );
              if (selected) window.location.href = selected.link;
            }}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Box */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col items-start w-full md:w-auto"
        >
          <label className="text-gray-700 dark:text-gray-300 font-medium mb-2 ml-1">
            Search Help Articles
          </label>
          <div className="relative w-80 md:w-96">
            <input
              type="text"
              placeholder="Type keywords (e.g. refund, order tracking)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm hover:shadow-md transition-all duration-200"
            />
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          </div>
        </form>
      </div>
    </div>
  );
}
