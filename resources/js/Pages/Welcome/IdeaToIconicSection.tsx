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
    let conceptTimer: ReturnType<typeof setTimeout>;
    let modelTimer: ReturnType<typeof setTimeout>;

    const scheduleReveals = () => {
      clearTimeout(conceptTimer);
      clearTimeout(modelTimer);
      setShowConcept(false);
      setShowModel(false);
      conceptTimer = setTimeout(() => setShowConcept(true), 300);
      modelTimer = setTimeout(() => setShowModel(true), 650);
    };

    scheduleReveals();

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % imageSets.length);
      scheduleReveals();
    }, 6000);

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
    if (quoteTab === "specialist" || quoteTab === "artist" || quoteTab === "instant" || invoiceRef) {
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
        <div className="relative h-[640px] w-full sm:h-[700px] md:h-[660px]">
          {imageSets.map((set, i) => {
            const isActive = i === index;

            return (
              <div
                key={i}
                className={`pointer-events-none absolute inset-0 flex flex-col gap-5 transition-all duration-[350ms] ease-out ${
                  isActive ? "z-10 scale-100 opacity-100" : "scale-[0.99] opacity-0"
                }`}
              >
                {/* FINAL IMAGE (TOP) */}
                <div className="relative h-[74%] w-full overflow-hidden">
                  <img
                    src={set.final}
                    alt="Final product"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full rounded-3xl object-contain"
                  />
                </div>

                {/* SWITCH PREVIEW ROW */}
                <div className="relative h-[26%]">
                  <div className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center gap-5">
                    {/* Design */}
                    <div
                      className={`relative h-full overflow-hidden rounded-2xl transition-all duration-[400ms] ease-out ${
                        showConcept && isActive
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-2 opacity-0"
                      }`}
                    >
                      <img
                        src={set.concept}
                        alt="Design concept"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Arrow */}
                    <div
                      className={`flex items-center justify-center transition-all duration-300 ease-out ${
                        showConcept && showModel && isActive ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <ArrowRight size={24} className="text-[#A77C22]" strokeWidth={2} />
                    </div>

                    {/* Real Product */}
                    <div
                      className={`relative h-full overflow-hidden rounded-2xl transition-all duration-[400ms] ease-out ${
                        showModel && isActive
                          ? "translate-x-0 opacity-100"
                          : "translate-x-2 opacity-0"
                      }`}
                    >
                      <img
                        src={set.model}
                        alt="Real product"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
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
