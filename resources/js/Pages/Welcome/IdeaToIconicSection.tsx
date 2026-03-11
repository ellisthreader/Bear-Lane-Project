import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import StartProject from "./StartProject";
import GetQuoteInstantly from "./Quote/GetQuoteInstantly";

export default function IdeaToIconicSection() {
  const imageSets = [
    {
      concept: "/images/Examples/Example1.webp",
      model: "/images/Examples/Example2.webp",
      final: "/images/Examples/Example3.webp",
    },
    {
      concept: "/images/Examples/Example4.webp",
      model: "/images/Examples/Example5.webp",
      final: "/images/Examples/Example6.webp",
    },
    {
      concept: "/images/Examples/Example7.webp",
      model: "/images/Examples/Example8.webp",
      final: "/images/Examples/Example9.webp",
    },
  ];

  const [index, setIndex] = useState(0);
  const [showConcept, setShowConcept] = useState(false);
  const [showModel, setShowModel] = useState(false);

  const [activePage, setActivePage] = useState<
    "none" | "startProject" | "getQuote"
  >("none");

  useEffect(() => {
    setShowConcept(false);
    setShowModel(false);

    const conceptTimer = setTimeout(() => setShowConcept(true), 1000);
    const modelTimer = setTimeout(() => setShowModel(true), 2000);

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % imageSets.length);
      setShowConcept(false);
      setShowModel(false);
      setTimeout(() => setShowConcept(true), 1000);
      setTimeout(() => setShowModel(true), 2000);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(conceptTimer);
      clearTimeout(modelTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const quoteTab = params.get("quote_tab");
    const invoiceRef = params.get("invoice_ref");
    if (quoteTab === "artist" || quoteTab === "instant" || invoiceRef) {
      setActivePage("getQuote");
    }
  }, []);

  /* ================= FULL PAGE VIEWS ================= */

  if (activePage === "startProject") {
    return (
      <div className="bg-[#ffffff] pt-16 pb-6 px-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActivePage("none")}
            className="mb-6 text-sm text-[#C9A24D] hover:underline"
          >
            ← Back
          </button>
          <StartProject />
        </div>
      </div>
    );
  }

  if (activePage === "getQuote") {
    return (
      <div className="bg-[#ffffff] pt-10 pb-0 px-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActivePage("none")}
            className="mb-6 text-sm text-[#C9A24D] hover:underline"
          >
            ← Back
          </button>
          <GetQuoteInstantly embedded />
        </div>
      </div>
    );
  }

  /* ================= HERO SECTION ================= */

  return (
    <section className="w-full bg-white py-14 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        {/* LEFT SIDE */}
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            From concept to something unforgettable
          </h2>

          <p className="mx-auto mt-6 max-w-lg text-gray-600 md:mx-0">
            We help ambitious ideas grow into refined digital products — designed
            with clarity, purpose, and impact.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
            <button
              type="button"
              onClick={() => {
                setActivePage("startProject");
                requestAnimationFrame(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                });
              }}
              className="px-8 py-4 rounded-2xl bg-[#C9A24D] text-white font-semibold shadow-lg hover:opacity-90 transition"
            >
              Start your project
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const url = "/?quote_tab=instant#get-quote-instantly";
                  window.history.replaceState({}, "", url);
                }
                setActivePage("getQuote");
                requestAnimationFrame(() => {
                  const target = document.getElementById("get-quote-instantly");
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                });
              }}
              className="px-8 py-4 rounded-2xl border-2 border-[#C9A24D] text-[#C9A24D] font-semibold hover:bg-[#C9A24D] hover:text-white transition"
            >
              Get instant quote
            </button>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative h-[500px] w-full sm:h-[560px] md:h-[520px]">
          {imageSets.map((set, i) => {
            const isActive = i === index;

            return (
              <div
                key={i}
                className={`absolute inset-0 flex flex-col gap-4 transition-opacity duration-500 ${
                  isActive ? "opacity-100 z-10" : "opacity-0"
                }`}
              >
                {/* FINAL IMAGE (TOP) */}
                <div className="relative h-[68%] w-full overflow-hidden rounded-3xl shadow-xl">
                  <img
                    src={set.final}
                    alt="Final product"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5B461A]">
                    Final Image
                  </span>
                </div>

                {/* SWITCH PREVIEW ROW */}
                <div className="relative h-[32%] rounded-2xl border border-[#E7DCC2] bg-white p-3 shadow-sm">
                  <div className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center gap-3">
                    {/* Design */}
                    <div
                      className={`relative h-full overflow-hidden rounded-xl border border-[#E6DDC7] shadow-md transition-all duration-700 ease-out ${
                        showConcept && isActive
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-4 opacity-0"
                      }`}
                    >
                      <img
                        src={set.concept}
                        alt="Design concept"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2F2414]">
                        Design
                      </span>
                    </div>

                    {/* Arrow */}
                    <div
                      className={`flex items-center justify-center transition-opacity duration-500 ${
                        showConcept && showModel && isActive ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#DECFA8] bg-gradient-to-br from-[#FFF7E2] to-[#F4E2B2] shadow-[0_8px_18px_rgba(120,88,26,0.18)]">
                        <ArrowRight size={20} className="text-[#7A5D20]" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Real Product */}
                    <div
                      className={`relative h-full overflow-hidden rounded-xl border border-[#E6DDC7] shadow-md transition-all duration-700 ease-out ${
                        showModel && isActive
                          ? "translate-x-0 opacity-100"
                          : "translate-x-4 opacity-0"
                      }`}
                    >
                      <img
                        src={set.model}
                        alt="Real product"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2F2414]">
                        Real Product
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
