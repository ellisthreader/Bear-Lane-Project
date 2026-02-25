"use client";

import React from "react";

export default function SaleSidebar() {
  const links = [
    { key: "women-sale", name: "Women’s Sale" },
    { key: "men-sale", name: "Men’s Sale" },
    { key: "kids-sale", name: "Kids Sale" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase">Sale</h2>

      <div className="space-y-3">
        {links.map(l => (
          <div key={l.key} className="font-medium uppercase text-sm">
            {l.name}
          </div>
        ))}
      </div>

      <div className="opacity-70 text-xs italic">No subcategories available.</div>
    </div>
  );
}
