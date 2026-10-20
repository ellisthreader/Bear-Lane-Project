import { ReactNode } from "react";
import { usePage } from "@inertiajs/react";
import NavMenu from "@/Components/Menu/NavMenu";
import SiteFooter from "@/Components/Footer/SiteFooter";

export default function GuestLayout({ children }: { children: ReactNode }) {
  const page = usePage();
  const path = page.url.split("?")[0];
  const isCheckoutRoute = path.startsWith("/checkout");

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 transition-colors duration-300">
      <header className="w-full shadow bg-white transition-colors duration-300">
        <NavMenu />
      </header>

      <main className="flex-1 w-full relative">{children}</main>

      {!isCheckoutRoute ? <SiteFooter /> : null}
    </div>
  );
}
