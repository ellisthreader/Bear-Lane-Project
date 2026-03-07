import React, { useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import { Archive, ArrowLeft, ArrowUpRight, BarChart3, CircleHelp, Mail, MessageSquare, Package, Pencil, ReceiptText, Shield, Sparkles, Star, TriangleAlert, User, Users, X } from "lucide-react";
import type { AdminSummary } from "@/Context/AdminSupportContext";

type AdminDashboardProps = {
  auth?: {
    user?: {
      name?: string;
    };
  };
  summary?: AdminSummary;
};

type DashboardCard = {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
  accentClass: string;
  disabled?: boolean;
};

export default function AdminDashboard({ auth, summary: incomingSummary }: AdminDashboardProps) {
  const userName = auth?.user?.name || "Admin";
  const summary = {
    product_sales_count: 0,
    orders_total_count: 0,
    orders_new_count: 0,
    product_sales_value: 0,
    new_live_chats: 0,
    open_live_chats: 0,
    faqs_submitted: 0,
    reviews_left: 0,
    quotes_generated: 0,
    live_chat_notifications: 0,
    ...(incomingSummary || {}),
  } as AdminSummary;

  const cards: DashboardCard[] = [
    {
      title: "Statistics",
      description: "Track growth, revenue, and order performance in one place.",
      href: "/admin/statistics",
      icon: <BarChart3 className="h-6 w-6" />,
      accentClass: "from-[#C6A75E]/30 to-transparent",
    },
    {
      title: "Support & Live Chat",
      description: "Handle customer conversations and active support threads.",
      href: "/admin/support",
      icon: <MessageSquare className="h-6 w-6" />,
      accentClass: "from-[#D9BE82]/30 to-transparent",
    },
    {
      title: "Products",
      description: "Manage navigation categories, subcategories, and product assignments.",
      href: "/admin/products",
      icon: <Package className="h-6 w-6" />,
      accentClass: "from-[#BFA16A]/30 to-transparent",
    },
    {
      title: "Orders",
      description: "Review every placed order, update status, labels, and customer clarification.",
      href: "/admin/orders",
      icon: <ReceiptText className="h-6 w-6" />,
      accentClass: "from-[#D4B373]/30 to-transparent",
    },
    {
      title: "Users",
      description: "View customer records and admin-level access controls.",
      href: "/admin/users",
      icon: <Users className="h-6 w-6" />,
      accentClass: "from-[#E3C88E]/30 to-transparent",
    },
  ];

  const activities = summary.activities || [];
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityFromDate, setActivityFromDate] = useState("");
  const [activityToDate, setActivityToDate] = useState("");
  const [activityUserFilter, setActivityUserFilter] = useState("");

  const activityTypes = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.type))).sort(),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    const normalizedUser = activityUserFilter.trim().toLowerCase();
    const fromDateValue = activityFromDate ? new Date(`${activityFromDate}T00:00:00`) : null;
    const toDateValue = activityToDate ? new Date(`${activityToDate}T23:59:59`) : null;

    return activities.filter((activity) => {
      if (activityTypeFilter !== "all" && activity.type !== activityTypeFilter) {
        return false;
      }

      const activityDate = new Date(activity.created_at);
      if (fromDateValue && activityDate < fromDateValue) {
        return false;
      }
      if (toDateValue && activityDate > toDateValue) {
        return false;
      }

      if (!normalizedUser) {
        return true;
      }

      const searchable = `${activity.title} ${activity.description}`.toLowerCase();
      return searchable.includes(normalizedUser);
    });
  }, [activities, activityTypeFilter, activityFromDate, activityToDate, activityUserFilter]);

  const iconForActivity = (icon: string) => {
    switch (icon) {
      case "package":
        return <Package className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "faq":
        return <CircleHelp className="h-4 w-4" />;
      case "article":
        return <Pencil className="h-4 w-4" />;
      case "sale":
        return <BarChart3 className="h-4 w-4" />;
      case "quote":
        return <ReceiptText className="h-4 w-4" />;
      case "review":
        return <Star className="h-4 w-4" />;
      case "archive":
        return <Archive className="h-4 w-4" />;
      case "alert":
        return <TriangleAlert className="h-4 w-4" />;
      case "mail":
        return <Mail className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-6 py-10 text-[#2D2515] sm:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#C6A75E]/30 blur-3xl" />
          <div className="absolute right-[-120px] top-[18%] h-[28rem] w-[28rem] rounded-full bg-[#E7D3A3]/30 blur-3xl" />
          <div className="absolute bottom-[-140px] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#D7BB80]/25 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-6xl space-y-6"
        >
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.back();
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF8E8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7B6530]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          <div className="w-full rounded-3xl border border-[#E5D4AF] bg-gradient-to-br from-[#FFFDF7] via-[#FFF9EC] to-[#FFFDF8] p-5 shadow-[0_20px_60px_rgba(91,70,27,0.10)] sm:p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E8D8B5] bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D6BB80] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">
                      <Shield className="h-3.5 w-3.5" />
                      Admin Control Centre
                    </p>
                    <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Welcome back, {userName}</h1>
                    <p className="mt-2 text-sm text-[#6B5A34]">
                      Everything you need to run Bear Lane is here. Monitor performance, manage inventory, and support customers quickly.
                    </p>
                  </div>
                  <Link
                    href="/admin/statistics"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E]"
                  >
                    Open Analytics
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2D2AE] bg-white/95 p-4 text-left shadow-[0_8px_24px_rgba(91,70,27,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">Admin Activity History</p>
                    <p className="text-xs text-[#6B5A34]">Live notifications for admin changes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActivityModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#7D6228] transition hover:border-[#C29A4F]"
                  >
                    Expand History
                  </button>
                </div>
                <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {activities.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-3 py-4 text-sm text-[#6B5A34]">
                      No recent activity yet.
                    </p>
                  ) : (
                    activities.slice(0, 12).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-[#E9DAB7] bg-[#FFF9EC] px-3 py-2.5">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8A6D2B]">
                          {iconForActivity(activity.icon)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2D2515]">{activity.title}</p>
                          <p className="truncate text-xs text-[#6B5A34]">{activity.description}</p>
                        </div>
                        <p className="shrink-0 text-[11px] text-[#7A6A45]">
                          {new Date(activity.created_at).toLocaleString("en-US")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.42, ease: "easeOut" }}
              >
                {card.disabled ? (
                  <div className="group relative block h-full overflow-hidden rounded-2xl border border-[#E4D2AA] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accentClass} opacity-80`} />
                    <div className="relative">
                      <div className="inline-flex rounded-xl border border-[#E2CCA1] bg-[#FFF8E7] p-2.5 text-[#8A6D2B]">
                        {card.icon}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{card.title}</h2>
                        {card.title === "Support & Live Chat" && summary.live_chat_notifications > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B42318] px-2 text-xs font-bold text-white">
                            {summary.live_chat_notifications}
                          </span>
                        ) : null}
                        {card.title === "Orders" && Number(summary.orders_new_count || 0) > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B42318] px-2 text-xs font-bold text-white">
                            {summary.orders_new_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#6B5A34]">{card.description}</p>
                      <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B]/80">
                        Coming Soon
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={card.href || "#"}
                    className="group relative block h-full overflow-hidden rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(91,70,27,0.13)]"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accentClass} opacity-80`} />
                    <div className="relative">
                      <div className="inline-flex rounded-xl border border-[#E2CCA1] bg-[#FFF8E7] p-2.5 text-[#8A6D2B]">
                        {card.icon}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{card.title}</h2>
                        {card.title === "Support & Live Chat" && summary.live_chat_notifications > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B42318] px-2 text-xs font-bold text-white">
                            {summary.live_chat_notifications}
                          </span>
                        ) : null}
                        {card.title === "Orders" && Number(summary.orders_new_count || 0) > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B42318] px-2 text-xs font-bold text-white">
                            {summary.orders_new_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#6B5A34]">{card.description}</p>
                      <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8A6D2B] transition group-hover:translate-x-1">
                        Open
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isActivityModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/55 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Admin activity history"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#E2D2AE] bg-[#FFFDF7] shadow-[0_30px_80px_rgba(20,15,10,0.35)]"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7D7B3] bg-[#FFF6DF] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">Expanded Activity History</p>
                  <h2 className="mt-1 text-xl font-bold text-[#2D2515]">Admin Timeline</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8C395] bg-white text-[#6E5726] transition hover:border-[#BE9A52]"
                  aria-label="Close activity modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="grid gap-3 border-b border-[#E7D7B3] bg-white px-5 py-4 md:grid-cols-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                  Type
                  <select
                    value={activityTypeFilter}
                    onChange={(event) => setActivityTypeFilter(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E0CFA9] bg-[#FFFDF8] px-3 text-sm text-[#2D2515] outline-none focus:border-[#C29A4F]"
                  >
                    <option value="all">All types</option>
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                  From Date
                  <input
                    type="date"
                    value={activityFromDate}
                    onChange={(event) => setActivityFromDate(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E0CFA9] bg-[#FFFDF8] px-3 text-sm text-[#2D2515] outline-none focus:border-[#C29A4F]"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                  To Date
                  <input
                    type="date"
                    value={activityToDate}
                    onChange={(event) => setActivityToDate(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#E0CFA9] bg-[#FFFDF8] px-3 text-sm text-[#2D2515] outline-none focus:border-[#C29A4F]"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                  User / Text
                  <input
                    type="text"
                    value={activityUserFilter}
                    onChange={(event) => setActivityUserFilter(event.target.value)}
                    placeholder="Search user, title, details..."
                    className="mt-1 h-10 w-full rounded-lg border border-[#E0CFA9] bg-[#FFFDF8] px-3 text-sm text-[#2D2515] outline-none focus:border-[#C29A4F]"
                  />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FFFCF4] px-5 py-4">
                <div className="space-y-2">
                  {filteredActivities.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-white px-3 py-4 text-sm text-[#6B5A34]">
                      No activity found for the selected filters.
                    </p>
                  ) : (
                    filteredActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-[#E9DAB7] bg-white px-3 py-3">
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF6DF] text-[#8A6D2B]">
                          {iconForActivity(activity.icon)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2D2515]">{activity.title}</p>
                          <p className="truncate text-xs text-[#6B5A34]">{activity.description}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#9A8352]">{activity.type.replace(/_/g, " ")}</p>
                        </div>
                        <p className="shrink-0 text-[11px] text-[#7A6A45]">
                          {new Date(activity.created_at).toLocaleString("en-US")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
}
