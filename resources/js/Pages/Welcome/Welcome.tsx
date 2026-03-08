import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";
import { AnimatePresence, motion } from "framer-motion";
import DeferredRender from "@/Components/Performance/DeferredRender";

import HeroSection from "./HeroSection";
const IdeaToIconicSection = lazy(() => import("./IdeaToIconicSection"));
const CategorySection = lazy(() => import("./CategorySection"));
const StackedScrollCards = lazy(() => import("./StackedScrollCards"));
const ProductCard = lazy(() => import("../Product/ProductCard"));
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  type: string;
  brand: string;
  price: number;
  original_price?: number | null;
  is_premade_design?: boolean;
  premade_quote?: string | null;
  auto_badges?: string[] | null;
  images: string[];
};

type PageProps = {
  auth: {
    user?: User;
  };
  products: Product[];
  featuredProducts?: Product[];
  preMadeProducts?: Product[];
  preMadeQuotes?: Record<string, string>;
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
      "The customisation tools were simple, powerful, and precise. We launched a complete team drop in days.",
  },
];

const trustSignals = [
  {
    title: "100% Satisfaction Guarantee",
    description: "If your order is not right, we make it right quickly.",
    icon: ShieldCheck,
  },
  {
    title: "Easy Customisation Tools",
    description: "Design, preview, and approve your products in minutes.",
    icon: SlidersHorizontal,
  },
  {
    title: "Free Standard Delivery",
    description: "Reliable delivery with tracking on every qualifying order.",
    icon: Truck,
  },
];

const sectionFallback = (
  <div className="w-full bg-white px-4 py-16">
    <div className="mx-auto h-40 max-w-7xl animate-pulse rounded-2xl bg-[#F5EFE2]" />
  </div>
);

