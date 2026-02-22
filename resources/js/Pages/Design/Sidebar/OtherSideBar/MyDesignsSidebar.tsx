"use client";

import React from "react";

type Product = {
  id: number;
  name: string;
  image?: string;
};

type UserType = {
  designs?: Product[];
};

type MyDesignsSidebarProps = {
  closeSidebar: () => void;
  user?: UserType | null;
  onSelectDesign?: (design: Product) => void;
};

export default function MyDesignsSidebar({
  closeSidebar: _closeSidebar,
  user,
  onSelectDesign,
}: MyDesignsSidebarProps) {
  const loginUrl = "http://localhost/login";

  // 🔹 Not signed in
  if (!user) {
    return (
      <div className="flex flex-col h-full p-6 bg-white">
        <div className="flex items-center justify-center h-full text-gray-400 text-center text-lg">
          <span>
            <a
              href={loginUrl}
              className="text-[#8A6D2B] hover:underline"
            >
              Sign in
            </a>{" "}
            to access your saved designs
          </span>
        </div>
      </div>
    );
  }

  const designs = user.designs ?? [];

  return (
    <div className="flex flex-col h-full p-6 bg-white">
      {/* No Designs */}
      {designs.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-center text-lg">
          You have no saved designs.
        </div>
      ) : (
        /* Designs Grid */
        <div className="grid grid-cols-2 gap-4">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => onSelectDesign?.(design)}
              className="flex flex-col items-center justify-center p-4 bg-[#FBF8F1] rounded-2xl shadow-sm hover:shadow-md border border-gray-200 transition duration-300 cursor-pointer group"
            >
              {design.image ? (
                <img
                  src={design.image}
                  alt={design.name}
                  className="w-full h-32 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-32 bg-gray-200 rounded-xl mb-3 flex items-center justify-center text-gray-400">
                  No Preview
                </div>
              )}

              <span className="text-gray-800 font-medium text-center">
                {design.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
