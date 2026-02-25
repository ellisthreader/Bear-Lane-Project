import type { ReactNode } from "react";
import AppLayout from "@/Layouts/AppLayout.js";
import { Head } from "@inertiajs/react";

export default function Home(): ReactNode {
  return (
    <AppLayout>
      <Head title="Home" />

      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">
          Welcome to My Portfolio
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Hi, I’m Ellis 👋 — a developer passionate about building modern web
          applications with Laravel and React.
        </p>

        <div className="flex justify-center gap-6">
          <a
            href="/projects"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Projects
          </a>
          <a
            href="/contact"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Contact Me
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
