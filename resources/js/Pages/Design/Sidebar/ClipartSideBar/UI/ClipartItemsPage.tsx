"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ClipartCategoryType } from "./types";

interface Props {
  category: ClipartCategoryType;
  onBack: () => void;
  onAddClipart: (src: string) => void;

  // 🔥 Sidebar controls
  setSidebarTitle?: (title: string | null) => void;
  setSidebarBackOverride?: (value: boolean) => void;
}

export default function ClipartItemsPage({
  category,
  onBack,
  onAddClipart,
  setSidebarTitle,
  setSidebarBackOverride,
}: Props) {
  // ✅ When page opens
  useEffect(() => {
    setSidebarTitle?.(`Clipart – ${category.name}`);
    setSidebarBackOverride?.(true);

    // ✅ Cleanup when page closes
    return () => {
      setSidebarTitle?.(null);
      setSidebarBackOverride?.(false);
    };
  }, [category.name, setSidebarTitle, setSidebarBackOverride]);

  return (
    <div className="space-y-4">
      {/* Header with back arrow */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition transform hover:scale-110"
        >
          <ArrowLeft size={24} />
        </button>

        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
        </span>
      </div>

      {/* Empty state */}
      {category.items.length === 0 && (
        <p className="text-sm text-red-600">
          ⚠️ No clipart items found for this category.
        </p>
      )}

      {/* Clipart grid */}
      <div className="grid grid-cols-4 gap-5">
        {category.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              // 🔥 Clear overrides before navigating away
              setSidebarTitle?.(null);
              setSidebarBackOverride?.(false);
              onAddClipart(item.src);
            }}
            className="
              group
              aspect-square
              flex
              items-center
              justify-center
              rounded-xl
              border
              border-gray-200
              bg-gray-50
              shadow-sm
              transition
              hover:shadow-md
              hover:border-gray-300
              focus:outline-none
              focus:ring-2
              focus:ring-[#C6A75E]
            "
          >
            <img
              src={item.src}
              alt={item.label}
              draggable={false}
              className="
                max-w-[75%]
                max-h-[75%]
                object-contain
                transition-transform
                duration-200
                group-hover:scale-105
              "
            />
          </button>
        ))}
      </div>
    </div>
  );
}
