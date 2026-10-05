import { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { LifeBuoy, Mail, MessageCircle, SendHorizonal } from "lucide-react";
import HelpShell from "./components/HelpShell";
import HelpSearchBar from "./components/HelpSearchBar";
import { executeRecaptcha } from "@/Utils/recaptcha";

export default function Support() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSubmitted(false);
    setError(null);
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(false);
    setError(null);
    setSubmitting(true);

    try {
      const token = await executeRecaptcha("support_message");
      const response = await fetch("/support/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN":
            document.querySelector('meta[name=\"csrf-token\"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({
          ...form,
          recaptcha_token: token,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstValidationError = payload?.errors
          ? Object.values(payload.errors).flat()?.[0]
          : null;
        throw new Error(
          (typeof firstValidationError === "string" ? firstValidationError : null) ||
            (typeof payload?.message === "string" ? payload.message : null) ||
            "Unable to send your message right now."
        );
      }

      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send your message right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head title="Support" />
      <HelpShell
        title="Contact Support"
        eyebrow="Help Centre"
        description="Send us your question and we will get back to you as quickly as possible."
      >
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#E7DBBF] bg-white p-5 shadow-sm lg:sticky lg:top-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8C7749]">Support options</h2>

            <div className="mt-4 space-y-3">
              <a
                href="mailto:support@bearlane.co.uk"
                className="flex items-start gap-3 rounded-xl border border-[#EDE3CE] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D8BE86]"
              >
                <Mail className="mt-0.5 h-4 w-4 text-[#8B6B2A]" />
                <div>
                  <p className="text-sm font-semibold text-[#2D241A]">Email support</p>
                  <p className="text-xs text-[#72654F]">support@bearlane.co.uk</p>
                </div>
              </a>

              <Link
                href="/help/livechat"
                className="flex items-start gap-3 rounded-xl border border-[#EDE3CE] bg-[#FFFCF5] px-4 py-3 transition hover:border-[#D8BE86]"
              >
                <MessageCircle className="mt-0.5 h-4 w-4 text-[#8B6B2A]" />
                <div>
                  <p className="text-sm font-semibold text-[#2D241A]">Live chat</p>
                  <p className="text-xs text-[#72654F]">Usually replies in minutes</p>
                </div>
              </Link>
            </div>

            <div className="mt-5 rounded-xl border border-[#EDE3CE] bg-gradient-to-br from-[#FFF9EB] to-[#F7EACA] p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A5B1E]">
                <LifeBuoy className="h-4 w-4" />
                Pro tip
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#6A593A]">
                Include your order number and screenshots for faster troubleshooting.
              </p>
            </div>
          </aside>

          <section className="rounded-2xl border border-[#E7DBBF] bg-white p-6 shadow-sm md:p-7">
            <div className="max-w-2xl">
              <HelpSearchBar placeholder="Search before you message us" />
            </div>

            {submitted ? (
              <div className="mt-4 rounded-xl border border-[#DCCBA1] bg-[#FFF9EB] px-4 py-3 text-sm text-[#5A4B30]">
                Thanks, your message has been sent. Our team will get back to you shortly.
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-xl border border-[#E5C3BB] bg-[#FFF3F1] px-4 py-3 text-sm text-[#8F2D22]">
                {error}
              </div>
            ) : null}

            <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                  className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={update}
                  required
                  className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Subject</span>
                <input
                  name="subject"
                  value={form.subject}
                  onChange={update}
                  required
                  className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#7D704F]">Message</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={update}
                  required
                  rows={6}
                  className="w-full rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 py-2 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B]"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A58335]"
                >
                  <SendHorizonal className="h-4 w-4" />
                  {submitting ? "Sending..." : "Send message"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </HelpShell>
    </>
  );
}
