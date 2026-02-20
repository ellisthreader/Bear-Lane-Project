"use client";

import React from "react";

type Product = {
  id: number;
  name: string;
  image?: string; // optional thumbnail for the design
};

type MyDesignsSidebarProps = {
  closeSidebar: () => void;
  designs?: Product[]; // list of user designs
  isSignedIn: boolean;
  onSelectDesign?: (design: Product) => void;
};

export default function MyDesignsSidebar({
  closeSidebar,
  designs = [],
  isSignedIn,
  onSelectDesign,
}: MyDesignsSidebarProps) {
  return (
    <div className="flex flex-col h-full p-6 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          My Designs
        </h2>
        <button
          onClick={closeSidebar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          ✕
        </button>
      </div>

      {isSignedIn ? (
        <>
          {designs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-center text-lg">
              You have no saved designs.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {designs.map((design) => (
                <button
                  key={design.id}
                  onClick={() => onSelectDesign?.(design)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg transition duration-300 cursor-pointer group"
                >
                  {/* Optional thumbnail */}
                  {design.image ? (
                    <img
                      src={design.image}
                      alt={design.name}
                      className="w-full h-32 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3 flex items-center justify-center text-gray-400 dark:text-gray-300">
                      No Preview
                    </div>
                  )}

                  <span className="text-gray-800 dark:text-gray-100 font-medium text-center">
                    {design.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Sign in to access your saved designs
          </p>
        </div>
      )}
    </div>
  );
}