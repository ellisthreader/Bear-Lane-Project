import type { ReactNode } from "react";
import AppLayout from "@/Layouts/AppLayout";
import { Head } from "@inertiajs/react";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

const featuredProducts = [
  {
    name: "Signature Embroidered Hoodie",
    category: "Trending Now",
    description: "Premium heavyweight cotton with custom front and sleeve stitch.",
    price: "From £48",
  },
  {
    name: "Teamwear Performance Polo",
    category: "New In",
    description: "Moisture-wicking fabric with clean, professional crest embroidery.",
    price: "From £32",
  },
  {
    name: "Studio Oversized Tee",
    category: "Trending Now",
    description: "Soft drape fit ideal for bold logo prints and minimal branding.",
    price: "From £24",
  },
  {
    name: "Heritage Quarter Zip",
    category: "New In",
    description: "Corporate-ready midlayer with structured fit and elevated details.",
    price: "From £54",
  },
];

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

export default function Home(): ReactNode {
  return (
    <AppLayout>
      <Head title="Home" />

      <div className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-8 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/90 p-8 text-white shadow-2xl shadow-cyan-900/30 md:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1 text-sm font-medium text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Built for premium custom apparel
              </span>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Design-Led Products That Build Real Brand Trust
              </h1>
              <p className="mt-5 text-base text-slate-200 sm:text-lg">
                Discover top-performing pieces, launch fresh drops, and deliver
                professional quality your customers remember.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Shop Trending
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Start Custom Order
                </a>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                  Product Spotlight
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  Trending Now & New In
                </h2>
              </div>
              <a
                href="/projects"
                className="hidden items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100 sm:inline-flex"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <article
                  key={product.name}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.08]"
                >
                  <p className="inline-block rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                    {product.category}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {product.description}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-cyan-200">
                    {product.price}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-3xl border border-emerald-300/20 bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-blue-500/10 p-7 shadow-xl shadow-emerald-900/20 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">
                  What Our Customers Say
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  Trusted by brands that expect quality
                </h2>
                <p className="mt-3 text-slate-200">
                  Consistent quality, reliable support, and fast delivery are
                  why teams come back for every new campaign.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/30 bg-yellow-300/10 px-4 py-2 text-sm font-semibold text-yellow-100">
                <Star className="h-4 w-4 fill-yellow-200 text-yellow-200" />
                Rated 4.9/5 from verified buyers
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {customerReviews.map((review) => (
                <blockquote
                  key={review.name}
                  className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 text-slate-100"
                >
                  <div className="mb-3 flex gap-1 text-yellow-200">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed">"{review.quote}"</p>
                  <footer className="mt-4 border-t border-white/10 pt-4">
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-xs text-slate-300">{review.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
              Confidence in Every Order
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {trustSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">
                      {signal.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {signal.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-14 rounded-2xl border border-cyan-200/20 bg-slate-900/50 p-6 text-center sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
              <CheckCircle2 className="h-4 w-4" />
              Professional quality assurance
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
              Every product is reviewed before dispatch to ensure premium
              finishing, accurate customization, and dependable consistency for
              your brand.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
