import type { ReactNode } from "react";
import { Link } from "@inertiajs/react";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">My Portfolio</h1>
          <nav className="space-x-6">
            <Link href="/" className="text-gray-700 hover:text-black">Home</Link>
            <Link href="/projects" className="text-gray-700 hover:text-black">Projects</Link>
            <Link href="/about" className="text-gray-700 hover:text-black">About</Link>
            <Link href="/contact" className="text-gray-700 hover:text-black">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-600">
        © {new Date().getFullYear()} My Portfolio. All rights reserved.
      </footer>
    </div>
  );
}
