import React from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";

import HeroSection from "./HeroSection";
import Courses from "./Courses";
import Products from "./Products";
import SuccessStories from "./Testimonials";
import TrustSignals from "./TrustSignals";

type User = {
  id: number;
  name: string;
  email: string;
};

type PageProps = {
  auth: {
    user?: User;
  };
};

export default function HomePage() {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const Layout = user ? AuthenticatedLayout : GuestLayout;

  const bgGradient = "bg-gradient-to-b from-pink-400/10 to-blue-200/10";

  return (
    <Layout>
      <Head title="Home" />

      <main className={`overflow-x-hidden ${bgGradient}`}>
        {/* Hero Section */}
        <HeroSection />

        {/* Courses */}
        <Courses />

        {/* Products */}
        <Products />

        {/* Success Stories */}
        <SuccessStories />

        {/* Trust Signals */}
        <TrustSignals />
      </main>
    </Layout>
  );
}
