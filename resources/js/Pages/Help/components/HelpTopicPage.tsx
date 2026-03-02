import { Link } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import HelpShell from "./HelpShell";
import HelpSearchBar from "./HelpSearchBar";
import HelpLinkedText from "./HelpLinkedText";
import { getHelpCategory, HelpCategoryKey } from "../data/helpContent";

type HelpTopicPageProps = {
  categoryKey: HelpCategoryKey;
};

export default function HelpTopicPage({ categoryKey }: HelpTopicPageProps) {
  const category = getHelpCategory(categoryKey);
  const [activeArticleId, setActiveArticleId] = useState(category.articles[0].id);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && category.articles.some((article) => article.id === hash)) {
      setActiveArticleId(hash);
    }
  }, [category.articles]);

  const activeArticle = useMemo(
    () => category.articles.find((article) => article.id === activeArticleId) || category.articles[0],
    [category.articles, activeArticleId]
  );

  const selectArticle = (id: string) => {
    setActiveArticleId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <HelpShell title={category.title} eyebrow="Help Centre" description={category.description}>
      <div className="mb-6 max-w-2xl">
        <HelpSearchBar />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#E7DBBF] bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#8C7749]">Articles</h2>
          <div className="space-y-2">
            {category.articles.map((article) => {
              const active = article.id === activeArticle.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => selectArticle(article.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-[#CBA65B] bg-[#FCF6E7]"
                      : "border-[#EFE6D2] bg-white hover:border-[#DDC79A] hover:bg-[#FFFDF7]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#2B241A]">{article.title}</p>
                  <p className="mt-1 text-xs text-[#796D54]">{article.excerpt}</p>
                </button>
              );
            })}
          </div>

          <Link
            href="/support"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#8B6B2A] transition hover:text-[#6E521D]"
          >
            Contact support
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>

        <article className="rounded-2xl border border-[#E7DBBF] bg-white px-6 py-6 shadow-sm md:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DBBF] bg-[#FFFCF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A7344]">
            <FileText className="h-3.5 w-3.5" />
            Article
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#20190F] md:text-3xl">{activeArticle.title}</h2>

          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[#4B3F2D]">
            {activeArticle.content.map((paragraph) => (
              <p key={paragraph}>
                <HelpLinkedText text={paragraph} />
              </p>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[#E8DEC9] bg-[#FAF5E8] px-4 py-3 text-sm text-[#5D503C]">
            Still stuck? Use <Link href="/help/livechat" className="font-semibold text-[#7B5E24] hover:underline">Live Chat</Link> or <Link href="/support" className="font-semibold text-[#7B5E24] hover:underline">send us a message</Link>.
          </div>
        </article>
      </div>
    </HelpShell>
  );
}
