import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import DeferredRender from "@/Components/Performance/DeferredRender";

import HeroSection from "./HeroSection";
import RailSectionHeader from "./RailSectionHeader";
const IdeaToIconicSection = lazy(() => import("./IdeaToIconicSection"));
const CategorySection = lazy(() => import("./CategorySection"));
const StackedScrollCards = lazy(() => import("./StackedScrollCards"));
const ProductCard = lazy(() => import("../Product/ProductCard"));
import {
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { AddItemButton, BlankSection, EditSection, ItemControls } from "@/Components/SiteEditor/controls";
import { ContentImage, cx, EditBlock, EditText, useLook } from "@/Components/SiteEditor/primitives";
import { openProductPicker } from "@/Components/SiteEditor/selection";
import { DEFAULT_ORDER_CLASSES, effectiveSectionOrder } from "@/Components/SiteEditor/sections";
import { itemKey, useSectionConfig, useText, useVisibleIds } from "@/Components/SiteEditor/store";
import type { SectionId } from "@/Components/SiteEditor/types";

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
};

type Review = {
  name: string;
  quote: string;
  time: string;
  avatar?: string;
};

const REVIEWS_LIST = "reviews.items";
const DEFAULT_REVIEWS: Record<string, Review> = {
  r1: {
    name: "vose-14",
    quote: "Great seller, fast delivery, no nonsense! A*",
    time: "4 days ago",
    avatar: "/images/reviews/vinted/vose-14.webp",
  },
  r2: {
    name: "locko0",
    quote: "Fast dispatch, item as described",
    time: "1 month ago",
  },
  r3: {
    name: "rbw888",
    quote: "Great hat, good price. Am really pleased, thank you 👍",
    time: "1 month ago",
    avatar: "/images/reviews/vinted/rbw888.webp",
  },
  r4: {
    name: "nashkins",
    quote: "Beautiful caps, Just as described. A**** seller",
    time: "1 month ago",
  },
  r5: {
    name: "finchs261",
    quote: "A remarkably easy buying and selling experience that has furnished my bonce with a new adornment.",
    time: "1 month ago",
    avatar: "/images/reviews/vinted/finchs261.webp",
  },
  r6: {
    name: "icklegeordie",
    quote: "Fantastic item and fabulous seller 👍🙏👍",
    time: "1 month ago",
    avatar: "/images/reviews/vinted/icklegeordie.webp",
  },
  r7: {
    name: "zoevictoriab",
    quote: "Lovely item great condition thank you !",
    time: "1 month ago",
  },
  r8: {
    name: "karlabcs",
    quote: "great item. well packed. thank you !",
    time: "1 month ago",
    avatar: "/images/reviews/vinted/karlabcs.webp",
  },
  r9: {
    name: "jamhop1",
    quote: "Item arrived quickly and as described. Thanks :)",
    time: "2 months ago",
  },
  r10: {
    name: "lmacoct79",
    quote: "Great seller with fast delivery and item as described. very happy. 🙂",
    time: "2 months ago",
  },
};
const DEFAULT_REVIEW_IDS = Object.keys(DEFAULT_REVIEWS);
const NEW_REVIEW: Review = { name: "customer", quote: "What a brilliant experience, thank you!", time: "Just now" };

type TrustItem = { title: string; description: string; icon: LucideIcon };

const TRUST_LIST = "trust.items";
const DEFAULT_TRUST: Record<string, TrustItem> = {
  t1: {
    title: "100% Satisfaction Guarantee",
    description: "If your order is not right, we make it right quickly.",
    icon: ShieldCheck,
  },
  t2: {
    title: "Easy Customisation Tools",
    description: "Design, preview, and approve your products in minutes.",
    icon: SlidersHorizontal,
  },
  t3: {
    title: "Free Standard Delivery",
    description: "Reliable delivery with tracking on every qualifying order.",
    icon: Truck,
  },
};
const DEFAULT_TRUST_IDS = Object.keys(DEFAULT_TRUST);
const NEW_TRUST: TrustItem = {
  title: "New benefit",
  description: "Tell customers why they can rely on you.",
  icon: Sparkles,
};

