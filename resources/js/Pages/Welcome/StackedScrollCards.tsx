import React from "react";
import { AddItemButton, ItemControls } from "@/Components/SiteEditor/controls";
import { ContentImage, cx, EditBlock, EditText, useLook } from "@/Components/SiteEditor/primitives";
import { itemKey, useEditMode, useHidden, useVisibleIds } from "@/Components/SiteEditor/store";

const LIST = "how.steps";

type Step = { title: string; description: string; image: string };

const DEFAULT_STEPS: Record<string, Step> = {
  "1": {
    title: "Pick a Product",
    description:
      "Choose from our wide variety of high-quality products that match your style, needs, or brand identity.",
    image: "/images/steps/Step1.webp",
  },
  "2": {
    title: "Start Designing",
    description:
      "Use our custom design canvas to upload your artwork or create a unique design from scratch.",
    image: "/images/steps/Step2.webp",
  },
  "3": {
    title: "Customise Endlessly",
    description:
      "Adjust colours, fonts, sizes, and add clipart to perfectly reflect your idea or brand.",
    image: "/images/steps/Step3.webp",
  },
  "4": {
    title: "Submit Your Design",
    description:
      "Our professional team reviews your design, clarifies any details, and ensures 100% accuracy before production.",
    image: "/images/steps/Step4.webp",
  },
  "5": {
    title: "Receive Your Product",
    description:
      "Once approved, we ship your product quickly, delivering your custom creation with top-notch quality.",
    image: "/images/steps/Step5.webp",
  },
};

const DEFAULT_IDS = Object.keys(DEFAULT_STEPS);

/** What a step the owner just added starts with. */
const NEW_STEP: Step = {
  title: "New step",
  description: "Describe this step in a sentence or two.",
  image: "/images/placeholder.jpg",
};

export default function StackedScrollCards() {
  const ids = useVisibleIds(LIST, DEFAULT_IDS);

  return (
    <section className="px-4 py-20">
      <EditText id="how.title" as="h2" label="Heading" className="mb-20 text-center text-[2.75rem] font-semibold tracking-tight">
        How It Works
      </EditText>

      <div className="mx-auto max-w-[1200px] space-y-8">
        {ids.map((id, idx) => (
          <StepCard key={id} id={id} number={idx + 1} step={DEFAULT_STEPS[id] ?? NEW_STEP} reverse={idx % 2 === 1} />
        ))}
      </div>

      <AddItemButton listId={LIST} defaults={DEFAULT_IDS} label="Add a step" max={10} wrapperClassName="mt-8 flex justify-center" />
    </section>
  );
}

function StepCard({ id, number, step, reverse }: { id: string; number: number; step: Step; reverse: boolean }) {
  const editing = useEditMode();
  const cardId = itemKey(LIST, id, "card");
  const imageId = itemKey(LIST, id, "image");
  const look = useLook(cardId);
  // A step whose picture was deleted gives the whole width to its words.
  const noImage = useHidden(imageId) && !editing;

  return (
    <article
      className={cx(
        "group/item relative rounded-[22px] border border-[#E8DCC0] bg-[#FCFAF5] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.08)] md:p-8",
        look.className,
      )}
      style={look.style}
    >
      <ItemControls listId={LIST} itemId={id} defaults={DEFAULT_IDS} axis="y" styleId={cardId} noun="step" />

      <div
        className={`flex flex-col items-center gap-10 text-center md:flex-row md:text-left ${
          reverse ? "md:flex-row-reverse" : ""
        }`}
      >
        {noImage ? null : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] md:w-1/2">
            <ContentImage
              id={imageId}
              src={step.image}
              alt={step.title}
              label="Step picture"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className={cx("flex w-full flex-col items-center", noImage ? "md:items-center md:text-center" : "md:w-1/2 md:items-start")}>
          <EditBlock
            id={itemKey(LIST, id, "badge")}
            label="Number badge"
            className="mb-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-[#f8e7a1] via-[#c9a24d] to-[#8f6b1f] text-lg font-bold text-white shadow-[0_12px_30px_rgba(201,162,77,0.45)]"
          >
            {number}
          </EditBlock>

          <EditText id={itemKey(LIST, id, "title")} as="h3" label="Heading" className="mb-4 text-[1.9rem] font-semibold leading-tight">
            {step.title}
          </EditText>

          <EditText
            id={itemKey(LIST, id, "description")}
            as="p"
            label="Paragraph"
            className="max-w-xl text-[1.08rem] leading-relaxed text-[#5E4F34]"
          >
            {step.description}
          </EditText>
        </div>
      </div>
    </article>
  );
}
