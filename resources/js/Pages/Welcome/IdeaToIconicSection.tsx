import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import StartProject from "./StartProject";
import { ContentImage, EditAction, EditText } from "@/Components/SiteEditor/primitives";
import { useEditMode, useHidden } from "@/Components/SiteEditor/store";

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

export default function IdeaToIconicSection() {
  const editing = useEditMode();
  const [index, setIndex] = useState(0);
  const [showConcept, setShowConcept] = useState(false);
  const [showModel, setShowModel] = useState(false);

  const [activePage, setActivePage] = useState<"none" | "startProject">("none");
  const buttonRemoved = useHidden("idea.cta1");

  useEffect(() => {
    let conceptTimer: ReturnType<typeof setTimeout>;
    let modelTimer: ReturnType<typeof setTimeout>;

    // While editing, hold still with every image of the chosen example showing.
    if (editing) {
      setShowConcept(true);
      setShowModel(true);
      return;
    }

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
  }, [editing]);

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

  /* ================= HERO SECTION ================= */

  return (
    <section className="w-full py-14 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        {/* LEFT SIDE */}
        <div className="relative z-10 text-center md:text-left">
          <EditText id="idea.title" as="h2" label="Heading" className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            From concept to something unforgettable
          </EditText>

          <EditText id="idea.body" as="p" label="Paragraph" className="mx-auto mt-6 max-w-lg text-gray-600 md:mx-0">
            We help ambitious ideas grow into refined digital products — designed with clarity, purpose, and impact.
          </EditText>

          {buttonRemoved ? null : (
            <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
              <EditAction
                id="idea.cta1"
                label="Start your project"
                onActivate={() => {
                  setActivePage("startProject");
                }}
                className="px-8 py-4 rounded-2xl bg-[#C9A24D] text-white font-semibold shadow-lg hover:opacity-90 transition"
              />
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="relative h-[640px] w-full sm:h-[700px] md:h-[660px]">
          {imageSets.map((set, i) => {
            const isActive = i === index;

            return (
              <div
                key={i}
                className={`${
                  editing && isActive ? "pointer-events-auto" : "pointer-events-none"
                } absolute inset-0 flex flex-col gap-5 transition-all duration-[350ms] ease-out ${
                  isActive ? "z-10 scale-100 opacity-100" : "scale-[0.99] opacity-0"
                }`}
              >
                {/* FINAL IMAGE (TOP) */}
                <div className="relative h-[74%] w-full overflow-hidden">
                  <ContentImage
                    id={`idea.s${i + 1}.final`}
                    src={set.final}
                    alt="Final product"
                    label="Main image"
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
                      <ContentImage
                        id={`idea.s${i + 1}.concept`}
                        src={set.concept}
                        alt="Design concept"
                        label="Design image"
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
                      <ContentImage
                        id={`idea.s${i + 1}.model`}
                        src={set.model}
                        alt="Real product"
                        label="Product image"
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

          {editing ? (
            <div
              data-editor-ui
              className="absolute -bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900 px-1.5 py-1 text-xs text-white shadow-lg"
            >
              <button
                type="button"
                data-edit-allow
                onClick={() => setIndex((prev) => (prev + imageSets.length - 1) % imageSets.length)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20"
                aria-label="Previous example"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1 font-medium">
                Example {index + 1} of {imageSets.length}
              </span>
              <button
                type="button"
                data-edit-allow
                onClick={() => setIndex((prev) => (prev + 1) % imageSets.length)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20"
                aria-label="Next example"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
