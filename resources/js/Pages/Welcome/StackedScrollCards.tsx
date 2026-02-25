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
    title: "Customize Endlessly",
    description:
      "Adjust colors, fonts, sizes, and add clipart to perfectly reflect your idea or brand.",
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
    <section className="bg-white px-4 py-28">
      <h2 className="mb-20 text-center text-[2.75rem] font-semibold tracking-tight">
        How It Works
      </h2>

      <div className="relative mx-auto max-w-[1400px] space-y-10">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="sticky rounded-[22px] bg-[#ededed] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
            style={{ top: `${6 + idx * 2}rem` }}
          >
            <div className="flex items-center gap-12 md:flex-row flex-col md:text-left text-center">
              {/* Image */}
              <div className="relative w-full md:w-1/2 aspect-[4/3] overflow-hidden rounded-[16px]">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="relative w-full md:w-1/2 pt-12 flex flex-col items-center md:items-start">
                {/* Number badge */}
                <span className="absolute -top-10 left-0 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-[#f8e7a1] via-[#c9a24d] to-[#8f6b1f] text-lg font-bold text-white shadow-[0_12px_30px_rgba(201,162,77,0.45)]">
                  {step.number}
                </span>

                <h3 className="mb-4 text-[1.9rem] font-semibold leading-tight">
                  {step.title}
                </h3>

                <p className="max-w-xl text-[1.08rem] leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
