import React from "react";

const steps = [
  {
    number: "1",
    title: "Pick a Product",
    description:
      "Choose from our wide variety of high-quality products that match your style, needs, or brand identity.",
    image: "/images/steps/Step1.png",
  },
  {
    number: "2",
    title: "Start Designing",
    description:
      "Use our custom design canvas to upload your artwork or create a unique design from scratch.",
    image: "/images/steps/Step2.png",
  },
  {
    number: "3",
    title: "Customise Endlessly",
    description:
      "Adjust colours, fonts, sizes, and add clipart to perfectly reflect your idea or brand.",
    image: "/images/steps/Step3.png",
  },
  {
    number: "4",
    title: "Submit Your Design",
    description:
      "Our professional team reviews your design, clarifies any details, and ensures 100% accuracy before production.",
    image: "/images/steps/Step4.png",
  },
  {
    number: "5",
    title: "Receive Your Product",
    description:
      "Once approved, we ship your product quickly, delivering your custom creation with top-notch quality.",
    image: "/images/steps/Step5.png",
  },
];

export default function StackedScrollCards() {
  return (
    <section className="bg-white px-4 py-20">
      <h2 className="mb-20 text-center text-[2.75rem] font-semibold tracking-tight">
        How It Works
      </h2>

      <div className="mx-auto max-w-[1200px] space-y-8">
        {steps.map((step, idx) => (
          <article
            key={idx}
            className="rounded-[22px] border border-[#E8DCC0] bg-[#FCFAF5] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.08)] md:p-8"
          >
            <div
              className={`flex flex-col items-center gap-10 text-center md:flex-row md:text-left ${
                idx % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] md:w-1/2">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex w-full flex-col items-center md:w-1/2 md:items-start">
                <span className="mb-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-[#f8e7a1] via-[#c9a24d] to-[#8f6b1f] text-lg font-bold text-white shadow-[0_12px_30px_rgba(201,162,77,0.45)]">
                  {step.number}
                </span>

                <h3 className="mb-4 text-[1.9rem] font-semibold leading-tight">
                  {step.title}
                </h3>

                <p className="max-w-xl text-[1.08rem] leading-relaxed text-[#5E4F34]">
                  {step.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
