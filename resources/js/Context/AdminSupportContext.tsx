import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SupportArticle = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  body: string;
  is_published: boolean;
  published_at: string | null;
  updated_at: string | null;
  is_readonly?: boolean;
};

type SupportFaqRequest = {
  id: number;
  question: string;
  details: string | null;
  answer: string | null;
  status: "pending" | "answered" | "rejected" | string;
  is_public: boolean;
  asked_by: {
    id: number | null;
    name: string;
  };
  answered_by: {
    id: number;
    name: string;
  } | null;
  created_at: string | null;
  answered_at: string | null;
  is_readonly?: boolean;
};

type SupportChat = {
  id: number;
  title: string;
  participant: string;
  participant_details: {
    id: number | null;
    name: string | null;
    username: string | null;
    email: string | null;
    avatar: string | null;
    is_guest: boolean;
    session_id: string | null;
  };
  is_closed: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  deleted_by?: string | null;
  admin_joined: boolean;
  message_count: number;
  session_id: string | null;
  updated_at: string | null;
  latest_message: {
    id: number;
    sender_type: string;
    content: string;
    is_image?: boolean;
    image_url?: string | null;
    created_at: string | null;
  } | null;
};

type SupportMessage = {
  id: number;
  chat_id: number;
  user_id: number | null;
  sender_type: "guest" | "user" | "admin" | "system";
  username: string;
  avatar?: string | null;
  content: string;
  is_image?: boolean;
  image_url?: string | null;
  created_at: string;
};

