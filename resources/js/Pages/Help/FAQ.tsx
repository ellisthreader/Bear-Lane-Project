import { Link, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import HelpShell from "./components/HelpShell";
import HelpSearchBar from "./components/HelpSearchBar";
import HelpLinkedText from "./components/HelpLinkedText";
import { HELP_FAQS } from "./data/helpContent";

export default function FAQ() {
  const page = usePage<{
    auth?: { user?: { id?: number } };
    community_faqs?: Array<{ id: number; question: string; answer: string }>;
  }>();
  const community_faqs = page.props.community_faqs || [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isSignedIn = Boolean(page.props.auth?.user?.id);
  const [question, setQuestion] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allFaqs = useMemo(
    () => [
      ...community_faqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      })),
      ...HELP_FAQS,
    ],
    [community_faqs]
  );

  const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  const submitFaqRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setSubmitError("Please enter your FAQ request.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch("/help/faq-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          details: details.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errors = payload?.errors as Record<string, string[]> | undefined;
        const firstError =
          errors?.question?.[0] ||
          errors?.details?.[0] ||
          "Unable to submit your request right now. Please try again.";
        throw new Error(firstError);
      }

      setQuestion("");
      setDetails("");
      setSubmitMessage("Thanks — your FAQ request has been submitted.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HelpShell
      title="Frequently Asked Questions"
      eyebrow="Help Centre"
      description="Quick answers to the questions we receive most often."
    >
      <div className="max-w-3xl">
        <HelpSearchBar placeholder="Search all help content" />
      </div>

      <div className="mt-6 space-y-3">
        {allFaqs.map((faq, index) => {
          const open = openIndex === index;
          return (
            <section key={`${faq.question}-${index}`} className="overflow-hidden rounded-2xl border border-[#E6DCC4] bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <h2 className="text-base font-semibold text-[#241C12]">{faq.question}</h2>
                <ChevronDown className={`h-5 w-5 text-[#8D7950] transition ${open ? "rotate-180" : ""}`} />
              </button>

              <div
                className={`grid transition-all duration-300 ${
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0">
                  <p className="border-t border-[#EFE6D2] px-5 py-4 text-sm leading-relaxed text-[#5A4D38]">
                    <HelpLinkedText text={faq.answer} />
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl border border-[#E6DCC4] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#241C12]">Submit an FAQ request</h2>
        <p className="mt-1 text-sm text-[#6A5E48]">
          Tell us what question you would like added to the FAQ.
        </p>

        {isSignedIn ? (
          <form onSubmit={submitFaqRequest} className="mt-4 space-y-3">
            <div>
              <label htmlFor="faq-question" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7A6D52]">
                FAQ Question
              </label>
              <input
                id="faq-question"
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Example: Do you offer next-day delivery?"
                className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
              />
            </div>

            <div>
              <label htmlFor="faq-details" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7A6D52]">
                Additional details (optional)
              </label>
              <textarea
                id="faq-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                placeholder="Add context or why this would help customers."
                className="w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 py-2 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
              />
            </div>

            {submitMessage ? (
              <p className="text-sm font-medium text-[#4C7A32]">{submitMessage}</p>
            ) : null}
            {submitError ? (
              <p className="text-sm font-medium text-[#9A2F2F]">{submitError}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#B89443] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit FAQ request"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-[#6A5E48]">
            Please{" "}
            <Link href="/login" className="font-semibold text-[#7B5E24] hover:underline">
              sign in
            </Link>{" "}
            to submit an FAQ request.
          </p>
        )}
      </section>
    </HelpShell>
  );
}
