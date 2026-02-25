import { ReactNode } from "react";
import NavMenu from "@/Components/Menu/NavMenu";
import CartSidebar from "@/Components/Cart/CartSidebar";

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Header */}
      <header className="w-full shadow bg-white dark:bg-gray-800 transition-colors duration-300">
        <NavMenu />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Cart Sidebar */}
      <CartSidebar />
      
    </div>
  );
}
