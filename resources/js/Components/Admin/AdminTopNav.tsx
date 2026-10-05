import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { ArrowLeft, BarChart3, LayoutDashboard, MessageSquare, Package, ReceiptText, Settings2, Users } from "lucide-react";

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
  {
    label: "Other",
    href: "/admin/other",
    icon: <Settings2 className="h-4 w-4" />,
    match: (path) => path.startsWith("/admin/other"),
  },
];

export default function AdminTopNav() {
  const page = usePage();
  const currentPath = page.url.split("?")[0];

  return (
    <div className="sticky top-0 z-20 overflow-x-hidden border-b border-[#E9DFCB] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl flex-nowrap items-center gap-3 px-3 sm:px-8 lg:relative lg:justify-center">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.history.back();
            }
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7DBC3] text-[#6B5A34] transition hover:bg-[#FFFBF2] lg:hidden"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Link
          href="/"
          className="hidden shrink-0 items-center lg:absolute lg:left-8 lg:inline-flex"
          aria-label="Go to home page"
        >
          <img loading="lazy" decoding="async" src="/images/BLText.png" alt="Bear Lane" className="h-10 w-auto object-contain" />
        </Link>

        <div className="flex-1 overflow-x-auto lg:flex-none">
          <div className="flex min-w-max flex-nowrap items-center gap-2 pr-1 lg:justify-center">
            {items.map((item) => {
              const active = item.match(currentPath);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                      : "border-transparent text-[#6B5A34] hover:border-[#E7DBC3] hover:bg-[#FFFBF2]"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
