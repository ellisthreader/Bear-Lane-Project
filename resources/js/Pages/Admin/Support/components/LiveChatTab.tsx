import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, MessageSquareText, Pencil, SendHorizonal } from "lucide-react";
import { useAdminSupport } from "@/Context/AdminSupportContext";

const QUICK_REPLIES = [
  {
    id: "greeting-professional",
    label: "Greeting - Professional",
    message:
      "Good day, and thank you for contacting BearLane.\nPlease allow me a moment to review your enquiry.",
  },
  {
    id: "checking-order",
    label: "Checking Order",
    message:
      "Thank you for the details.\nPlease give me a moment while I locate your order information.",
  },
  {
    id: "delay-busy",
    label: "Delay - Busy",
    message:
      "We're currently experiencing a high volume of enquiries.\nThank you for your patience - I'll be with you shortly.",
  },
  {
    id: "need-more-info",
    label: "Request Order Number",
    message:
      "To help you further, I just need a few more details.\nCould you please confirm your order number?",
  },
  {
    id: "resolution-confirmed",
    label: "Resolution Confirmed",
    message:
      "That's now been taken care of.\nIs there anything else I can assist you with today?",
  },
  {
    id: "closing-polite",
    label: "Closing - Polite",
    message:
      "If there's nothing further, I'll go ahead and close this chat.\nThank you for choosing BearLane - we appreciate you.",
  },
] as const;