type SupportInboxMessage = {
  id: number;
  source_type: "support_form" | "print_request" | string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  attachments: string[];
  metadata: Record<string, unknown>;
  status: "new" | "read" | "replied" | string;
  admin_read_at: string | null;
  admin_replied_at: string | null;
  replied_by_admin: {
    id: number;
    name: string;
    email: string;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  quote_request_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type AdminSummary = {
  product_sales_count: number;
  orders_total_count?: number;
  orders_new_count?: number;
  product_sales_value: number;
  new_live_chats: number;
  open_live_chats: number;
  faqs_submitted: number;
  reviews_left: number;
  quotes_generated: number;
  live_chat_notifications: number;
  support_messages_notifications?: number;
  chat_active_count?: number;
  chat_inactive_count?: number;
  chat_archived_count?: number;
  active_articles_count?: number;
  archived_articles_count?: number;
  faq_published_answers_count?: number;
  faq_questions_count?: number;
  activities?: Array<{
    id: string;
    type: string;
    icon: string;
    title: string;
    description: string;
    created_at: string;
  }>;
};

type CreateArticleInput = {
  title: string;
  category: string;
  excerpt?: string;
  body: string;
  is_published?: boolean;
};

type UpdateArticleInput = Partial<CreateArticleInput>;

type AnswerFaqInput = {
  answer: string;
  is_public: boolean;
  status?: "answered" | "rejected";
};

type AdminSupportContextValue = {
  loading: boolean;
  saving: boolean;
  articles: SupportArticle[];
  faqRequests: SupportFaqRequest[];
  chats: SupportChat[];
  supportInboxMessages: SupportInboxMessage[];
  summary: AdminSummary;
  liveChatNotifications: number;
  supportInboxNotifications: number;
  activeChatId: number | null;
  activeSupportInboxMessageId: number | null;
  activeChatMessages: SupportMessage[];
  refreshData: () => Promise<void>;
  selectChat: (chatId: number) => Promise<void>;
  selectSupportInboxMessage: (supportMessageId: number) => Promise<void>;
  createArticle: (payload: CreateArticleInput) => Promise<void>;
  updateArticle: (articleId: number, payload: UpdateArticleInput) => Promise<void>;
  deleteArticle: (articleId: number) => Promise<void>;
  answerFaq: (faqId: number, payload: AnswerFaqInput) => Promise<void>;
  deleteFaq: (faqId: number) => Promise<void>;
  sendChatMessage: (content: string) => Promise<void>;
  sendChatImage: (file: File) => Promise<void>;
  renameChat: (chatId: number, title: string) => Promise<void>;
  closeChat: (chatId: number) => Promise<void>;
  archiveChat: (chatId: number) => Promise<void>;
  deleteChat: (chatId: number) => Promise<void>;
  replySupportInboxMessage: (supportMessageId: number, payload: { subject: string; message: string }) => Promise<void>;
};

const AdminSupportContext = createContext<AdminSupportContextValue | null>(null);

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const dedupeMessages = (messages: SupportMessage[]) => {
  const seen = new Set<number>();
  return messages.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
};

type Props = {
  children: ReactNode;
};

export function AdminSupportProvider({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<SupportArticle[]>([]);
  const [faqRequests, setFaqRequests] = useState<SupportFaqRequest[]>([]);
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [supportInboxMessages, setSupportInboxMessages] = useState<SupportInboxMessage[]>([]);
  const [summary, setSummary] = useState<AdminSummary>({
    product_sales_count: 0,
    product_sales_value: 0,
    new_live_chats: 0,
    open_live_chats: 0,
    faqs_submitted: 0,
    reviews_left: 0,
    quotes_generated: 0,
    live_chat_notifications: 0,
    support_messages_notifications: 0,
  });
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [activeSupportInboxMessageId, setActiveSupportInboxMessageId] = useState<number | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<number, SupportMessage[]>>({});

  const fetchChatMessages = useCallback(async (chatId: number, join = false) => {
    const response = await fetch(`/admin/support/chats/${chatId}/messages`, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return;

    const payload = await response.json();
    const messages = (payload.messages || []) as SupportMessage[];

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: dedupeMessages(messages),
    }));

    if (join) {
      const joinResponse = await fetch(`/admin/support/chats/${chatId}/join`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });

      if (joinResponse.ok) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  admin_joined: true,
                }
              : chat
          )
        );
      }
    }
  }, []);

  const refreshData = useCallback(async (withLoader = true) => {
    if (withLoader) {
      setLoading(true);
    }
    try {
      const response = await fetch("/admin/support/data", {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed loading support data: ${response.status}`);
      }

      const payload = await response.json();
      const dbArticles = (payload.articles || []) as SupportArticle[];
      const dbFaqRequests = (payload.faq_requests || []) as SupportFaqRequest[];

      setArticles(dbArticles);
      setFaqRequests(dbFaqRequests);
      setChats(payload.chats || []);
      setSupportInboxMessages((payload.support_messages || []) as SupportInboxMessage[]);
      if (payload.summary) {
        setSummary(payload.summary as AdminSummary);
      }
    } catch (error) {
      console.error("Failed to load admin support data", error);
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshData(false);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    const echo = (window as any).Echo;
    if (!echo) return;

    const channel = echo.private("admin.livechats");

    channel.listen(".MessageSent", (event: SupportMessage) => {
      const chatId = Number(event.chat_id);
      if (!Number.isFinite(chatId)) return;

      setMessagesByChat((prev) => {
        const next = [...(prev[chatId] || []), event];
        return { ...prev, [chatId]: dedupeMessages(next) };
      });

      setChats((prev) => {
        const existing = prev.find((chat) => chat.id === chatId);
        if (!existing) {
          // Ignore unknown chats in realtime stream. They will be loaded from
          // /admin/support/data once they are transferred to a human agent.
          return prev;
        }

        const updated = prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                is_closed: false,
                updated_at: event.created_at,
                message_count: (chat.message_count || 0) + 1,
                latest_message: {
                  id: event.id,
                  sender_type: event.sender_type,
                  content: event.content,
                  is_image: event.is_image,
                  image_url: event.image_url || null,
                  created_at: event.created_at,
                },
              }
            : chat
        );

        return updated.sort((a, b) => {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        });
      });
    });

    channel.listen(".ChatDeleted", (event: { chat_id: number; deleted_by?: string }) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === Number(event.chat_id)
            ? {
                ...chat,
                is_closed: true,
                deleted_by: event.deleted_by || chat.deleted_by || "Admin",
              }
            : chat
        )
      );
    });

    return () => {
      channel.stopListening(".MessageSent");
      channel.stopListening(".ChatDeleted");
      echo.leave("admin.livechats");
    };
  }, []);

  const selectChat = useCallback(async (chatId: number) => {
    setActiveChatId(chatId);

    const selected = chats.find((chat) => chat.id === chatId);
    const shouldJoin = Boolean(selected && !selected.is_closed && !selected.admin_joined);

    if (shouldJoin) {
      await fetchChatMessages(chatId, true);
      await fetchChatMessages(chatId, false);
      return;
    }

    await fetchChatMessages(chatId, false);
  }, [chats, fetchChatMessages]);

  const selectSupportInboxMessage = useCallback(async (supportMessageId: number) => {
    setActiveSupportInboxMessageId(supportMessageId);

    const target = supportInboxMessages.find((entry) => entry.id === supportMessageId);
    if (!target) {
      return;
    }

    if (target.admin_read_at) {
      return;
    }

    const response = await fetch(`/admin/support/messages/${supportMessageId}/read`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json().catch(() => ({}));
    const updated = payload.support_message as SupportInboxMessage | undefined;
    if (!updated) {
      return;
    }

    setSupportInboxMessages((prev) =>
      prev.map((entry) => (entry.id === supportMessageId ? updated : entry))
    );
  }, [supportInboxMessages]);

  useEffect(() => {
    if (!activeChatId) return;

    const interval = window.setInterval(() => {
      void fetchChatMessages(activeChatId, false);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeChatId, fetchChatMessages]);

  const createArticle = useCallback(async (payload: CreateArticleInput) => {
    setSaving(true);
    try {
      const response = await fetch("/admin/support/articles", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Unable to create article");
      const data = await response.json();
      setArticles((prev) => [data.article, ...prev]);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateArticle = useCallback(async (articleId: number, payload: UpdateArticleInput) => {
    const target = articles.find((article) => article.id === articleId);
    if (target?.is_readonly || articleId < 0) {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? {
                ...article,
                title: payload.title ?? article.title,
                category: payload.category ?? article.category,
                excerpt:
                  payload.excerpt !== undefined
                    ? (payload.excerpt || null)
                    : article.excerpt,
                body: payload.body ?? article.body,
                is_published:
                  payload.is_published !== undefined
                    ? payload.is_published
                    : article.is_published,
                updated_at: new Date().toISOString(),
              }
            : article
        )
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/admin/support/articles/${articleId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Unable to update article");
      const data = await response.json();
      setArticles((prev) =>
        prev.map((article) => (article.id === articleId ? data.article : article))
      );
    } finally {
      setSaving(false);
    }
  }, [articles]);

  const deleteArticle = useCallback(async (articleId: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/admin/support/articles/${articleId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      if (!response.ok) throw new Error("Unable to delete article");
      setArticles((prev) => prev.filter((article) => article.id !== articleId));
    } finally {
      setSaving(false);
    }
  }, []);

  const answerFaq = useCallback(async (faqId: number, payload: AnswerFaqInput) => {
    const target = faqRequests.find((faq) => faq.id === faqId);
    if (target?.is_readonly || faqId < 0) {
      setFaqRequests((prev) =>
        prev.map((faq) =>
          faq.id === faqId
            ? {
                ...faq,
                answer: payload.answer,
                is_public: payload.is_public,
                status: payload.status || "answered",
                answered_at: new Date().toISOString(),
              }
            : faq
        )
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/admin/support/faqs/${faqId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Unable to answer FAQ");
      const data = await response.json();
      setFaqRequests((prev) =>
        prev.map((faq) => (faq.id === faqId ? data.faq_request : faq))
      );
    } finally {
      setSaving(false);
    }
  }, [faqRequests]);

  const deleteFaq = useCallback(async (faqId: number) => {
    const target = faqRequests.find((faq) => faq.id === faqId);
    if (target?.is_readonly || faqId < 0) {
      setFaqRequests((prev) => prev.filter((faq) => faq.id !== faqId));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/admin/support/faqs/${faqId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      if (!response.ok) throw new Error("Unable to delete FAQ");
      setFaqRequests((prev) => prev.filter((faq) => faq.id !== faqId));
    } finally {
      setSaving(false);
    }
  }, [faqRequests]);

  const sendChatMessage = useCallback(async (content: string) => {
    if (!activeChatId || !content.trim()) return;

    const response = await fetch(`/admin/support/chats/${activeChatId}/messages`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ content: content.trim() }),
    });

    if (!response.ok) throw new Error("Unable to send message");
    const payload = await response.json();
    const message = payload.message as SupportMessage;

    setMessagesByChat((prev) => {
      const next = [...(prev[activeChatId] || []), message];
      return {
        ...prev,
        [activeChatId]: dedupeMessages(next),
      };
    });

    setChats((prev) =>
      prev
        .map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                is_closed: false,
                updated_at: message.created_at,
                latest_message: {
                  id: message.id,
                  sender_type: message.sender_type,
                  content: message.content,
                  created_at: message.created_at,
                },
              }
            : chat
        )
        .sort((a, b) => {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        })
    );
  }, [activeChatId]);

  const sendChatImage = useCallback(async (file: File) => {
    if (!activeChatId) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("chat_id", String(activeChatId));

    const response = await fetch("/livechat/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
      body: formData,
    });

    if (!response.ok) throw new Error("Unable to upload image");
    const payload = await response.json();
    const message = payload.message as SupportMessage;

    setMessagesByChat((prev) => {
      const next = [...(prev[activeChatId] || []), message];
      return {
        ...prev,
        [activeChatId]: dedupeMessages(next),
      };
    });

    setChats((prev) =>
      prev
        .map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                is_closed: false,
                updated_at: message.created_at,
                latest_message: {
                  id: message.id,
                  sender_type: message.sender_type,
                  content: message.content,
                  is_image: message.is_image,
                  image_url: message.image_url || null,
                  created_at: message.created_at,
                },
              }
            : chat
        )
        .sort((a, b) => {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        })
    );
  }, [activeChatId]);

  const closeChat = useCallback(async (chatId: number) => {
    const response = await fetch(`/admin/support/chats/${chatId}/close`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
    });
    if (!response.ok) throw new Error("Unable to close chat");

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              is_closed: true,
              is_archived: false,
              archived_at: null,
              deleted_by: "Admin",
            }
          : chat
      )
    );
  }, []);

  const archiveChat = useCallback(async (chatId: number) => {
    const response = await fetch(`/admin/support/chats/${chatId}/archive`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
    });
    if (!response.ok) throw new Error("Unable to archive chat");
    const payload = await response.json();

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              is_archived: true,
              archived_at: payload.archived_at || new Date().toISOString(),
            }
          : chat
      )
    );
  }, []);

  const renameChat = useCallback(async (chatId: number, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const response = await fetch(`/admin/support/chats/${chatId}/rename`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!response.ok) throw new Error("Unable to rename chat");

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: trimmed,
            }
          : chat
      )
    );
  }, []);

  const deleteChat = useCallback(async (chatId: number) => {
    const response = await fetch(`/admin/support/chats/${chatId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
    });
    if (!response.ok) throw new Error("Unable to delete chat");

    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    setMessagesByChat((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    setActiveChatId((prev) => (prev === chatId ? null : prev));
  }, []);

  const replySupportInboxMessage = useCallback(
    async (supportMessageId: number, payload: { subject: string; message: string }) => {
      const response = await fetch(`/admin/support/messages/${supportMessageId}/reply`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to send email reply.");
      }

      const updated = data.support_message as SupportInboxMessage | undefined;
      if (updated) {
        setSupportInboxMessages((prev) =>
          prev.map((entry) => (entry.id === supportMessageId ? updated : entry))
        );
      }
    },
    []
  );

  const activeChatMessages = useMemo(
    () => (activeChatId ? messagesByChat[activeChatId] || [] : []),
    [activeChatId, messagesByChat]
  );

  const value = useMemo<AdminSupportContextValue>(
    () => ({
      loading,
      saving,
      articles,
      faqRequests,
      chats,
      supportInboxMessages,
      summary,
      liveChatNotifications: summary.live_chat_notifications || summary.new_live_chats || 0,
      supportInboxNotifications:
        summary.support_messages_notifications ??
        supportInboxMessages.filter((entry) => !entry.admin_read_at).length,
      activeChatId,
      activeSupportInboxMessageId,
      activeChatMessages,
      refreshData,
      selectChat,
      selectSupportInboxMessage,
      createArticle,
      updateArticle,
      deleteArticle,
      answerFaq,
      deleteFaq,
      sendChatMessage,
      sendChatImage,
      renameChat,
      closeChat,
      archiveChat,
      deleteChat,
      replySupportInboxMessage,
    }),
    [
      loading,
      saving,
      articles,
      faqRequests,
      chats,
      supportInboxMessages,
      summary,
      activeChatId,
      activeSupportInboxMessageId,
      activeChatMessages,
      refreshData,
      selectChat,
      selectSupportInboxMessage,
      createArticle,
      updateArticle,
      deleteArticle,
      answerFaq,
      deleteFaq,
      sendChatMessage,
      sendChatImage,
      renameChat,
      closeChat,
      archiveChat,
      deleteChat,
      replySupportInboxMessage,
    ]
  );

  return <AdminSupportContext.Provider value={value}>{children}</AdminSupportContext.Provider>;
}

export function useAdminSupport() {
  const context = useContext(AdminSupportContext);
  if (!context) {
    throw new Error("useAdminSupport must be used inside AdminSupportProvider");
  }
  return context;
}

export type {
  AdminSummary,
  SupportArticle,
  SupportChat,
  SupportFaqRequest,
  SupportInboxMessage,
  SupportMessage,
  CreateArticleInput,
  UpdateArticleInput,
  AnswerFaqInput,
};
