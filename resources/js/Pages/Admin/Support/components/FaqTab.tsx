import { useMemo, useState } from "react";
import { MessageCircleReply, Trash2 } from "lucide-react";
import { useAdminSupport } from "@/Context/AdminSupportContext";

export default function FaqTab() {
  const { faqRequests, answerFaq, deleteFaq, saving } = useAdminSupport();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [visibility, setVisibility] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const pendingFaqs = useMemo(
    () =>
      faqRequests.filter((faq) => {
        if (faq.is_readonly) return false;
        if (faq.status === "pending") return true;
        const hasAnswer = Boolean((faq.answer || "").trim());
        return !hasAnswer;
      }),
    [faqRequests]
  );

  const sortedFaqs = useMemo(
    () =>
      [...pendingFaqs].sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
    [pendingFaqs]
  );

  const saveAnswer = async (faqId: number) => {
    const question = faqRequests.find((entry) => entry.id === faqId);
    if (!question || question.is_readonly) return;

    const answer = (answers[faqId] ?? question.answer ?? "").trim();
    if (!answer) {
      setError("Add an answer before publishing.");
      return;
    }

    setError(null);
    await answerFaq(faqId, {
      answer,
      is_public: visibility[faqId] ?? question.is_public,
      status: "answered",
    });
  };

  return (
    <div className="space-y-3">
      {sortedFaqs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#DDCCA3] bg-[#FFFBF2] px-4 py-8 text-sm text-[#6B5A34]">
          No unanswered FAQ requests right now. Answered items are counted in Published Answers.
        </p>
      ) : null}

      {sortedFaqs.map((faq) => {
        const answer = answers[faq.id] ?? faq.answer ?? "";
        const isPublic = visibility[faq.id] ?? faq.is_public;

        return (
          <section key={faq.id} className="rounded-2xl border border-[#E7DCC2] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">
                  {faq.status === "pending" ? "Pending request" : "Answered"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#2A2215]">{faq.question}</h2>
                <p className="mt-1 text-xs text-[#73664E]">Submitted by {faq.asked_by.name}</p>
              </div>
              <div className="inline-flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    faq.status === "pending"
                      ? "border border-[#E6D4AA] bg-[#FFF8E8] text-[#8A6D2B]"
                      : "border border-[#C8DDBA] bg-[#F2F8EE] text-[#2E6A2B]"
                  }`}
                >
                  {faq.status}
                </span>
                {faq.is_readonly ? (
                  <span className="rounded-full border border-[#D9CFB6] bg-[#F8F4EA] px-2.5 py-1 text-xs font-semibold text-[#7A6B4A]">
                    Static
                  </span>
                ) : null}
              </div>
            </div>

            {faq.details ? <p className="mt-2 text-sm text-[#5D503B]">{faq.details}</p> : null}

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">
                Admin answer
              </label>
              <textarea
                value={answer}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [faq.id]: event.target.value }))
                }
                disabled={faq.is_readonly}
                rows={4}
                className="w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                placeholder="Type the answer that should appear on the FAQ page."
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-[#5B4E38]">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(event) =>
                    setVisibility((prev) => ({ ...prev, [faq.id]: event.target.checked }))
                  }
                  disabled={faq.is_readonly}
                  className="h-4 w-4 rounded border-[#D8C79F] text-[#B89443] focus:ring-[#B89443]"
                />
                Show on public FAQ page
              </label>
              <button
                type="button"
                disabled={saving || faq.is_readonly}
                onClick={() => {
                  void saveAnswer(faq.id);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
              >
                <MessageCircleReply className="h-4 w-4" />
                Save Answer
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (!confirm("Delete this FAQ entry?")) return;
                  void deleteFaq(faq.id);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5C3BB] bg-[#FFF3F1] px-4 py-2.5 text-sm font-semibold text-[#8F2D22] transition hover:bg-[#FFE9E5] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete FAQ
              </button>
            </div>
          </section>
        );
      })}

      {error ? <p className="text-sm font-medium text-[#9A2F2F]">{error}</p> : null}
    </div>
  );
}
