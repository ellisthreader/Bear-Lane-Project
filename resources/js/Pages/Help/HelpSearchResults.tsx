import { Link, usePage } from "@inertiajs/react";
import { ArrowRight } from "lucide-react";
import HelpShell from "./components/HelpShell";
import HelpSearchBar from "./components/HelpSearchBar";

export default function HelpSearchResults() {
  const { q, support_articles = [] } = usePage<{
    q?: string;
    support_articles?: Array<{
      id: number;
      title: string;
      slug: string;
      category: string;
      excerpt: string | null;
      body: string;
    }>;
  }>().props;
  const searchQuery = (q || "").trim().toLowerCase();

  const results = support_articles
    .filter((article) => {
      if (!searchQuery) return false;
      return (
        article.title.toLowerCase().includes(searchQuery) ||
        (article.excerpt || "").toLowerCase().includes(searchQuery) ||
        article.body.toLowerCase().includes(searchQuery)
      );
    })
    .map((article) => ({
      link: `/help/articles/${article.slug}`,
      title: article.title,
      excerpt: article.excerpt || "",
      categoryTitle: `Support Team: ${article.category}`,
    }));

  return (
    <HelpShell
      title={q ? `Search Results for "${q}"` : "Search Help Articles"}
      eyebrow="Help Centre"
      description="Use specific terms like delivery, refund, tracking, invoice, account or password for best results."
    >
      <div className="max-w-3xl">
        <HelpSearchBar initialValue={q || ""} />
      </div>

      <div className="mt-6 rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm">
        {results.length > 0 ? (
          <ul className="space-y-3">
            {results.map((result) => (
              <li key={result.link} className="rounded-xl border border-[#EFE6D2] bg-[#FFFCF5] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7445]">{result.categoryTitle}</p>
                <Link href={result.link} className="mt-1 block text-sm font-semibold text-[#2C241A] hover:text-[#8B6B2A]">
                  {result.title}
                </Link>
                <p className="mt-1 text-xs text-[#6F624D]">{result.excerpt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-[#DCCBA1] bg-[#FFF9EC] px-4 py-6 text-center">
            <p className="text-sm font-medium text-[#5D503B]">No direct matches found.</p>
            <p className="mt-1 text-xs text-[#7D7059]">Try broader keywords or browse categories below.</p>
            <Link href="/help" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#8B6B2A] hover:underline">
              Back to Help Centre
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </HelpShell>
  );
}
