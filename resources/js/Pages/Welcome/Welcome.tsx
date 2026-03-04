import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";
import { AnimatePresence, motion } from "framer-motion";

import HeroSection from "./HeroSection";
import IdeaToIconicSection from "./IdeaToIconicSection";
import CategorySection from "./CategorySection";
import StackedScrollCards from "./StackedScrollCards";
import ProductCard from "../Product/ProductCard";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Truck,
} from "lucide-react";

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
  {
    id: -5,
    name: "Classic Crew Tee",
    slug: "classic-crew-tee",
    type: "Tee",
    brand: "Studio",
    price: 22,
    original_price: null,
    images: [],
  },
  {
    id: -6,
    name: "Street Heavyweight Tee",
    slug: "street-heavyweight-tee",
    type: "Tee",
    brand: "Street",
    price: 26,
    original_price: null,
    images: [],
  },
  {
    id: -7,
    name: "Drop Shoulder Tee",
    slug: "drop-shoulder-tee",
    type: "Tee",
    brand: "Studio",
    price: 25,
    original_price: null,
    images: [],
  },
  {
    id: -8,
    name: "Organic Cotton Tee",
    slug: "organic-cotton-tee",
    type: "Tee",
    brand: "Eco",
    price: 29,
    original_price: null,
    images: [],
  },
  {
    id: -9,
    name: "Vintage Wash Tee",
    slug: "vintage-wash-tee",
    type: "Tee",
    brand: "Heritage",
    price: 27,
    original_price: null,
    images: [],
  },
  {
    id: -10,
    name: "Performance Training Tee",
    slug: "performance-training-tee",
    type: "Tee",
    brand: "Sport",
    price: 23,
    original_price: null,
    images: [],
  },
];

const preMadeDesignNotes = [
  "Built by our in-house professionals to give you a polished starting point.",
  "Specially prepared layouts that can be customized quickly for your brand.",
  "Production-ready compositions designed to look premium on first pass.",
  "Expert-crafted styling so your team can launch merch faster.",
  "Made by our pro designers for clean, balanced, high-conversion visuals.",
  "Ready-made concepts tuned for print and embroidery friendly output.",
];

