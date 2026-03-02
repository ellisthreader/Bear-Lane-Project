import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCategoryFilters } from "../context/CategoryFiltersContext";
import { GenderValue, SortValue } from "../types";

type SectionKey = "sort" | "price" | "gender" | "rating" | "colour" | "size";

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "popular", label: "Most Popular" },
  { value: "new", label: "New In" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "rating", label: "Highest Rated" },
  { value: "sale", label: "On Sale" },
];

const RATING_OPTIONS: Array<{ value: 0 | 3 | 4; label: string }> = [
  { value: 0, label: "All ratings" },
  { value: 3, label: "3 stars & up" },
  { value: 4, label: "4 stars & up" },
];

const GENDER_LABELS: Record<GenderValue, string> = {
  men: "Men",
  women: "Women",
  kids: "Kids",
};

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full border border-[#B89443] ${
        active ? "bg-[#B89443]" : "bg-white"
      }`}
      aria-hidden
    />
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-[#E8DFC9] bg-[#FFF8E8] px-1.5 text-[11px] font-semibold text-[#7A5B1A]">
      {count}
    </span>
  );
}

function Section({
  id,
  title,
  selectedCount,
  openSection,
  onToggle,
  children,
}: {
  id: SectionKey;
  title: string;
  selectedCount: number;
  openSection: SectionKey | null;
  onToggle: (id: SectionKey) => void;
  children: React.ReactNode;
}) {
  const open = openSection === id;

  return (
    <div className="border-t border-[#EFE6D2] pt-3">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#2A241B]">{title}</span>
          {selectedCount > 0 ? <CountBadge count={selectedCount} /> : null}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#6D6452] transition ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className={`min-h-0 transform transition-transform duration-300 ${open ? "translate-y-0" : "-translate-y-2"}`}>
          <div className="mt-2 pb-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryFiltersSidebar() {
  const {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    selectedColours,
    selectedSizes,
    selectedGenders,
    minimumRating,
    setMinimumRating,
    colourOptions,
    sizeOptions,
    genderOptions,
    minAvailable,
    maxAvailable,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    toggleColour,
    toggleSize,
    toggleGender,
    sortCounts,
    ratingCounts,
    colourCounts,
    sizeCounts,
    genderCounts,
    resetFilters,
  } = useCategoryFilters();

  const [openSection, setOpenSection] = useState<SectionKey | null>("sort");

  const sliderMax = useMemo(() => Math.max(maxAvailable, 1), [maxAvailable]);
  const leftPercent = Math.min(100, Math.max(0, (minPrice / sliderMax) * 100));
  const rightPercent = Math.min(100, Math.max(0, (maxPrice / sliderMax) * 100));

  const sectionSelectedCounts: Record<SectionKey, number> = {
    sort: sortBy === "popular" ? 0 : 1,
    price: minPrice > minAvailable || maxPrice < maxAvailable ? 1 : 0,
    gender: selectedGenders.length,
    rating: minimumRating > 0 ? 1 : 0,
    colour: selectedColours.length,
    size: selectedSizes.length,
  };

  return (
    <aside className="h-fit lg:sticky lg:top-4 lg:w-[280px] lg:flex-shrink-0">
      <h2 className="mb-3 text-lg font-semibold text-[#2A241B]">Filters</h2>

      <div className="mb-4">
        <label htmlFor="search" className="mb-2 block text-sm font-medium text-[#4D463B]">
          Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="Search products"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-[#E8DFC9] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#B89443]"
        />
      </div>

      <Section
        id="sort"
        title="Sort by"
        selectedCount={sectionSelectedCounts.sort}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="space-y-1">
          {SORT_OPTIONS.map((option) => {
            const active = sortBy === option.value;
            const count = sortCounts[option.value] || 0;
            const disabled = count === 0;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => setSortBy(option.value)}
                className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-left text-sm transition ${
                  disabled
                    ? "cursor-not-allowed text-[#B7AE9C]"
                    : "text-[#373027] hover:bg-[#FAF7EF]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Dot active={active} />
                  {option.label}
                </span>
                <span className="text-xs text-[#7A705B]">({count})</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        id="price"
        title="Price range"
        selectedCount={sectionSelectedCounts.price}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="px-1">
          <div className="relative mt-2 h-8">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#EFE6D2]" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#C99B2E] to-[#E2BA62]"
              style={{ left: `${leftPercent}%`, width: `${Math.max(0, rightPercent - leftPercent)}%` }}
            />

            <input
              type="range"
              min={minAvailable}
              max={sliderMax}
              value={minPrice}
              onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice))}
              className="pointer-events-none absolute left-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#C99B2E] [&::-webkit-slider-thumb]:bg-[#FFF7E6]"
            />
            <input
              type="range"
              min={minAvailable}
              max={sliderMax}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))}
              className="pointer-events-none absolute left-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#C99B2E] [&::-webkit-slider-thumb]:bg-[#FFF7E6]"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-[#6D6452]">
            <span>£{minPrice}</span>
            <span>£{maxPrice}</span>
          </div>
        </div>
      </Section>

      <Section
        id="gender"
        title="Gender"
        selectedCount={sectionSelectedCounts.gender}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="space-y-1">
          {genderOptions.map((gender) => {
            const active = selectedGenders.includes(gender);
            const count = genderCounts[gender] || 0;
            const disabled = count === 0;
            return (
              <button
                key={gender}
                type="button"
                disabled={disabled}
                onClick={() => toggleGender(gender)}
                className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-left text-sm transition ${
                  disabled
                    ? "cursor-not-allowed text-[#B7AE9C]"
                    : "text-[#373027] hover:bg-[#FAF7EF]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Dot active={active} />
                  {GENDER_LABELS[gender]}
                </span>
                <span className="text-xs text-[#7A705B]">({count})</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        id="rating"
        title="Rating"
        selectedCount={sectionSelectedCounts.rating}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="space-y-1">
          {RATING_OPTIONS.map((option) => {
            const active = minimumRating === option.value;
            const count = ratingCounts[option.value] || 0;
            const disabled = count === 0;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => setMinimumRating(option.value)}
                className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-left text-sm transition ${
                  disabled
                    ? "cursor-not-allowed text-[#B7AE9C]"
                    : "text-[#373027] hover:bg-[#FAF7EF]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Dot active={active} />
                  {option.label}
                </span>
                <span className="text-xs text-[#7A705B]">({count})</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        id="colour"
        title="Colour"
        selectedCount={sectionSelectedCounts.colour}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="max-h-44 space-y-1 overflow-auto pr-1">
          {colourOptions.length === 0 ? (
            <p className="text-sm text-[#8C836F]">No colours found</p>
          ) : (
            colourOptions.map((colour) => {
              const active = selectedColours.includes(colour);
              const count = colourCounts[colour] || 0;
              const disabled = count === 0;
              return (
                <button
                  key={colour}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleColour(colour)}
                  className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-left text-sm transition ${
                    disabled
                      ? "cursor-not-allowed text-[#B7AE9C]"
                      : "text-[#373027] hover:bg-[#FAF7EF]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Dot active={active} />
                    {colour}
                  </span>
                  <span className="text-xs text-[#7A705B]">({count})</span>
                </button>
              );
            })
          )}
        </div>
      </Section>

      <Section
        id="size"
        title="Size"
        selectedCount={sectionSelectedCounts.size}
        openSection={openSection}
        onToggle={(id) => setOpenSection((prev) => (prev === id ? null : id))}
      >
        <div className="max-h-44 space-y-1 overflow-auto pr-1">
          {sizeOptions.length === 0 ? (
            <p className="text-sm text-[#8C836F]">No sizes found</p>
          ) : (
            sizeOptions.map((size) => {
              const active = selectedSizes.includes(size);
              const count = sizeCounts[size] || 0;
              const disabled = count === 0;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSize(size)}
                  className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-left text-sm transition ${
                    disabled
                      ? "cursor-not-allowed text-[#B7AE9C]"
                      : "text-[#373027] hover:bg-[#FAF7EF]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Dot active={active} />
                    {size}
                  </span>
                  <span className="text-xs text-[#7A705B]">({count})</span>
                </button>
              );
            })
          )}
        </div>
      </Section>

      <div className="border-t border-[#EFE6D2] pt-4">
        <button
          type="button"
          onClick={resetFilters}
          className="text-sm text-[#6D6452] underline underline-offset-2 transition hover:text-[#2A241B]"
        >
          Unselect all filters
        </button>
      </div>
    </aside>
  );
}