export default function LiveChatTab() {
  const {
    chats,
    activeChatId,
    activeChatMessages,
    selectChat,
    sendChatMessage,
    sendChatImage,
    renameChat,
    closeChat,
    archiveChat,
    deleteChat,
  } = useAdminSupport();

  const [message, setMessage] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sending, setSending] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [quickReplyId, setQuickReplyId] = useState("");
  const [chatView, setChatView] = useState<"active" | "archived">("active");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats]
  );

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        chatView === "archived" ? Boolean(chat.is_archived) : !chat.is_archived
      ),
    [chats, chatView]
  );

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatMessages]);

  useEffect(() => {
    setTitleDraft(activeChat?.title || "");
    setIsEditingTitle(false);
  }, [activeChat?.id, activeChat?.title]);

  const submitMessage = async () => {
    if (!message.trim() || !activeChatId) return;
    setSending(true);
    try {
      await sendChatMessage(message);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const applyQuickReply = (id: string) => {
    const template = QUICK_REPLIES.find((entry) => entry.id === id);
    if (!template) return;
    setMessage(template.message);
    setQuickReplyId("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      await sendChatImage(file);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const submitRename = async () => {
    if (!activeChat || !titleDraft.trim() || titleDraft.trim() === activeChat.title) {
      setIsEditingTitle(false);
      return;
    }
    setRenaming(true);
    try {
      await renameChat(activeChat.id, titleDraft.trim());
      setIsEditingTitle(false);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex h-[540px] flex-col rounded-2xl border border-[#E7DCC2] bg-[#FFFCF5] p-3">
        <h2 className="px-2 text-sm font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">
          {chatView === "archived" ? "Archived Chats" : "Active Chats"}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 px-2">
          <button
            type="button"
            onClick={() => setChatView("active")}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              chatView === "active"
                ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                : "border-[#E5D7B8] bg-white text-[#6F6248]"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setChatView("archived")}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              chatView === "archived"
                ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                : "border-[#E5D7B8] bg-white text-[#6F6248]"
            }`}
          >
            Archived
          </button>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredChats.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#DDCCA3] bg-white px-3 py-6 text-center text-sm text-[#6B5A34]">
              {chatView === "archived" ? "No archived chats yet." : "No active chats yet."}
            </p>
          ) : null}

          {filteredChats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => {
                  void selectChat(chat.id);
                }}
                className={`block w-full rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#D1B46F] bg-[#FFF3D6]"
                    : "border-[#E7DCC2] bg-white hover:border-[#D7BE86]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[#2A2215]">{chat.title}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        chat.is_closed ? "bg-[#C9A68A]" : "bg-[#5DAF5B]"
                      }`}
                    />
                    {chat.message_count > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F3E4C0] px-1.5 text-[11px] font-semibold text-[#6A541F]">
                        {chat.message_count}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-[#6A5D45]">{chat.participant}</p>
                {chat.is_archived ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#7A6A46]">
                    Archived
                  </p>
                ) : null}
                {chat.participant_details?.email ? (
                  <p className="mt-1 truncate text-[11px] text-[#7D6F54]">{chat.participant_details.email}</p>
                ) : null}
                {!chat.admin_joined && !chat.is_closed ? (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A0792C]">
                    Click to join
                  </p>
                ) : null}
                {chat.latest_message ? (
                  <p className="mt-1 line-clamp-1 text-xs text-[#776A51]">{chat.latest_message.content}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex h-[540px] flex-col overflow-hidden rounded-2xl border border-[#E7DCC2] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE0CB] bg-[#FFF8EA] px-4 py-3">
          <div className="flex items-start gap-3">
            {activeChat ? (
              <img loading="lazy" decoding="async"
                src={activeChat.participant_details?.avatar || "/images/DefaultPicture.png"}
                alt={activeChat.participant}
                className="mt-0.5 h-10 w-10 rounded-full border border-[#E1D4B8] bg-white object-cover"
              />
            ) : null}
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">Conversation</p>
            <div className="flex items-center gap-2">
              {activeChat && isEditingTitle ? (
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitRename();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setTitleDraft(activeChat.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onBlur={() => {
                    if (!renaming) {
                      void submitRename();
                    }
                  }}
                  autoFocus
                  className="h-8 w-56 rounded-lg border border-[#E1D4B8] bg-white px-2.5 text-sm font-semibold text-[#2A2215] outline-none focus:border-[#C9A85B]"
                />
              ) : (
                <h3 className="text-base font-semibold text-[#2A2215]">
                  {activeChat ? activeChat.title : "Select a chat"}
                </h3>
              )}
              {activeChat ? (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(activeChat.title);
                    setIsEditingTitle(true);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E1D4B8] bg-white text-[#7C5E24] transition hover:border-[#C9A85B]"
                  aria-label="Edit chat title"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {activeChat ? (
              <p className="mt-1 text-xs text-[#6C5D42]">
                {activeChat.participant_details?.id ? (
                  <a
                    href={`/admin/users/${activeChat.participant_details.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#7C5E24] hover:underline"
                  >
                    {activeChat.participant_details?.name || activeChat.participant}
                  </a>
                ) : (
                  <span>{activeChat.participant_details?.name || activeChat.participant}</span>
                )}
                {activeChat.participant_details?.username
                  ? ` (@${activeChat.participant_details.username})`
                  : ""}
                {activeChat.participant_details?.email
                  ? ` - ${activeChat.participant_details.email}`
                  : activeChat.participant_details?.is_guest
                  ? " - Guest session"
                  : ""}
                {activeChat.participant_details?.is_guest && activeChat.participant_details?.session_id
                  ? ` (${activeChat.participant_details.session_id})`
                  : ""}
              </p>
            ) : null}
            {activeChat?.is_closed ? (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A25545]">
                Closed by {activeChat.deleted_by || "User"}
              </p>
            ) : null}
            </div>
          </div>

          {activeChat ? (
            <div className="flex items-center gap-2">
              {!activeChat.is_closed ? (
                <button
                  type="button"
                  onClick={() => {
                    void closeChat(activeChat.id);
                  }}
                  className="rounded-lg border border-[#E5C3BB] bg-[#FFF3F1] px-3 py-1.5 text-xs font-semibold text-[#8F2D22]"
                >
                  Close Chat
                </button>
              ) : (
                <>
                  {!activeChat.is_archived ? (
                    <button
                      type="button"
                      onClick={() => {
                        void archiveChat(activeChat.id);
                      }}
                      className="rounded-lg border border-[#DCCCA3] bg-[#FFF7DF] px-3 py-1.5 text-xs font-semibold text-[#6A541F]"
                    >
                      Archive Chat
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this closed chat permanently?")) {
                        void deleteChat(activeChat.id);
                      }
                    }}
                    className="rounded-lg border border-[#D9B9B0] bg-[#FDF0EE] px-3 py-1.5 text-xs font-semibold text-[#8F2D22]"
                  >
                    Delete Chat
                  </button>
                </>
              )}
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto bg-[#FAF7F1] px-4 py-4">
          {activeChat ? (
            <div className="space-y-3">
              {activeChatMessages.map((entry) => {
                const isAdmin = entry.sender_type === "admin";
                const isSystem = entry.sender_type === "system";
                return (
                  <div
                    key={entry.id}
                    className={`flex ${
                      isSystem ? "justify-center" : isAdmin ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                        isSystem
                          ? "border border-[#E2D7BD] bg-[#FFF8E6] text-[#6A5D46]"
                          : isAdmin
                          ? "rounded-br-sm bg-[#B89443] text-white"
                          : "rounded-bl-sm border border-[#E7DCC2] bg-white text-[#3A3022]"
                      }`}
                    >
                      {!isSystem ? (
                        <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isAdmin ? "text-white/80" : "text-[#8A7344]"}`}>
                          {isAdmin ? "You" : entry.username}
                        </p>
                      ) : null}
                      {entry.is_image && entry.image_url ? (
                        <a href={entry.image_url} target="_blank" rel="noreferrer">
                          <img loading="lazy" decoding="async"
                            src={entry.image_url}
                            alt="Chat upload"
                            className="max-h-64 w-auto rounded-xl border border-[#E5D9C0] bg-white object-contain"
                          />
                        </a>
                      ) : (
                        entry.content
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesRef} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#7A6D52]">
              <p className="inline-flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                Choose a chat from the list to start replying.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-[#EAE0CB] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                void onImageSelected(event);
              }}
              className="hidden"
            />
            <input
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
              placeholder="Write a reply..."
              disabled={!activeChat || activeChat.is_closed}
              className="h-11 flex-1 rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm outline-none focus:border-[#C9A85B] disabled:opacity-60"
            />
            <button
              type="button"
              disabled={uploadingImage || !activeChat || activeChat.is_closed}
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm font-semibold text-[#6A541F] transition hover:border-[#C9A85B] disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              {uploadingImage ? "Uploading..." : "Image"}
            </button>
            <select
              value={quickReplyId}
              onChange={(event) => {
                const nextId = event.target.value;
                setQuickReplyId(nextId);
                applyQuickReply(nextId);
              }}
              disabled={!activeChat || activeChat.is_closed}
              className="h-11 w-52 rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#3A3022] outline-none focus:border-[#C9A85B] disabled:opacity-60"
            >
              <option value="">Quick replies</option>
              {QUICK_REPLIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={sending || !activeChat || activeChat.is_closed || !message.trim()}
              onClick={() => {
                void submitMessage();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-50"
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
