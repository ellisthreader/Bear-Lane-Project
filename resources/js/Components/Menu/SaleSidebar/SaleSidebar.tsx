"use client";

import React from "react";

type Props = {
  variant?: "desktop" | "mobile";
};

export default function SaleSidebar({ variant = "desktop" }: Props) {
  const links = [
    { key: "women-sale", name: "Women’s Sale" },
    { key: "men-sale", name: "Men’s Sale" },
    { key: "kids-sale", name: "Kids Sale" },
  ];

  const headingClass =
    variant === "mobile" ? "text-base font-semibold uppercase tracking-wide text-[#2B2417]" : "text-xl font-bold uppercase";
  const itemClass =
    variant === "mobile"
      ? "rounded-lg px-3 py-2 text-sm font-semibold text-[#4B3C21] transition-colors hover:bg-[#FFF6DF]"
      : "font-medium uppercase text-sm";
  const noteClass = variant === "mobile" ? "text-xs text-[#7A6B4A]" : "opacity-70 text-xs italic";

  return (
    <div className={variant === "mobile" ? "space-y-2" : "space-y-6"}>
      <h2 className={headingClass}>Sale</h2>

      <div className={variant === "mobile" ? "space-y-1" : "space-y-3"}>
        {links.map(l => (
          <div key={l.key} className={itemClass}>{l.name}</div>
        ))}
      </div>

      <div className={noteClass}>No subcategories available.</div>
    </div>
  );
}
