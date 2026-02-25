import { ReactNode } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, usePage } from "@inertiajs/react";

export default function Projects(): ReactNode {
  const { props } = usePage();
  const user = props.auth?.user;

  const Layout = user ? AuthenticatedLayout : GuestLayout;

  return (
    <Layout>
      <Head title="Projects" />

      <section className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 bg-green-500">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          My Projects
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mb-8">
          Here are some of the projects I have built using <span className="font-semibold">Laravel</span> and <span className="font-semibold">React</span>.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <Link
            href="/projects/1"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Project lick my bum
          </Link>
          <Link
            href="/projects/2"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Project 2
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
          >
            Contact Me
          </Link>
        </div>
      </section>
    </Layout>
  );
}
