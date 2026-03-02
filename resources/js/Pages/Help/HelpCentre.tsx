import { Link } from "@inertiajs/react";
import { ArrowRight, BadgeHelp, CreditCard, Lock, Package, RefreshCcw, Settings, Sparkles } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import HelpShell from "./components/HelpShell";
import HelpSearchBar from "./components/HelpSearchBar";
import { flattenHelpArticles, HELP_CATEGORIES } from "./data/helpContent";

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  orders: Package,
  returns: RefreshCcw,
  account: Settings,
  payments: CreditCard,
  technical: BadgeHelp,
  privacy: Lock,
};

type SupportArticle = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  body: string;
  published_at: string | null;
};

type HelpCentreProps = {
  support_articles?: SupportArticle[];
};

export default function HelpCentre({ support_articles = [] }: HelpCentreProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const articleIndex = useMemo(() => {
    const staticArticles = flattenHelpArticles().map((article) => ({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content.join(" "),
      categoryTitle: article.categoryTitle,
      link: article.link,
    }));

    const dynamicArticles = support_articles.map((article) => ({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.body,
      categoryTitle: "Support Team Article",
      link: `/help/articles/${article.slug}`,
    }));

    return [...dynamicArticles, ...staticArticles];
  }, [support_articles]);

  const quickResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return articleIndex
      .filter(
        (article) =>
          article.title.toLowerCase().includes(q) ||
          article.excerpt.toLowerCase().includes(q) ||
          article.content.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [articleIndex, searchQuery]);

  return (
    <HelpShell
      title="How can we help today?"
      eyebrow="Bear Lane Support"
      description="Explore support topics, find instant answers, or talk to our team. Everything is organised to get you from question to solution fast."
      showBackToHelp={false}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8C7749]">Search articles</p>
            <div className="relative">
              <HelpSearchBar className="max-w-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Quick filter topics in this page"
                className="mt-3 h-11 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-4 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
              />
            </div>
          </div>

          {searchQuery.trim() ? (
            <div className="mt-5 rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#221A10]">Quick Matches</h2>
              {quickResults.length === 0 ? (
                <p className="mt-2 text-sm text-[#6D624E]">
                  No direct matches here. Use the main search above to open full search results.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {quickResults.map((article) => (
                    <li key={article.link} className="rounded-xl border border-[#EFE6D2] bg-[#FFFCF5] px-4 py-3">
                      <Link href={article.link} className="text-sm font-semibold text-[#2B241A] hover:text-[#8B6B2A]">
                        {article.title}
                      </Link>
                      <p className="mt-1 text-xs text-[#7B6F58]">{article.categoryTitle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {HELP_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category.key];
              return (
                <Link
                  key={category.key}
                  href={category.route}
                  className="group rounded-2xl border border-[#E6DCC4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#CEAF6D] hover:shadow-md"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF4E2] text-[#956F24]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#21190F]">{category.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#61543F]">{category.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#8B6B2A]">
                    Open articles
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          {support_articles.length > 0 ? (
            <div className="mt-7 rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#221A10]">Latest from the Support Team</h2>
              <p className="mt-1 text-sm text-[#6A5E48]">
                Fresh help-centre updates published by the admin team.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {support_articles.slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/articles/${article.slug}`}
                    className="rounded-xl border border-[#EFE6D2] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D5BD86]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7445]">
                      {article.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#2B241A]">{article.title}</p>
                    <p className="mt-1 text-xs text-[#6F624D]">{article.excerpt || "Open article"}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8C7749]">Need direct help?</h2>

          <div className="mt-4 space-y-3">
            <Link
              href="/help/livechat"
              className="block rounded-xl border border-[#E9DFC9] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D9C08B]"
            >
              <p className="text-sm font-semibold text-[#2B241A]">Live Chat</p>
              <p className="mt-1 text-xs text-[#73664F]">Talk to support in real time.</p>
            </Link>

            <Link
              href="/support"
              className="block rounded-xl border border-[#E9DFC9] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D9C08B]"
            >
              <p className="text-sm font-semibold text-[#2B241A]">Send a Message</p>
              <p className="mt-1 text-xs text-[#73664F]">Get a detailed response by email.</p>
            </Link>

            <Link
              href="/faq"
              className="block rounded-xl border border-[#E9DFC9] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D9C08B]"
            >
              <p className="text-sm font-semibold text-[#2B241A]">Popular FAQs</p>
              <p className="mt-1 text-xs text-[#73664F]">Fast answers to common questions.</p>
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-[#E9DFC9] bg-gradient-to-br from-[#FFF9EC] to-[#F7EACC] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A5B1E]">
              <Sparkles className="h-4 w-4" />
              Best experience tip
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#6A593A]">
              Include your order number when contacting support so we can resolve your request faster.
            </p>
          </div>
        </aside>
      </div>
    </HelpShell>
  );
}