export default function Welcome() {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const Layout = user ? AuthenticatedLayout : GuestLayout;
  const spotlightProducts = useMemo(
    () =>
      props.products?.length
        ? props.products.slice(0, 10)
        : fallbackSpotlightProducts.slice(0, 10),
    [props.products]
  );
  const preMadeProducts = useMemo(() => {
    if (!props.products?.length) {
      return fallbackSpotlightProducts.slice(0, 6);
    }
    const secondary = props.products.slice(10, 16);
    return secondary.length >= 4 ? secondary : props.products.slice(0, 6);
  }, [props.products]);
  const [activeReview, setActiveReview] = useState(0);
  const productRailRef = useRef<HTMLDivElement | null>(null);
  const preMadeRailRef = useRef<HTMLDivElement | null>(null);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [productCardStep, setProductCardStep] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(spotlightProducts.length > 1);
  const productRailDraggingRef = useRef(false);
  const productRailMovedRef = useRef(false);
  const productRailPointerIdRef = useRef<number | null>(null);
  const productRailStartXRef = useRef(0);
  const productRailStartScrollRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % customerReviews.length);
    }, 4600);
    return () => clearInterval(interval);
  }, []);

  const syncProductRailState = useCallback(() => {
    const rail = productRailRef.current;
    if (!rail) return;

    const firstCard = rail.querySelector<HTMLElement>("[data-product-card]");
    if (firstCard) {
      const railStyle = window.getComputedStyle(rail);
      const gapRaw =
        railStyle.columnGap !== "normal" ? railStyle.columnGap : railStyle.gap;
      const gap = Number.parseFloat(gapRaw || "0") || 0;
      const nextStep = firstCard.offsetWidth + gap;
      if (nextStep > 0) {
        setProductCardStep(nextStep);
        const nextIndex = Math.round(rail.scrollLeft / nextStep);
        setActiveProductIndex(
          Math.max(0, Math.min(spotlightProducts.length - 1, nextIndex))
        );
      }
    }

    setCanScrollPrev(rail.scrollLeft > 8);
    setCanScrollNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8);
  }, [spotlightProducts.length]);

  useEffect(() => {
    const rail = productRailRef.current;
    if (!rail) return;

    syncProductRailState();
    rail.addEventListener("scroll", syncProductRailState, { passive: true });
    window.addEventListener("resize", syncProductRailState);

    return () => {
      rail.removeEventListener("scroll", syncProductRailState);
      window.removeEventListener("resize", syncProductRailState);
    };
  }, [syncProductRailState]);

  const scrollProductRail = (direction: "prev" | "next") => {
    const rail = productRailRef.current;
    if (!rail) return;
    const step = productCardStep > 0 ? productCardStep : rail.clientWidth * 0.82;
    rail.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  const jumpToProduct = (index: number) => {
    const rail = productRailRef.current;
    if (!rail) return;
    const step = productCardStep > 0 ? productCardStep : rail.clientWidth * 0.82;
    rail.scrollTo({ left: step * index, behavior: "smooth" });
  };

  const startProductRailDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rail = productRailRef.current;
    if (!rail) return;
    productRailDraggingRef.current = true;
    productRailMovedRef.current = false;
    productRailPointerIdRef.current = event.pointerId;
    productRailStartXRef.current = event.clientX;
    productRailStartScrollRef.current = rail.scrollLeft;
    rail.setPointerCapture(event.pointerId);
  };

  const moveProductRailDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!productRailDraggingRef.current) return;
    if (event.pointerType !== "mouse") return;
    const rail = productRailRef.current;
    if (!rail) return;
    const delta = event.clientX - productRailStartXRef.current;
    if (Math.abs(delta) > 4) {
      productRailMovedRef.current = true;
    }
    rail.scrollLeft = productRailStartScrollRef.current - delta;
  };

  const endProductRailDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    const rail = productRailRef.current;
    if (rail && productRailPointerIdRef.current !== null) {
      try {
        rail.releasePointerCapture(productRailPointerIdRef.current);
      } catch {
        // Safe no-op for browsers that already released capture.
      }
    }
    if (event && event.pointerType === "mouse") {
      event.currentTarget.style.cursor = "grab";
    }
    productRailDraggingRef.current = false;
    productRailPointerIdRef.current = null;
  };

  const handleRailWheel = (
    event: React.WheelEvent<HTMLDivElement>,
    rail: HTMLDivElement | null
  ) => {
    if (!rail) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    rail.scrollBy({ left: event.deltaY, behavior: "auto" });
  };

  return (
    <Layout>
      <Head title="Welcome" />

      <div className="flex flex-col">
        {/* HERO */}
        <div className="order-1">
          <HeroSection />
        </div>

        {/* FROM IDEA TO ICONIC SECTION */}
        <div className="order-2 md:order-3">
          <IdeaToIconicSection />
        </div>

        {/* CATEGORIES */}
        <div className="order-3 md:order-2">
          <CategorySection />
        </div>
      </div>

     

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
          <div className="mt-5 flex items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => scrollProductRail("prev")}
              disabled={!canScrollPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5D3AA] bg-[#FFF9ED] text-[#7D5E1A] transition hover:border-[#C9A24D] hover:text-[#6D520D] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Previous featured products"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollProductRail("next")}
              disabled={!canScrollNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5D3AA] bg-[#FFF9ED] text-[#7D5E1A] transition hover:border-[#C9A24D] hover:text-[#6D520D] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Next featured products"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 w-full px-4 sm:px-6 lg:px-8">
          <div
            ref={productRailRef}
            onPointerDown={(event) => {
              startProductRailDrag(event);
            }}
            onPointerMove={(event) => {
              moveProductRailDrag(event);
            }}
            onPointerUp={(event) => {
              endProductRailDrag(event);
            }}
            onPointerCancel={(event) => {
              endProductRailDrag(event);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse" && !productRailDraggingRef.current) {
                event.currentTarget.style.cursor = "grab";
              }
            }}
            onClickCapture={(event) => {
              if (productRailMovedRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onWheel={(event) => handleRailWheel(event, productRailRef.current)}
            onDragStart={(event) => event.preventDefault()}
            className="flex w-full cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x active:cursor-grabbing"
          >
            {spotlightProducts.map((product) => (
              <motion.div
                key={product.id}
                data-product-card
                className="min-w-[76%] snap-start sm:min-w-[48%] md:min-w-[32%] lg:w-[265px] lg:min-w-[265px]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35 }}
              >
                <ProductCard product={product} compact />
              </motion.div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {spotlightProducts.map((product, index) => (
              <button
                key={`spotlight-dot-${product.id}`}
                type="button"
                onClick={() => jumpToProduct(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeProductIndex
                    ? "w-7 bg-[#C9A24D]"
                    : "w-2.5 bg-[#E4D4B2]"
                }`}
                aria-label={`Jump to featured product ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#E6D9BC]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C7B2A]">
              New pre-made designs
            </p>
            <div className="h-px flex-1 bg-[#E6D9BC]" />
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6A5530]">
            Professionally crafted design templates from our studio team, ready
            to customize in minutes.
          </p>

          <div
            ref={preMadeRailRef}
            onWheel={(event) => handleRailWheel(event, preMadeRailRef.current)}
            onDragStart={(event) => event.preventDefault()}
            className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
          >
            {preMadeProducts.map((product, index) => (
              <div
                key={`premade-${product.id}-${index}`}
                className="min-w-[76%] snap-start sm:min-w-[48%] md:min-w-[32%] lg:w-[265px] lg:min-w-[265px]"
              >
                <ProductCard product={product} compact />
                <p className="mt-3 px-1 text-sm text-[#6F5A34]">
                  {preMadeDesignNotes[index % preMadeDesignNotes.length]}
                </p>
              </div>
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

            <div className="mt-8 overflow-hidden rounded-2xl border border-[#EADFC6] bg-white p-6">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={customerReviews[activeReview].name}
                  className="text-[#1D1710]"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.45 }}
                >
                  <div className="mb-3 flex gap-1 text-[#C9A24D]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-base leading-relaxed">
                    "{customerReviews[activeReview].quote}"
                  </p>
                  <footer className="mt-4 border-t border-[#EFE3CC] pt-4">
                    <p className="font-semibold">{customerReviews[activeReview].name}</p>
                    <p className="text-xs text-[#6F5C3A]">{customerReviews[activeReview].role}</p>
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
              <div className="mt-5 flex justify-center gap-2">
                {customerReviews.map((review, index) => (
                  <button
                    key={review.name}
                    type="button"
                    onClick={() => setActiveReview(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeReview ? "w-7 bg-[#C9A24D]" : "w-2.5 bg-[#E2D4B6]"
                    }`}
                    aria-label={`Show review from ${review.name}`}
                  />
                ))}
              </div>
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
                    className="rounded-2xl border border-[#E8DDBF] bg-white p-6 text-center"
                  >
                    <div className="mx-auto text-[#8A6D2B]">
                      <Icon className="mx-auto h-10 w-10" />
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

          <div className="mt-14 rounded-2xl border border-[#E8DDBF] bg-white p-6 text-center sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8DDBF] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[#8A6D2B]">
              <CheckCircle2 className="h-5 w-5" />
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
