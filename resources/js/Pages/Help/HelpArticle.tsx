import { Link, usePage } from "@inertiajs/react";
import { ArrowRight, FileText } from "lucide-react";
import HelpShell from "./components/HelpShell";
import HelpLinkedText from "./components/HelpLinkedText";

type Article = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  body: string;
  published_at: string | null;
};

export default function HelpArticle() {
  const { article } = usePage<{ article: Article }>().props;
  const paragraphs = article.body
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return (
    <HelpShell
      title={article.title}
      eyebrow="Help Centre Article"
      description={article.excerpt || "Read this support article for detailed guidance."}
    >
      <article className="rounded-2xl border border-[#E7DBBF] bg-white px-6 py-6 shadow-sm md:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DBBF] bg-[#FFFCF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A7344]">
          <FileText className="h-3.5 w-3.5" />
          {article.category}
        </div>

        {article.published_at ? (
          <p className="mt-3 text-xs text-[#7E715A]">
            Published {new Date(article.published_at).toLocaleDateString()}
          </p>
        ) : null}

        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[#4B3F2D]">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>
              <HelpLinkedText text={paragraph} />
            </p>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-[#E8DEC9] bg-[#FAF5E8] px-4 py-3 text-sm text-[#5D503C]">
          Need more help? Use{" "}
          <Link href="/help/livechat" className="font-semibold text-[#7B5E24] hover:underline">
            Live Chat
          </Link>{" "}
          or{" "}
          <Link href="/support" className="font-semibold text-[#7B5E24] hover:underline">
            send us a message
          </Link>
          .
        </div>

        <Link
          href="/help"
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8B6B2A] hover:text-[#6E521D]"
        >
          Back to Help Centre
          <ArrowRight className="h-4 w-4" />
        </Link>
      </article>
    </HelpShell>
  );
}
