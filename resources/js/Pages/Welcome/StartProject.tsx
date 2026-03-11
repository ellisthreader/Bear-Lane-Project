import React from "react";
import { ArrowRight, Package, PenTool, Truck } from "lucide-react";
import { router } from "@inertiajs/react";

export default function StartProject() {
  const scrollTo = (id: string) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.get("/");
  };

  return (
    <div className="rounded-3xl border border-[#E8DDBF] bg-white p-6 sm:p-8 lg:p-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B08A2E]">
          Start Your Project
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1F1A13] sm:text-4xl">
          Three simple steps to launch your idea
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[#6A5530] sm:text-base">
          Follow the guided path below and jump straight into the most relevant part of the store.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-[#E8DDBF] bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(93,70,20,0.16)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D3A5] bg-[#FFF7E4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A5C1E]">
                  Step 1
                </span>
                <h3 className="mt-3 text-xl font-semibold text-[#2B2417]">Pick your product</h3>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6D3A5] bg-gradient-to-br from-[#FFF6DE] to-[#F3E2B6] text-[#7A5C12]">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[#6A5530]">
              Browse categories and choose the perfect base item for your design.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("shop-by-category")}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-4 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#F8E9C9]"
            >
              Browse categories
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-[#E8DDBF] bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(93,70,20,0.16)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D3A5] bg-[#FFF7E4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A5C1E]">
                  Step 2
                </span>
                <h3 className="mt-3 text-xl font-semibold text-[#2B2417]">Design</h3>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6D3A5] bg-gradient-to-br from-[#FFF6DE] to-[#F3E2B6] text-[#7A5C12]">
                <PenTool className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[#6A5530]">
              Upload artwork, add text, or create something fresh in our designer.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("featured-products")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1F1A12] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#372D1C]"
            >
              Choose a product
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-[#E8DDBF] bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(93,70,20,0.16)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D3A5] bg-[#FFF7E4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A5C1E]">
                  Step 3
                </span>
                <h3 className="mt-3 text-xl font-semibold text-[#2B2417]">Buy & receive</h3>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6D3A5] bg-gradient-to-br from-[#FFF6DE] to-[#F3E2B6] text-[#7A5C12]">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[#6A5530]">
              Review favourites, add to cart, and track delivery with confidence.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("featured-products")}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-4 py-2 text-xs font-semibold text-[#7B6530] transition hover:bg-[#F8E9C9]"
            >
              View featured picks
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