export default function Welcome() {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const Layout = user ? AuthenticatedLayout : GuestLayout;
  const isAdminUser = Boolean(user?.is_admin);
  const spotlightProducts = useMemo(
    () => (Array.isArray(props.featuredProducts) ? props.featuredProducts.slice(0, 30) : []),
    [props.featuredProducts]
  );
  const preMadeProducts = useMemo(() => {
    if (!Array.isArray(props.preMadeProducts)) return [];
    return props.preMadeProducts.slice(0, 30);
  }, [props.preMadeProducts]);
  const preMadeQuotes = useMemo(() => {
    if (!props.preMadeQuotes || typeof props.preMadeQuotes !== "object") {
      return {} as Record<string, string>;
    }

    return Object.entries(props.preMadeQuotes).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedId = String(Number(key));
      const quote = String(value || "").trim();
      if (!normalizedId || normalizedId === "NaN" || !quote) return acc;
      acc[normalizedId] = quote;
      return acc;
    }, {});
  }, [props.preMadeQuotes]);
  const [activeReview, setActiveReview] = useState(0);
  const productRailRef = useRef<HTMLDivElement | null>(null);
  const preMadeRailRef = useRef<HTMLDivElement | null>(null);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [productCardStep, setProductCardStep] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(spotlightProducts.length > 1);
  const [activePreMadeIndex, setActivePreMadeIndex] = useState(0);
  const [preMadeCardStep, setPreMadeCardStep] = useState(0);
  const [canScrollPreMadePrev, setCanScrollPreMadePrev] = useState(false);
  const [canScrollPreMadeNext, setCanScrollPreMadeNext] = useState(
    preMadeProducts.length > 1
  );
  const productCardStepRef = useRef(0);
  const activeProductIndexRef = useRef(0);
  const canScrollPrevRef = useRef(false);
  const canScrollNextRef = useRef(spotlightProducts.length > 1);
  const preMadeCardStepRef = useRef(0);
  const activePreMadeIndexRef = useRef(0);
  const canScrollPreMadePrevRef = useRef(false);
  const canScrollPreMadeNextRef = useRef(preMadeProducts.length > 1);
  const productRailRafRef = useRef<number | null>(null);
  const preMadeRailRafRef = useRef<number | null>(null);
  const productRailDraggingRef = useRef(false);
  const productRailMovedRef = useRef(false);
  const productRailPointerIdRef = useRef<number | null>(null);
  const productRailStartXRef = useRef(0);
  const productRailStartScrollRef = useRef(0);
  const preMadeRailDraggingRef = useRef(false);
  const preMadeRailMovedRef = useRef(false);
  const preMadeRailPointerIdRef = useRef<number | null>(null);
  const preMadeRailStartXRef = useRef(0);
  const preMadeRailStartScrollRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % customerReviews.length);
    }, 4600);
    return () => clearInterval(interval);
  }, []);

  const syncProductRailState = useCallback((rail: HTMLDivElement) => {
    const firstCard = rail.querySelector<HTMLElement>("[data-product-card]");
    if (firstCard) {
      const railStyle = window.getComputedStyle(rail);
      const gapRaw =
        railStyle.columnGap !== "normal" ? railStyle.columnGap : railStyle.gap;
      const gap = Number.parseFloat(gapRaw || "0") || 0;
      const nextStep = firstCard.offsetWidth + gap;
      if (nextStep > 0) {
        if (productCardStepRef.current !== nextStep) {
          productCardStepRef.current = nextStep;
          setProductCardStep(nextStep);
        }
        const nextIndex = Math.round(rail.scrollLeft / nextStep);
        const boundedIndex = Math.max(0, Math.min(spotlightProducts.length - 1, nextIndex));
        if (activeProductIndexRef.current !== boundedIndex) {
          activeProductIndexRef.current = boundedIndex;
          startTransition(() => setActiveProductIndex(boundedIndex));
        }
      }
    }

    const nextCanScrollPrev = rail.scrollLeft > 8;
    if (canScrollPrevRef.current !== nextCanScrollPrev) {
      canScrollPrevRef.current = nextCanScrollPrev;
      setCanScrollPrev(nextCanScrollPrev);
    }

    const nextCanScrollNext = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8;
    if (canScrollNextRef.current !== nextCanScrollNext) {
      canScrollNextRef.current = nextCanScrollNext;
      setCanScrollNext(nextCanScrollNext);
    }
  }, [spotlightProducts.length]);

  const syncPreMadeRailState = useCallback((rail: HTMLDivElement) => {
    const firstCard = rail.querySelector<HTMLElement>("[data-premade-card]");
    if (firstCard) {
      const railStyle = window.getComputedStyle(rail);
      const gapRaw =
        railStyle.columnGap !== "normal" ? railStyle.columnGap : railStyle.gap;
      const gap = Number.parseFloat(gapRaw || "0") || 0;
      const nextStep = firstCard.offsetWidth + gap;
      if (nextStep > 0) {
        if (preMadeCardStepRef.current !== nextStep) {
          preMadeCardStepRef.current = nextStep;
          setPreMadeCardStep(nextStep);
        }
        const nextIndex = Math.round(rail.scrollLeft / nextStep);
        const boundedIndex = Math.max(0, Math.min(preMadeProducts.length - 1, nextIndex));
        if (activePreMadeIndexRef.current !== boundedIndex) {
          activePreMadeIndexRef.current = boundedIndex;
          startTransition(() => setActivePreMadeIndex(boundedIndex));
        }
      }
    }

    const nextCanScrollPreMadePrev = rail.scrollLeft > 8;
    if (canScrollPreMadePrevRef.current !== nextCanScrollPreMadePrev) {
      canScrollPreMadePrevRef.current = nextCanScrollPreMadePrev;
      setCanScrollPreMadePrev(nextCanScrollPreMadePrev);
    }

    const nextCanScrollPreMadeNext = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8;
    if (canScrollPreMadeNextRef.current !== nextCanScrollPreMadeNext) {
      canScrollPreMadeNextRef.current = nextCanScrollPreMadeNext;
      setCanScrollPreMadeNext(nextCanScrollPreMadeNext);
    }
  }, [preMadeProducts.length]);

  const scheduleProductRailSync = useCallback(() => {
    if (productRailRafRef.current !== null) return;
    productRailRafRef.current = window.requestAnimationFrame(() => {
      productRailRafRef.current = null;
      const rail = productRailRef.current;
      if (!rail) return;
      syncProductRailState(rail);
    });
  }, [syncProductRailState]);

  const schedulePreMadeRailSync = useCallback(() => {
    if (preMadeRailRafRef.current !== null) return;
    preMadeRailRafRef.current = window.requestAnimationFrame(() => {
      preMadeRailRafRef.current = null;
      const rail = preMadeRailRef.current;
      if (!rail) return;
      syncPreMadeRailState(rail);
    });
  }, [syncPreMadeRailState]);

  useEffect(() => {
    const rail = productRailRef.current;
    if (!rail) return;

    scheduleProductRailSync();
    rail.addEventListener("scroll", scheduleProductRailSync, { passive: true });
    window.addEventListener("resize", scheduleProductRailSync);

    return () => {
      rail.removeEventListener("scroll", scheduleProductRailSync);
      window.removeEventListener("resize", scheduleProductRailSync);
      if (productRailRafRef.current !== null) {
        cancelAnimationFrame(productRailRafRef.current);
        productRailRafRef.current = null;
      }
    };
  }, [scheduleProductRailSync]);

  useEffect(() => {
    const rail = preMadeRailRef.current;
    if (!rail) return;

    schedulePreMadeRailSync();
    rail.addEventListener("scroll", schedulePreMadeRailSync, { passive: true });
    window.addEventListener("resize", schedulePreMadeRailSync);

    return () => {
      rail.removeEventListener("scroll", schedulePreMadeRailSync);
      window.removeEventListener("resize", schedulePreMadeRailSync);
      if (preMadeRailRafRef.current !== null) {
        cancelAnimationFrame(preMadeRailRafRef.current);
        preMadeRailRafRef.current = null;
      }
    };
  }, [schedulePreMadeRailSync]);

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

  const scrollPreMadeRail = (direction: "prev" | "next") => {
    const rail = preMadeRailRef.current;
    if (!rail) return;
    const step = preMadeCardStep > 0 ? preMadeCardStep : rail.clientWidth * 0.82;
    rail.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  const jumpToPreMade = (index: number) => {
    const rail = preMadeRailRef.current;
    if (!rail) return;
    const step = preMadeCardStep > 0 ? preMadeCardStep : rail.clientWidth * 0.82;
    rail.scrollTo({ left: step * index, behavior: "smooth" });
  };

  const startProductRailDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if ((event.target as HTMLElement).closest("a")) return;
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
    if (Math.abs(delta) > 8) {
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

  const startPreMadeRailDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if ((event.target as HTMLElement).closest("a")) return;
    const rail = preMadeRailRef.current;
    if (!rail) return;
    preMadeRailDraggingRef.current = true;
    preMadeRailMovedRef.current = false;
    preMadeRailPointerIdRef.current = event.pointerId;
    preMadeRailStartXRef.current = event.clientX;
    preMadeRailStartScrollRef.current = rail.scrollLeft;
    rail.setPointerCapture(event.pointerId);
  };

  const movePreMadeRailDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!preMadeRailDraggingRef.current) return;
    if (event.pointerType !== "mouse") return;
    const rail = preMadeRailRef.current;
    if (!rail) return;
    const delta = event.clientX - preMadeRailStartXRef.current;
    if (Math.abs(delta) > 8) {
      preMadeRailMovedRef.current = true;
    }
    rail.scrollLeft = preMadeRailStartScrollRef.current - delta;
  };

  const endPreMadeRailDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    const rail = preMadeRailRef.current;
    if (rail && preMadeRailPointerIdRef.current !== null) {
      try {
        rail.releasePointerCapture(preMadeRailPointerIdRef.current);
      } catch {
        // Safe no-op for browsers that already released capture.
      }
    }
    if (event && event.pointerType === "mouse") {
      event.currentTarget.style.cursor = "grab";
    }
    preMadeRailDraggingRef.current = false;
    preMadeRailPointerIdRef.current = null;
  };

  const handleRailWheel = (
    event: React.WheelEvent<HTMLDivElement>,
    rail: HTMLDivElement | null
  ) => {
    if (!rail) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (event.cancelable) {
      event.preventDefault();
    }
    rail.scrollBy({ left: event.deltaY, behavior: "auto" });
  };

  return (
    <Layout>
      <Head title="Welcome">
        <link rel="preload" as="image" href="/hero.webp" />
      </Head>

      <div className="flex flex-col">
        {/* HERO */}
        <div className="order-1">
          <HeroSection />
        </div>

        {/* FROM IDEA TO ICONIC SECTION */}
        <div className="order-2 md:order-3">
          <DeferredRender fallback={sectionFallback}>
            <Suspense fallback={sectionFallback}>
              <IdeaToIconicSection />
            </Suspense>
          </DeferredRender>
        </div>

        {/* CATEGORIES */}
        <div className="order-3 md:order-2">
          <DeferredRender fallback={sectionFallback}>
            <Suspense fallback={sectionFallback}>
              <CategorySection />
            </Suspense>
          </DeferredRender>
        </div>
      </div>

     

      {/* STACKED FEATURE CARDS */}
      <DeferredRender fallback={sectionFallback}>
        <Suspense fallback={sectionFallback}>
          <StackedScrollCards />
        </Suspense>
      </DeferredRender>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B08A2E]">
              New In
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1F1A13] md:text-4xl">
              Featured Products
            </h2>
            {isAdminUser ? (
              <div className="mt-3">
                <Link
                  href="/admin/other/front-page?tab=featured"
                  className="inline-flex items-center rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-3 py-1 text-xs font-semibold text-[#6B5A34] hover:bg-[#FFF2D7]"
                >
                  Edit Featured
                </Link>
              </div>
            ) : null}
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
          {spotlightProducts.length > 0 ? (
            <>
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
                    productRailMovedRef.current = false;
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
                    <Suspense
                      fallback={
                        <div className="h-64 animate-pulse rounded-2xl border bg-[#F7F1E4] md:h-72" />
                      }
                    >
                      <ProductCard product={product} compact />
                    </Suspense>
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
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E3D8BE] bg-[#FFFCF4] px-4 py-6 text-center text-sm text-[#6B5A34]">
              No featured products selected yet.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B08A2E]">
              New In
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1F1A13] md:text-4xl">
              Pre-Made Designs
            </h2>
            {isAdminUser ? (
              <div className="mt-3">
                <Link
                  href="/admin/other/front-page?tab=premade"
                  className="inline-flex items-center rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-3 py-1 text-xs font-semibold text-[#6B5A34] hover:bg-[#FFF2D7]"
                >
                  Edit Pre-Made
                </Link>
              </div>
            ) : null}
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6A5530]">
            Professionally crafted design templates from our studio team, ready
            to customise in minutes.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => scrollPreMadeRail("prev")}
              disabled={!canScrollPreMadePrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5D3AA] bg-[#FFF9ED] text-[#7D5E1A] transition hover:border-[#C9A24D] hover:text-[#6D520D] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Previous pre-made designs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollPreMadeRail("next")}
              disabled={!canScrollPreMadeNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5D3AA] bg-[#FFF9ED] text-[#7D5E1A] transition hover:border-[#C9A24D] hover:text-[#6D520D] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Next pre-made designs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-5 w-full px-4 sm:px-6 lg:px-8">
          {preMadeProducts.length > 0 ? (
            <>
              <div
                ref={preMadeRailRef}
                onPointerDown={(event) => {
                  startPreMadeRailDrag(event);
                }}
                onPointerMove={(event) => {
                  movePreMadeRailDrag(event);
                }}
                onPointerUp={(event) => {
                  endPreMadeRailDrag(event);
                }}
                onPointerCancel={(event) => {
                  endPreMadeRailDrag(event);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse" && !preMadeRailDraggingRef.current) {
                    event.currentTarget.style.cursor = "grab";
                  }
                }}
                onClickCapture={(event) => {
                  if (preMadeRailMovedRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    preMadeRailMovedRef.current = false;
                  }
                }}
                onWheel={(event) => handleRailWheel(event, preMadeRailRef.current)}
                onDragStart={(event) => event.preventDefault()}
                className="flex w-full cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x active:cursor-grabbing"
              >
                {preMadeProducts.map((product, index) => (
                  <div
                    key={`premade-${product.id}-${index}`}
                    data-premade-card
                    className="min-w-[76%] snap-start sm:min-w-[48%] md:min-w-[32%] lg:w-[265px] lg:min-w-[265px]"
                  >
                    <Suspense
                      fallback={
                        <div className="h-64 animate-pulse rounded-2xl border bg-[#F7F1E4] md:h-72" />
                      }
                    >
                      <ProductCard product={product} compact showPremadeQuoteInside={false} />
                    </Suspense>
                    {String(preMadeQuotes[String(product.id)] || String(product.premade_quote || "").trim()).trim() ? (
                      <div className="mt-3 rounded-xl border border-[#E7D7B2] bg-[#FFF9EB] px-3 py-2 text-sm font-medium text-[#5B441A] shadow-[0_8px_18px_rgba(95,72,18,0.08)]">
                        <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#E4C985] bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A5C1E]">
                          <Sparkles className="h-3 w-3" />
                          Bear Lane Studio
                        </span>
                        <span className="mt-1 block rounded-lg bg-gradient-to-r from-[#FFF9EA] via-[#FFF5DF] to-[#FFF9EA] px-2.5 py-2 text-sm font-medium leading-relaxed text-[#5B441A]">
                          {String(preMadeQuotes[String(product.id)] || String(product.premade_quote || "").trim()).trim()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {preMadeProducts.map((product, index) => (
                  <button
                    key={`premade-dot-${product.id}-${index}`}
                    type="button"
                    onClick={() => jumpToPreMade(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activePreMadeIndex
                        ? "w-7 bg-[#C9A24D]"
                        : "w-2.5 bg-[#E4D4B2]"
                    }`}
                    aria-label={`Jump to pre-made design ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E3D8BE] bg-[#FFFCF4] px-4 py-6 text-center text-sm text-[#6B5A34]">
              No pre-made designs selected yet.
            </div>
          )}
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
              finishing, accurate customisation, and dependable consistency for
              your brand.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