function ReviewCard({ id, review }: { id: string; review: Review }) {
  const field = (name: string) => itemKey(REVIEWS_LIST, id, name);
  const name = useText(field("name"), review.name);
  const look = useLook(field("card"));

  return (
    <figure
      className={cx("group/item relative w-[300px] shrink-0 rounded-2xl border border-[#EDE4CE] bg-[#FFFDF8] p-5", look.className)}
      style={look.style}
    >
      <ItemControls listId={REVIEWS_LIST} itemId={id} defaults={DEFAULT_REVIEW_IDS} styleId={field("card")} noun="review" />
      <figcaption className="flex items-center gap-3">
        <ContentImage
          id={field("avatar")}
          src={review.avatar ?? ""}
          alt=""
          aria-hidden="true"
          loading="lazy"
          label="Profile picture"
          className="h-8 w-8 shrink-0 rounded-full bg-[#EAF5F4] object-cover"
          empty={
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5F4] text-xs font-semibold uppercase text-[#007782]"
              aria-hidden="true"
            >
              {name.charAt(0)}
            </span>
          }
        />
        <div className="min-w-0 flex-1">
          <EditText id={field("name")} as="p" label="Name" className="truncate text-sm font-semibold text-[#1F1A13]">
            {review.name}
          </EditText>
          <div className="mt-0.5 flex items-center gap-1.5">
            <EditBlock id={field("stars")} label="Stars" as="span" className="flex gap-px text-[#C9A24D]" ariaLabel="5 out of 5 stars" background={false}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="h-3 w-3 fill-current" aria-hidden="true" />
              ))}
            </EditBlock>
            <EditText id={field("time")} as="span" label="Date" className="text-xs text-[#8A7A5A]">
              {review.time}
            </EditText>
          </div>
        </div>
      </figcaption>
      <EditText id={field("quote")} as="blockquote" label="Review" className="mt-3 text-[15px] leading-relaxed text-[#3A3020]">
        {review.quote}
      </EditText>
    </figure>
  );
}

