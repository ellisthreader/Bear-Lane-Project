import NavMenu from "@/Components/Menu/NavMenu";
import CartSidebar from "@/Components/Cart/CartSidebar"; // ✅ default export

export default function AuthenticatedLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      {/* Header */}
      <NavMenu />

      {/* Content */}
      <main className="flex-1 overflow-y-hidden w-full flex items-center justify-center">
        <div className="w-full">{children}</div>
      </main>

      {/* Cart Sidebar */}
      <CartSidebar />
    </div>
  );
}
