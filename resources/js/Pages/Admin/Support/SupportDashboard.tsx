import { Link } from "@inertiajs/react";
import { useMemo, useState, type ReactNode } from "react";
import { BookText, CircleHelp, Mail, MessageSquareText, Sparkles } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import { AdminSupportProvider, useAdminSupport } from "@/Context/AdminSupportContext";
import ArticlesTab from "./components/ArticlesTab";
import FaqTab from "./components/FaqTab";
import LiveChatTab from "./components/LiveChatTab";
import MessagesTab from "./components/MessagesTab";

type TabKey = "articles" | "faq" | "chat" | "messages";

const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "articles", label: "Help Centre Articles", icon: <BookText className="h-4 w-4" /> },
  { key: "faq", label: "FAQ Inbox", icon: <CircleHelp className="h-4 w-4" /> },
  { key: "messages", label: "Messages", icon: <Mail className="h-4 w-4" /> },
  { key: "chat", label: "Live Chat", icon: <MessageSquareText className="h-4 w-4" /> },
];

function SupportDashboardContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("articles");
  const { loading, summary, liveChatNotifications, supportInboxNotifications, supportInboxMessages, articles, faqRequests } = useAdminSupport();

  const mergedActiveArticlesCount = useMemo(
    () => articles.filter((article) => article.is_published).length,
    [articles]
  );
  const mergedArchivedArticlesCount = useMemo(
    () => articles.filter((article) => !article.is_published).length,
    [articles]
  );
  const mergedFaqPublishedAnswersCount = useMemo(
    () => faqRequests.filter((faq) => faq.status === "answered" && faq.is_public && Boolean((faq.answer || "").trim())).length,
    [faqRequests]
  );
  const mergedFaqQuestionsCount = useMemo(
    () =>
      faqRequests.filter((faq) => {
        if (faq.is_readonly) return false;
        if (faq.status === "pending") return true;
        return !Boolean((faq.answer || "").trim());
      }).length,
    [faqRequests]
  );

  const summaryCards = useMemo(() => {
    if (activeTab === "chat") {
      return [
        {
          label: "Active Chats",
          value: `${summary.chat_active_count ?? 0}`,
          subValue: "Needs response now",
          icon: <MessageSquareText className="h-5 w-5" />,
        },
        {
          label: "Inactive Chats",
          value: `${summary.chat_inactive_count ?? 0}`,
          subValue: "Closed but not archived",
          icon: <CircleHelp className="h-5 w-5" />,
        },
        {
          label: "Archived Chats",
          value: `${summary.chat_archived_count ?? 0}`,
          subValue: "Stored history",
          icon: <BookText className="h-5 w-5" />,
        },
      ];
    }

    if (activeTab === "articles") {
      return [
        {
          label: "Active Articles",
          value: `${mergedActiveArticlesCount}`,
          subValue: "Published to help centre",
          icon: <BookText className="h-5 w-5" />,
        },
        {
          label: "Archived Articles",
          value: `${mergedArchivedArticlesCount}`,
          subValue: "Unpublished archive",
          icon: <CircleHelp className="h-5 w-5" />,
        },
      ];
    }

    if (activeTab === "messages") {
      return [
        {
          label: "Unread Messages",
          value: `${supportInboxNotifications}`,
          subValue: "Awaiting first admin response",
          icon: <Mail className="h-5 w-5" />,
        },
        {
          label: "Total Inbox",
          value: `${supportInboxMessages.length}`,
          subValue: "Support + print enquiries",
          icon: <MessageSquareText className="h-5 w-5" />,
        },
      ];
    }

    return [
      {
        label: "Published Answers",
        value: `${mergedFaqPublishedAnswersCount}`,
        subValue: "Visible to customers",
        icon: <CircleHelp className="h-5 w-5" />,
      },
      {
        label: "Questions",
        value: `${mergedFaqQuestionsCount}`,
        subValue: "Unanswered FAQ requests",
        icon: <MessageSquareText className="h-5 w-5" />,
      },
    ];
  }, [
    activeTab,
    summary,
    mergedActiveArticlesCount,
    mergedArchivedArticlesCount,
    mergedFaqPublishedAnswersCount,
    mergedFaqQuestionsCount,
    supportInboxNotifications,
    supportInboxMessages.length,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-5 py-8 text-[#2D2515] sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-6 shadow-[0_18px_50px_rgba(91,70,27,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D2B]">Support Command Centre</p>
          <h1 className="mt-2 text-3xl font-bold">Support and Live Chat</h1>
          <p className="mt-1 text-sm text-[#6B5A34]">
            Manage help articles, publish FAQ answers, and respond to customers in real time.
          </p>
          <div className="mt-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E9D8AE] bg-[#FFF7E0] px-3 py-2 text-xs font-semibold text-[#7B5E24]">
            <Sparkles className="h-4 w-4" />
            Live Notifications
            <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B42318] px-1.5 text-[11px] font-bold text-white">
              {liveChatNotifications + supportInboxNotifications}
            </span>
          </div>

          <div className={`mt-5 grid gap-3 ${summaryCards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] px-4 py-3">
                <div className="flex items-center justify-between text-[#8A6D2B]">
                  <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                  {card.icon}
                </div>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-[#7D6A45]">{card.subValue}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                    : "border-[#E7DCC2] bg-white text-[#6B5A34] hover:border-[#D6BC82]"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "chat" && liveChatNotifications > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B42318] px-1.5 text-xs font-bold text-white">
                    {liveChatNotifications}
                  </span>
                ) : null}
                {tab.key === "messages" && supportInboxNotifications > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B42318] px-1.5 text-xs font-bold text-white">
                    {supportInboxNotifications}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-[#E6D8B8] bg-white p-5 shadow-sm">
          {loading ? (
            <p className="px-2 py-8 text-sm text-[#6B5A34]">Loading support data...</p>
          ) : null}
          {!loading && activeTab === "articles" ? <ArticlesTab /> : null}
          {!loading && activeTab === "faq" ? <FaqTab /> : null}
          {!loading && activeTab === "messages" ? <MessagesTab /> : null}
          {!loading && activeTab === "chat" ? <LiveChatTab /> : null}
        </div>
      </div>
    </div>
  );
}

export default function SupportDashboard() {
  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <AdminSupportProvider>
        <SupportDashboardContent />
      </AdminSupportProvider>
    </AuthenticatedLayout>
  );
}
