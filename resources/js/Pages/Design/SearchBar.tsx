"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

interface Category {
  id: number | string;
  name: string;
  slug: string;
  section: string;
  subsection?: string;
  age_group?: string | null;
  label: string; // ✅ NEW unified label from backend
  products?: any[];
}

const RECENT_SEARCHES_KEY = "recentCategorySearches";
const MAX_RECENT = 5;

export default function SearchBar({
  onSelectCategory,
  allAdultCategories = [],
  allKidsCategories = {},
}: {
  onSelectCategory: (category: Category) => void;
  allAdultCategories?: Category[];
  allKidsCategories?: Record<string, Category[]>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Category[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      if (query === "") {
        setResults(recentSearches);
        setShowDropdown(recentSearches.length > 0);
        return;
      }

      const url = `/search-categories?q=${encodeURIComponent(query)}`;

      try {
        const res = await fetch(url);
        const data: Category[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setResults([]);
        setShowDropdown(false);
      }
    };

    fetchCategories();
  }, [query, recentSearches]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (ev: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target as Node) &&
        ev.target !== inputRef.current
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleSelect = (category: Category) => {
    onSelectCategory(category);
    setQuery("");
    setShowDropdown(false);

    const updatedRecent = [
      category,
      ...recentSearches.filter((c) => c.id !== category.id),
    ].slice(0, MAX_RECENT);

    setRecentSearches(updatedRecent);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
  };

  const handleDeleteRecent = (ev: React.MouseEvent, id: number | string) => {
    ev.stopPropagation();
    const updatedRecent = recentSearches.filter((c) => c.id !== id);
    setRecentSearches(updatedRecent);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
    setShowDropdown(updatedRecent.length > 0);
  };

  return (
    <div className="relative w-[360px]">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search categories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                  focus:outline-none focus:ring-2 focus:ring-[#C6A75E]
                  dark:bg-gray-800 dark:text-white"
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-[360px] max-h-72 overflow-auto
                     bg-white dark:bg-gray-800 border border-gray-200
                     dark:border-gray-700 rounded-xl shadow-lg z-30"
        >
          {/* Recent Searches Header */}
          {query === "" && recentSearches.length > 0 && (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm font-semibold border-b border-gray-200 dark:border-gray-700">
              Recent Searches
            </div>
          )}

          {results.length === 0 && (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400">
              No results found.
            </div>
          )}

          {results.map((cat) => {
            const isRecent =
              query === "" && recentSearches.some((r) => r.id === cat.id);

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-[#FBF8F1] dark:hover:bg-gray-700 transition rounded-md"
              >
                <button
                  onClick={() => handleSelect(cat)}
                  className="flex-1 text-left flex flex-col gap-1"
                >
                  {/* Name */}
                  <div className="font-semibold text-gray-900 dark:text-white text-base">
                    {cat.name}
                  </div>

                  {/* Category label (age_group / section / subsection / name) */}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {cat.label}
                  </div>
                </button>

                {/* Trash icon for recent items */}
                {isRecent && (
                  <button
                    onClick={(ev) => handleDeleteRecent(ev, cat.id)}
                    className="ml-3 text-gray-400 hover:text-red-500 transition"
                    title="Remove from recent searches"
                  >
                    <FiTrash2 size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
