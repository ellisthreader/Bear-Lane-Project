import NavMenu from "@/Components/Menu/NavMenu";
import SiteFooter from "@/Components/Footer/SiteFooter";
import { usePage } from "@inertiajs/react";
import type { ReactNode } from "react";

type AuthenticatedLayoutProps = {
  children: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
};

export default function AuthenticatedLayout({
  children,
  containerClassName = "min-h-screen w-full flex flex-col bg-gray-50",
  contentClassName = "flex-1 overflow-y-hidden w-full flex items-center justify-center",
}: AuthenticatedLayoutProps) {
  const page = usePage();
  const path = page.url.split("?")[0];
  const isAdminRoute = path.startsWith("/admin");
  const isCheckoutRoute = path.startsWith("/checkout");
  const showFooter = !isAdminRoute && !isCheckoutRoute;

  return (
    <div className={containerClassName}>
      {!isAdminRoute ? <NavMenu /> : null}

      <main className={contentClassName}>
        <div className="w-full">{children}</div>
      </main>

      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}
