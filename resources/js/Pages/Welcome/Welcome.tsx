import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";

import HeroSection from "./HeroSection";
import IdeaToIconicSection from "./IdeaToIconicSection";
import CategorySection from "./CategorySection";
import StackedScrollCards from "./StackedScrollCards";
import ProductCard from "../Product/ProductCard";
import { CheckCircle2, ShieldCheck, SlidersHorizontal, Star, Truck } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  type: string;
  brand: string;
  price: number;
  original_price?: number | null;
  images: string[];
};

type PageProps = {
  auth: {
    user?: User;
  };
  products: Product[];
};

const customerReviews = [
  {
    name: "Mia Thompson",
    role: "Founder, Northline Fitness",
    quote:
      "The finish quality exceeded expectations. Every piece looked premium and arrived exactly on schedule.",
  },
  {
    name: "Daniel Reed",
    role: "Operations Manager, Slate Events",
    quote:
      "Fast proofing, clear communication, and zero surprises. This is now our go-to partner for branded apparel.",
  },
  {
    name: "Aisha Khan",
    role: "Creative Lead, Easton Studio",
    quote:
      "The customization tools were simple, powerful, and precise. We launched a complete team drop in days.",
  },
];

const trustSignals = [
  {
    title: "100% Satisfaction Guarantee",
    description: "If your order is not right, we make it right quickly.",
    icon: ShieldCheck,
  },
  {
    title: "Easy Customization Tools",
    description: "Design, preview, and approve your products in minutes.",
    icon: SlidersHorizontal,
  },
  {
    title: "Free Standard Delivery",
    description: "Reliable delivery with tracking on every qualifying order.",
    icon: Truck,
  },
];

const fallbackSpotlightProducts: Product[] = [
  {
    id: -1,
    name: "Signature Embroidered Hoodie",
    slug: "signature-embroidered-hoodie",
    type: "Hoodie",
    brand: "Studio",
    price: 48,
    original_price: null,
    images: [],
  },
  {
    id: -2,
    name: "Teamwear Performance Polo",
    slug: "teamwear-performance-polo",
    type: "Polo",
    brand: "Team",
    price: 32,
    original_price: null,
    images: [],
  },
  {
    id: -3,
    name: "Studio Oversized Tee",
    slug: "studio-oversized-tee",
    type: "Tee",
    brand: "Studio",
    price: 24,
    original_price: null,
    images: [],
  },
  {
    id: -4,
    name: "Heritage Quarter Zip",
    slug: "heritage-quarter-zip",
    type: "Quarter Zip",
    brand: "Heritage",
    price: 54,
    original_price: null,
    images: [],
  },
];

export default function Welcome() {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const Layout = user ? AuthenticatedLayout : GuestLayout;
  const spotlightProducts = props.products?.length
    ? props.products.slice(0, 4)
    : fallbackSpotlightProducts;

  return (
    <Layout>
      <Head title="Welcome" />

      {/* HERO */}
      <HeroSection />

       {/* CATEGORIES */}
      <CategorySection />

      {/* FROM IDEA TO ICONIC SECTION */}
      <IdeaToIconicSection />

     

      {/* STACKED FEATURE CARDS */}
      <StackedScrollCards />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B08A2E]">
              New In
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1F1A13] md:text-4xl">
              Featured Products
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {spotlightProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#E6D9BC] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#E8DDBF] bg-gradient-to-r from-[#FFFDF8] to-[#FAF4E8] p-7 shadow-[0_16px_40px_rgba(128,98,26,0.08)] sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B08A2E]">
                  What Our Customers Say
                </p>
                <h2 className="mt-2 text-3xl font-bold text-[#1F1A13]">
                  Trusted by brands that expect quality
                </h2>
                <p className="mt-3 text-[#5F4F32]">
                  Consistent quality, reliable support, and fast delivery are
                  why teams come back for every new campaign.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D3AA] bg-[#FFF6E1] px-4 py-2 text-sm font-semibold text-[#7D5E1A]">
                <Star className="h-4 w-4 fill-[#C9A24D] text-[#C9A24D]" />
                Rated 4.9/5 from verified buyers
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {customerReviews.map((review) => (
                <blockquote
                  key={review.name}
                  className="rounded-2xl border border-[#EADFC6] bg-white p-5 text-[#1D1710]"
                >
                  <div className="mb-3 flex gap-1 text-[#C9A24D]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed">"{review.quote}"</p>
                  <footer className="mt-4 border-t border-[#EFE3CC] pt-4">
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-xs text-[#6F5C3A]">{review.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>

          <div className="mt-14">
            <h2 className="text-center text-2xl font-bold text-[#1F1A13] sm:text-3xl">
              Confidence in Every Order
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {trustSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.title}
                    className="rounded-2xl border border-[#E8DDBF] bg-[#FFFCF5] p-6 text-center"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F7E7C1] text-[#8A6D2B]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-[#1F1A13]">
                      {signal.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#685536]">
                      {signal.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-14 rounded-2xl border border-[#E8DDBF] bg-[#FFF7E6] p-6 text-center sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E1CCA0] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[#8A6D2B]">
              <CheckCircle2 className="h-4 w-4" />
              Professional quality assurance
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[#5D4B2E] sm:text-base">
              Every product is reviewed before dispatch to ensure premium
              finishing, accurate customization, and dependable consistency for
              your brand.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
