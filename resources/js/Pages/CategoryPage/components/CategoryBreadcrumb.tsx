import React from "react";
import { Link } from "@inertiajs/react";
import { BreadcrumbItem } from "../types";

type Props = {
  title: string;
  items: BreadcrumbItem[];
};

export default function CategoryBreadcrumb({ title, items }: Props) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#8A7B5D]">
        <Link href="/" className="hover:text-[#3D3324]">
          Home
        </Link>
        {items.map((item) => (
          <React.Fragment key={item.href}>
            <span>{">"}</span>
            {item.isLast ? (
              <span className="font-semibold text-[#3D3324]">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-[#3D3324]">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-[#1F170C] md:text-4xl">{title}</h1>
    </div>
  );
}