function TrustCard({ id, item }: { id: string; item: TrustItem }) {
  const field = (name: string) => itemKey(TRUST_LIST, id, name);
  const look = useLook(field("card"));
  const Icon = item.icon;

  return (
    <div
      className={cx("group/item relative rounded-2xl border border-[#E8DDBF] bg-white p-6 text-center", look.className)}
      style={look.style}
    >
      <ItemControls listId={TRUST_LIST} itemId={id} defaults={DEFAULT_TRUST_IDS} styleId={field("card")} noun="benefit" />
      <EditBlock id={field("icon")} label="Icon" className="mx-auto w-fit text-[#8A6D2B]" background={false}>
        <Icon className="mx-auto h-10 w-10" />
      </EditBlock>
      <EditText id={field("title")} as="h3" label="Heading" className="mt-4 text-base font-semibold text-[#1F1A13]">
        {item.title}
      </EditText>
      <EditText id={field("description")} as="p" label="Paragraph" className="mt-2 text-sm text-[#685536]">
        {item.description}
      </EditText>
    </div>
  );
}

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
  const productRailRef = useRef<HTMLDivElement | null>(null);
  const preMadeRailRef = useRef<HTMLDivElement | null>(null);
  const reviewsSectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  // Reviews drift horizontally as the section passes through the viewport:
  // top row travels left -> right, bottom row mirrors it. Bound to scroll
  // progress, so scrolling back up rewinds the movement.
  const { scrollYProgress: reviewsProgress } = useScroll({
    target: reviewsSectionRef,
    offset: ["start end", "end start"],
  });
  const reviewsRowOneX = useTransform(reviewsProgress, [0, 1], ["-18%", "6%"]);
  const reviewsRowTwoX = useTransform(reviewsProgress, [0, 1], ["6%", "-18%"]);
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

  const sectionConfig = useSectionConfig();
  const sectionOrder = effectiveSectionOrder(sectionConfig);
  const hasCustomOrder = sectionConfig.order.length > 0;
  const reviewIds = useVisibleIds(REVIEWS_LIST, DEFAULT_REVIEW_IDS);
  const trustIds = useVisibleIds(TRUST_LIST, DEFAULT_TRUST_IDS);
  const reviewSplit = Math.ceil(reviewIds.length / 2);
  const reviewRows = [reviewIds.slice(0, reviewSplit), reviewIds.slice(reviewSplit)];

  const chooseProducts = (kind: "featured" | "premade") => (
    <button
      type="button"
      onClick={() => openProductPicker(kind)}
      className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-full bg-blue-500 px-3 text-xs font-semibold text-white transition hover:bg-blue-400"
    >
      <ShoppingBag className="h-3.5 w-3.5" />
      Choose products
    </button>
  );

  const sections: Record<string, ReactNode> = {
    hero: <HeroSection />,
    categories: (
      <DeferredRender fallback={sectionFallback}>
        <Suspense fallback={sectionFallback}>
          <CategorySection />
        </Suspense>
      </DeferredRender>
    ),
    idea: (
      <DeferredRender fallback={sectionFallback}>
        <Suspense fallback={sectionFallback}>
          <IdeaToIconicSection />
        </Suspense>
      </DeferredRender>
    ),
    how: (
      <DeferredRender fallback={sectionFallback}>
        <Suspense fallback={sectionFallback}>
          <StackedScrollCards />
        </Suspense>
      </DeferredRender>
    ),
    featured: (
        <section id="featured-products" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RailSectionHeader
              idPrefix="featured"
              eyebrow="New In"
              title="Featured Products"
              description=""
              editHref={isAdminUser ? "/admin/other/homepage?tab=featured" : undefined}
              editLabel="Edit featured"
              onPrev={() => scrollProductRail("prev")}
              onNext={() => scrollProductRail("next")}
              canPrev={canScrollPrev}
              canNext={canScrollNext}
              prevLabel="Previous featured products"
              nextLabel="Next featured products"
            />
          </div>

          <div className="mt-8 w-full px-4 sm:px-6 lg:px-8">
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
                          <div className="h-64 animate-pulse rounded-2xl border border-[#EDE8DE] bg-[#F4F2ED] md:h-72" />
                        }
                      >
                        <ProductCard product={product} compact showPremadeQuoteInside={false} />
                      </Suspense>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
                  {spotlightProducts.map((product, index) => (
                    <button
                      key={`spotlight-dot-${product.id}`}
                      type="button"
                      onClick={() => jumpToProduct(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeProductIndex
                          ? "w-6 bg-[#1F1A13]"
                          : "w-1.5 bg-[#DCD5C7] hover:bg-[#BDB5A4]"
                      }`}
                      aria-label={`Jump to featured product ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E8E2D6] bg-[#FBFAF7] px-4 py-8 text-center text-sm text-[#8A8172]">
                No featured products selected yet.
              </div>
            )}
          </div>
        </section>
    ),
    premade: (
        <section className="pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RailSectionHeader
              idPrefix="premade"
              eyebrow="Studio Collection"
              title="Pre-Made Designs"
              description="Professionally crafted design templates from our studio team, ready to customise in minutes."
              editHref={isAdminUser ? "/admin/other/homepage?tab=premade" : undefined}
              editLabel="Edit pre-made"
              onPrev={() => scrollPreMadeRail("prev")}
              onNext={() => scrollPreMadeRail("next")}
              canPrev={canScrollPreMadePrev}
              canNext={canScrollPreMadeNext}
              prevLabel="Previous pre-made designs"
              nextLabel="Next pre-made designs"
            />
          </div>
          <div className="mt-8 w-full px-4 sm:px-6 lg:px-8">
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
                          <div className="h-64 animate-pulse rounded-2xl border border-[#EDE8DE] bg-[#F4F2ED] md:h-72" />
                        }
                      >
                        <ProductCard product={product} compact showPremadeQuoteInside={false} />
                      </Suspense>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
                  {preMadeProducts.map((product, index) => (
                    <button
                      key={`premade-dot-${product.id}-${index}`}
                      type="button"
                      onClick={() => jumpToPreMade(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activePreMadeIndex
                          ? "w-6 bg-[#1F1A13]"
                          : "w-1.5 bg-[#DCD5C7] hover:bg-[#BDB5A4]"
                      }`}
                      aria-label={`Jump to pre-made design ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E8E2D6] bg-[#FBFAF7] px-4 py-8 text-center text-sm text-[#8A8172]">
                No pre-made designs selected yet.
              </div>
            )}
          </div>
        </section>
    ),
    reviews: (
        <section id="vinted-reviews" ref={reviewsSectionRef} className="pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center gap-2 text-[#007782]">
                <ContentImage
                  id="reviews.logo"
                  src="/images/vinted-logo.svg"
                  alt=""
                  aria-hidden="true"
                  label="Logo"
                  className="h-6 w-6"
                />
                <EditText id="reviews.brand" as="span" label="Name" className="text-lg font-semibold tracking-tight">
                  Vinted
                </EditText>
              </div>
              <EditText id="reviews.title" as="h2" label="Heading" className="mt-4 text-3xl font-bold tracking-tight text-[#1F1A13]">
                5-star feedback from Vinted buyers
              </EditText>
              <EditBlock id="reviews.stars" label="Stars" className="mt-4 flex gap-0.5 text-[#C9A24D]" ariaLabel="5 out of 5 stars" background={false}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </EditBlock>
            </motion.div>

            <div className="-mx-4 mt-10 space-y-4 overflow-x-clip sm:-mx-6 lg:-mx-8">
              {reviewRows.map((rowIds, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  className="flex w-max gap-4"
                  style={prefersReducedMotion ? undefined : { x: rowIndex === 0 ? reviewsRowOneX : reviewsRowTwoX }}
                >
                  {rowIds.map((id) => (
                    <ReviewCard key={id} id={id} review={DEFAULT_REVIEWS[id] ?? NEW_REVIEW} />
                  ))}
                </motion.div>
              ))}
            </div>

            <AddItemButton
              listId={REVIEWS_LIST}
              defaults={DEFAULT_REVIEW_IDS}
              label="Add a review"
              max={24}
              wrapperClassName="mt-6 flex justify-center"
            />
          </div>
        </section>
    ),
    trust: (
        <section className="pb-16 pt-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <EditText id="trust.title" as="h2" label="Heading" className="text-center text-2xl font-bold text-[#1F1A13] sm:text-3xl">
              Confidence in Every Order
            </EditText>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {trustIds.map((id) => (
                <TrustCard key={id} id={id} item={DEFAULT_TRUST[id] ?? NEW_TRUST} />
              ))}
            </div>
            <AddItemButton
              listId={TRUST_LIST}
              defaults={DEFAULT_TRUST_IDS}
              label="Add a benefit"
              max={6}
              wrapperClassName="mt-4 flex justify-center"
            />

            <EditBlock id="qa.box" label="Box" className="mt-14 rounded-2xl border border-[#E8DDBF] bg-white p-6 text-center sm:p-8">
              <EditBlock id="qa.pill" label="Label" className="inline-flex items-center gap-2 rounded-full border border-[#E8DDBF] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[#8A6D2B]">
                <CheckCircle2 className="h-5 w-5" />
                <EditText id="qa.badge" as="span" label="Label text">
                  Professional quality assurance
                </EditText>
              </EditBlock>
              <EditText id="qa.text" as="p" label="Paragraph" className="mx-auto mt-4 max-w-2xl text-sm text-[#5D4B2E] sm:text-base">
                Every product is reviewed before dispatch to ensure premium finishing, accurate customisation, and dependable consistency for your brand.
              </EditText>
            </EditBlock>
          </div>
        </section>
    ),
  };

  return (
    <Layout>
      <Head title="Welcome">
        <link rel="preload" as="image" href="/hero.webp" />
      </Head>

      <div className="flex flex-col" data-edit-scope>
        {sectionOrder.map((id) => (
          <EditSection
            key={id}
            id={id}
            orderClass={hasCustomOrder ? undefined : DEFAULT_ORDER_CLASSES[id as SectionId]}
            noBackground={id === "hero"}
            extra={id === "featured" || id === "premade" ? chooseProducts(id) : undefined}
          >
            {sections[id] ?? <BlankSection id={id} />}
          </EditSection>
        ))}
      </div>
    </Layout>
  );
}
