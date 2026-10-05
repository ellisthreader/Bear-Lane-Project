import { useMemo, useState } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import { useAdminSupport } from "@/Context/AdminSupportContext";

const categories = [
  { value: "general", label: "General" },
  { value: "orders", label: "Orders & Shipping" },
  { value: "returns", label: "Returns & Refunds" },
  { value: "account", label: "Account Management" },
  { value: "payments", label: "Payments & Billing" },
  { value: "technical", label: "Technical Support" },
  { value: "privacy", label: "Privacy & Security" },
];

const emptyForm = {
  title: "",
  category: "general",
  excerpt: "",
  body: "",
  is_published: true,
};

export default function ArticlesTab() {
  const { articles, createArticle, updateArticle, deleteArticle, saving } = useAdminSupport();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      }),
    [articles]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      if (!form.title.trim() || !form.body.trim()) {
        setError("Title and article body are required.");
        return;
      }

      if (editingId) {
        await updateArticle(editingId, form);
      } else {
        await createArticle(form);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save article.");
    }
  };

  const editArticle = (articleId: number) => {
    const article = articles.find((entry) => entry.id === articleId);
    if (!article || article.is_readonly) return;
    setEditingId(article.id);
    setForm({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt || "",
      body: article.body,
      is_published: article.is_published,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-[#E7DCC2] bg-[#FFFCF5] p-4">
        <h2 className="text-base font-semibold text-[#2A2215]">
          {editingId ? "Edit Help Article" : "New Help Article"}
        </h2>
        <p className="mt-1 text-xs text-[#75684E]">These articles appear in the Help Centre and search results.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
              placeholder="e.g. Delivery delays explained"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Excerpt</span>
            <input
              value={form.excerpt}
              onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
              placeholder="Short summary for cards and previews"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Body</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              rows={8}
              className="w-full rounded-xl border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
              placeholder="Write the full article content. Use blank lines to separate paragraphs."
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-[#564833]">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))}
              className="h-4 w-4 rounded border-[#D8C79F] text-[#B89443] focus:ring-[#B89443]"
            />
            Publish immediately
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-[#9A2F2F]">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Update Article" : "Add Article"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-[#E1D4B8] bg-white px-3 py-2.5 text-sm font-semibold text-[#5B4E38]"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        {sortedArticles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#DDCCA3] bg-[#FFFBF2] px-4 py-8 text-sm text-[#6B5A34]">
            No support articles yet. Create your first article on the left.
          </p>
        ) : null}

        {sortedArticles.map((article) => (
          <article key={article.id} className="rounded-2xl border border-[#E7DCC2] bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">{article.category}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#2A2215]">{article.title}</h3>
              </div>
              <div className="inline-flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    article.is_published
                      ? "border border-[#C8DDBA] bg-[#F2F8EE] text-[#2E6A2B]"
                      : "border border-[#E6D4AA] bg-[#FFF8E8] text-[#8A6D2B]"
                  }`}
                >
                  {article.is_published ? "Published" : "Draft"}
                </span>
                {article.is_readonly ? (
                  <span className="rounded-full border border-[#D9CFB6] bg-[#F8F4EA] px-2.5 py-1 text-xs font-semibold text-[#7A6B4A]">
                    Static
                  </span>
                ) : null}
              </div>
            </div>

            {article.excerpt ? <p className="mt-2 text-sm text-[#5E523D]">{article.excerpt}</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => editArticle(article.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E1D4B8] bg-[#FFFCF4] px-2.5 py-1.5 text-xs font-semibold text-[#5B4E38]"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => updateArticle(article.id, { is_published: !article.is_published })}
                className="rounded-lg border border-[#E1D4B8] bg-[#FFFCF4] px-2.5 py-1.5 text-xs font-semibold text-[#5B4E38]"
              >
                {article.is_published ? "Move to draft" : "Publish"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (article.is_readonly) return;
                  if (!confirm("Delete this article?")) return;
                  void deleteArticle(article.id);
                }}
                disabled={article.is_readonly}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E8C4BC] bg-[#FFF3F1] px-2.5 py-1.5 text-xs font-semibold text-[#8F2D22]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
