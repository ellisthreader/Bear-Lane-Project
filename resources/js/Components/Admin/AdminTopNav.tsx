import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { BarChart3, LayoutDashboard, MessageSquare, Package, ReceiptText, Users } from "lucide-react";

type AdminNavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const items: AdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    match: (path) => path === "/admin/dashboard",
  },
  {
    label: "Statistics",
    href: "/admin/statistics",
    icon: <BarChart3 className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/statistics"),
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: <Package className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/products"),
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: <ReceiptText className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/orders"),
  },
  {
    label: "Support",
    href: "/admin/support",
    icon: <MessageSquare className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/support") || path.startsWith("/admin/livechats"),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/users"),
  },
];

export default function AdminTopNav() {
  const page = usePage();
  const currentPath = page.url.split("?")[0];

  return (
    <div className="sticky top-0 z-20 border-b border-[#E9DFCB] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center px-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="Go to home page"
        >
          <img src="/images/BLText.png" alt="Bear Lane" className="h-10 w-auto object-contain" />
        </Link>

        <div className="flex flex-1 items-center justify-center gap-2">
          {items.map((item) => {
            const active = item.match(currentPath);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                    : "border-transparent text-[#6B5A34] hover:border-[#E7DBC3] hover:bg-[#FFFBF2]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="h-10 w-[140px]" aria-hidden="true" />
      </div>
    </div>
  );
}
