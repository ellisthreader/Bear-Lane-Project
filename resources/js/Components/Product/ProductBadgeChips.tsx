import React from "react";

type ProductBadgeChipsProps = {
  badges?: string[] | null;
  className?: string;
  isPreMade?: boolean;
  maxVisible?: number;
};

const BADGE_STYLE_MAP: Record<string, string> = {
  "Pre Made Product": "border-[#D7B25E] bg-[#FFF4D8] text-[#7A5814]",
  "Best Seller": "border-[#D7B25E] bg-[#FFF4D8] text-[#7A5814]",
  "Highest Rated": "border-[#B6C7E9] bg-[#EEF4FF] text-[#1E3A8A]",
  "New In": "border-[#B8DDC4] bg-[#ECFDF3] text-[#166534]",
};

const normalizeBadges = (badges?: string[] | null): string[] => {
  if (!Array.isArray(badges)) return [];

  return badges
    .map((badge) => String(badge || "").trim())
    .filter((badge) => badge.length > 0)
    .filter((badge, index, items) => items.indexOf(badge) === index);
};

export default function ProductBadgeChips({
  badges,
  className = "",
  isPreMade = false,
  maxVisible = 4,
}: ProductBadgeChipsProps) {
  const normalized = normalizeBadges([
    ...(isPreMade ? ["Pre Made Product"] : []),
    ...normalizeBadges(badges),
  ]).slice(0, Math.max(1, maxVisible));
  if (normalized.length === 0) return null;

  return (
    <div className={`pointer-events-none flex max-w-[84%] flex-col items-start gap-1 ${className}`.trim()}>
      {normalized.map((badge) => (
        <span
          key={badge}
          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] shadow-sm ${
            BADGE_STYLE_MAP[badge] ?? "border-[#D7BE84] bg-[#FFF9EA] text-[#6A5528]"
          }`}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
