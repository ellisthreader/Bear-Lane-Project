import { router } from "@inertiajs/react";
import { Search } from "lucide-react";
import { useState } from "react";

type HelpSearchBarProps = {
  initialValue?: string;
  placeholder?: string;
  className?: string;
};

export default function HelpSearchBar({
  initialValue = "",
  placeholder = "Search articles, orders, refunds, billing...",
  className = "",
}: HelpSearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.get("/help/search", { q });
  };

  return (
    <form onSubmit={submit} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#93805A]" />
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#E1D4B8] bg-white pl-12 pr-28 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-[#B89443] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#A58335]"
      >
        Search
      </button>
    </form>
  );
}
