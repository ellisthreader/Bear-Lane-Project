import { useMemo, useState } from "react";
import { Mail, Reply, SendHorizonal } from "lucide-react";
import { useAdminSupport } from "@/Context/AdminSupportContext";

export default function MessagesTab() {
  const {
    supportInboxMessages,
    supportInboxNotifications,
    activeSupportInboxMessageId,
    selectSupportInboxMessage,
    replySupportInboxMessage,
  } = useAdminSupport();

  const [filter, setFilter] = useState<"all" | "new" | "replied">("all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, { subject: string; message: string }>>({});

  const filteredMessages = useMemo(() => {
    return supportInboxMessages.filter((entry) => {
      if (filter === "all") return true;
      if (filter === "new") return !entry.admin_read_at;
      if (filter === "replied") return entry.status === "replied";
      return true;
    });
  }, [supportInboxMessages, filter]);

  const activeMessage = useMemo(() => {
    if (!filteredMessages.length) return null;
    if (activeSupportInboxMessageId) {
      const found = supportInboxMessages.find((entry) => entry.id === activeSupportInboxMessageId);
      if (found) return found;
    }
    return filteredMessages[0] || null;
  }, [filteredMessages, supportInboxMessages, activeSupportInboxMessageId]);

  const replyDraft = activeMessage
    ? replyDrafts[activeMessage.id] || {
        subject: `Re: ${activeMessage.subject || "Your message to Bear Lane"}`,
        message: "",
      }
    : { subject: "", message: "" };

  const setReplyField = (field: "subject" | "message", value: string) => {
    if (!activeMessage) return;
    setReplyDrafts((prev) => ({
      ...prev,
      [activeMessage.id]: {
        subject: prev[activeMessage.id]?.subject || `Re: ${activeMessage.subject || "Your message to Bear Lane"}`,
        message: prev[activeMessage.id]?.message || "",
        [field]: value,
      },
    }));
  };

  const sendReply = async () => {
    if (!activeMessage) return;
    const subject = (replyDraft.subject || "").trim();
    const message = (replyDraft.message || "").trim();

    if (!subject || !message) {
      setError("Subject and reply message are required.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSending(true);

    try {
      await replySupportInboxMessage(activeMessage.id, { subject, message });
      setSuccess("Reply email sent successfully.");
      setReplyField("message", "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex h-[560px] flex-col rounded-2xl border border-[#E7DCC2] bg-[#FFFCF5] p-3">
        <h2 className="px-2 text-sm font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">Messages Inbox</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 px-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              filter === "all"
                ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                : "border-[#E5D7B8] bg-white text-[#6F6248]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("new")}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              filter === "new"
                ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                : "border-[#E5D7B8] bg-white text-[#6F6248]"
            }`}
          >
            New ({supportInboxNotifications})
          </button>
          <button
            type="button"
            onClick={() => setFilter("replied")}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              filter === "replied"
                ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                : "border-[#E5D7B8] bg-white text-[#6F6248]"
            }`}
          >
            Replied
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredMessages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#DDCCA3] bg-white px-3 py-6 text-center text-sm text-[#6B5A34]">
              No messages in this filter.
            </p>
          ) : null}

          {filteredMessages.map((entry) => {
            const isActive = activeMessage?.id === entry.id;
            const isNew = !entry.admin_read_at;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  void selectSupportInboxMessage(entry.id);
                  setError(null);
                  setSuccess(null);
                }}
                className={`block w-full rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-[#D1B46F] bg-[#FFF3D6]"
                    : "border-[#E7DCC2] bg-white hover:border-[#D7BE86]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[#2A2215]">{entry.subject || "Support message"}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      isNew
                        ? "border border-[#E6D4AA] bg-[#FFF8E8] text-[#8A6D2B]"
                        : "border border-[#D5DCC7] bg-[#F5F8EF] text-[#4C6630]"
                    }`}
                  >
                    {isNew ? "New" : entry.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-[#6A5D45]">{entry.name} - {entry.email}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#776A51]">{entry.message}</p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-[#E7DCC2] bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-[#EAE0CB] bg-[#FFF8EA] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">Message Detail</p>
            <h3 className="text-base font-semibold text-[#2A2215]">{activeMessage ? activeMessage.subject || "Support message" : "Select a message"}</h3>
          </div>
          {activeMessage ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E6D4AA] bg-[#FFF8E8] px-2.5 py-1 text-xs font-semibold text-[#8A6D2B]">
              <Mail className="h-3.5 w-3.5" />
              {activeMessage.source_type === "print_request" ? "Print Specialist" : "Support"}
            </span>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto bg-[#FAF7F1] px-4 py-4">
          {!activeMessage ? (
            <div className="flex h-full items-center justify-center text-sm text-[#7A6D52]">
              Choose a message from the inbox to view and reply.
            </div>
          ) : (
            <div className="space-y-4">
              <article className="rounded-2xl border border-[#E7DCC2] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">From</p>
                <p className="mt-1 text-sm font-semibold text-[#2A2215]">{activeMessage.name}</p>
                <p className="text-xs text-[#6C5D42]">{activeMessage.email}</p>
                {activeMessage.phone ? <p className="text-xs text-[#6C5D42]">{activeMessage.phone}</p> : null}
                {activeMessage.created_at ? (
                  <p className="mt-1 text-[11px] text-[#7D6F54]">
                    {new Date(activeMessage.created_at).toLocaleString("en-GB")}
                  </p>
                ) : null}

                <div className="mt-3 rounded-xl border border-[#EFE3C7] bg-[#FFFEFA] p-3 text-sm text-[#3A3022] whitespace-pre-wrap">
                  {activeMessage.message}
                </div>

                {activeMessage.source_type === "print_request" ? (
                  <div className="mt-3 grid gap-2 text-xs text-[#5D503B] sm:grid-cols-2">
                    <div className="rounded-lg border border-[#E9DBBD] bg-[#FFF9EB] px-3 py-2">
                      <p className="font-semibold text-[#7A5B1E]">Budget</p>
                      <p>{String(activeMessage.metadata?.budget || "Not provided")}</p>
                    </div>
                    <div className="rounded-lg border border-[#E9DBBD] bg-[#FFF9EB] px-3 py-2">
                      <p className="font-semibold text-[#7A5B1E]">Invoice Ref</p>
                      <p>{String(activeMessage.metadata?.invoice_reference || "Not provided")}</p>
                    </div>
                  </div>
                ) : null}

                {activeMessage.attachments?.length ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Attachments</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeMessage.attachments.map((src, index) => (
                        <a
                          key={`${src}-${index}`}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg border border-[#E1D4B8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6A541F] hover:border-[#C9A85B]"
                        >
                          Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="rounded-2xl border border-[#E7DCC2] bg-white p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">
                  <Reply className="h-3.5 w-3.5" />
                  Reply via email
                </p>

                <div className="mt-3 space-y-3">
                  <input
                    value={replyDraft.subject}
                    onChange={(event) => setReplyField("subject", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C9A85B]"
                    placeholder="Email subject"
                  />
                  <textarea
                    value={replyDraft.message}
                    onChange={(event) => setReplyField("message", event.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-[#E1D4B8] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A85B]"
                    placeholder="Write your response to the customer..."
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B89443] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    <SendHorizonal className="h-4 w-4" />
                    {sending ? "Sending..." : "Send Reply"}
                  </button>

                  {activeMessage.admin_replied_at ? (
                    <p className="text-xs text-[#5D7B3A]">
                      Last replied {new Date(activeMessage.admin_replied_at).toLocaleString("en-GB")}
                    </p>
                  ) : null}
                </div>

                {success ? <p className="mt-3 text-sm font-medium text-[#2E6A2B]">{success}</p> : null}
                {error ? <p className="mt-3 text-sm font-medium text-[#9A2F2F]">{error}</p> : null}
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
