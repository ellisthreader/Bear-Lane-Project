import { Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { ReactNode } from "react";

type RailArrowProps = {
  direction: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
};

function RailArrow({ direction, label, disabled, onClick }: RailArrowProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E2D6] bg-white text-[#1F1A13] transition hover:border-[#1F1A13] disabled:cursor-not-allowed disabled:border-[#EFEBE2] disabled:text-[#C6BFB1]"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

type RailSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  editHref?: string;
  editLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  prevLabel: string;
  nextLabel: string;
};

export default function RailSectionHeader({
  eyebrow,
  title,
  description,
  editHref,
  editLabel = "Edit",
  onPrev,
  onNext,
  canPrev,
  canNext,
  prevLabel,
  nextLabel,
}: RailSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9A8F7B]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1F1A13] md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-[#6A6252]">{description}</p>
        ) : null}
        {editHref ? (
          <Link
            href={editHref}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#6A6252] underline decoration-[#DCD5C7] decoration-1 underline-offset-4 transition hover:text-[#1F1A13] hover:decoration-[#1F1A13]"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            {editLabel}
          </Link>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <RailArrow direction="prev" label={prevLabel} disabled={!canPrev} onClick={onPrev} />
        <RailArrow direction="next" label={nextLabel} disabled={!canNext} onClick={onNext} />
      </div>
    </div>
  );
}
