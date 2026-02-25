import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import StartProject from "./StartProject";
import GetQuoteInstantly from "./Quote/GetQuoteInstantly";

export default function IdeaToIconicSection() {
  const imageSets = [
    {
      concept: "/images/Examples/Example1.png",
      model: "/images/Examples/Example2.png",
      final: "/images/Examples/Example3.png",
    },
    {
      concept: "/images/Examples/Example4.png",
      model: "/images/Examples/Example5.png",
      final: "/images/Examples/Example6.jpeg",
    },
    {
      concept: "/images/Examples/Example7.png",
      model: "/images/Examples/Example8.png",
      final: "/images/Examples/Example9.jpg",
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
      <div className="bg-[#ffffff] pt-16 pb-6 px-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActivePage("none")}
            className="mb-6 text-sm text-[#C9A24D] hover:underline"
          >
            ← Back
          </button>
          <GetQuoteInstantly />
        </div>
      </div>
    );
  }

  /* ================= HERO SECTION ================= */

  return (
    <section className="w-full bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* LEFT SIDE */}
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            From concept to something unforgettable
          </h2>

          <p className="mt-6 text-gray-600 max-w-lg">
            We help ambitious ideas grow into refined digital products — designed
            with clarity, purpose, and impact.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              onClick={() => setActivePage("startProject")}
              className="px-8 py-4 rounded-2xl bg-[#C9A24D] text-white font-semibold shadow-lg hover:opacity-90 transition"
            >
              Start your project
            </button>
            <button
              onClick={() => setActivePage("getQuote")}
              className="px-8 py-4 rounded-2xl border-2 border-[#C9A24D] text-[#C9A24D] font-semibold hover:bg-[#C9A24D] hover:text-white transition"
            >
              Get instant quote
            </button>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative w-full h-[380px] flex gap-6">
          {imageSets.map((set, i) => {
            const isActive = i === index;

            return (
              <div
                key={i}
                className={`absolute inset-0 flex gap-6 transition-opacity duration-500 ${
                  isActive ? "opacity-100 z-10" : "opacity-0"
                }`}
              >
                {/* LEFT STACK */}
                <div className="flex flex-col gap-4 w-[40%] relative">
                  {/* Concept */}
                  <div
                    className={`relative aspect-square rounded-2xl overflow-hidden shadow-md
                                transition-transform duration-700 ease-out
                                hover:scale-105 hover:z-20
                                ${
                                  showConcept && isActive
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 -translate-y-6"
                                }`}
                  >
                    <img
                      src={set.concept}
                      alt="Design concept"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Arrow */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2
                                top-[calc(44%+18px)]
                                text-[#C9A24D] z-20
                                transition-opacity duration-500
                                ${
                                  showConcept && showModel && isActive
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                  >
                    <ArrowRight size={28} className="rotate-90" />
                  </div>

                  {/* Model */}
                  <div
                    className={`relative aspect-square rounded-2xl overflow-hidden shadow-md
                                transition-transform duration-700 ease-out
                                hover:scale-105 hover:z-20
                                ${
                                  showModel && isActive
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 -translate-y-6"
                                }`}
                  >
                    <img
                      src={set.model}
                      alt="2D model"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* FINAL IMAGE */}
                <div className="relative w-[60%] rounded-3xl overflow-hidden shadow-xl">
                  <img
                    src={set.final}
                    alt="Final product"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
