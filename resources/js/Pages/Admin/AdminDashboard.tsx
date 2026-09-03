import React, { useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CircleHelp,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  ReceiptText,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Star,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
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
  disabled?: boolean;
};

type QuoteLookupResult = {
  id: number;
  quote_number: string;
  name: string;
  email: string;
  total: number;
  items: unknown[];
  created_at: string | null;
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
    support_messages_notifications: 0,
    ...(incomingSummary || {}),
  } as AdminSummary;

  const cards: DashboardCard[] = [
    {
      title: "Statistics",
      description: "Track growth, revenue, and order performance in one place.",
      href: "/admin/statistics",
      icon: <BarChart3 className="h-6 w-6" />,
    },
    {
      title: "Support & Live Chat",
      description: "Handle customer conversations and active support threads.",
      href: "/admin/support",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      title: "Products",
      description: "Manage navigation categories, subcategories, and product assignments.",
      href: "/admin/products",
      icon: <Package className="h-6 w-6" />,
    },
    {
      title: "Orders",
      description: "Review every placed order, update status, labels, and customer clarification.",
      href: "/admin/orders",
      icon: <ReceiptText className="h-6 w-6" />,
    },
    {
      title: "Users",
      description: "View customer records and admin-level access controls.",
      href: "/admin/users",
      icon: <Users className="h-6 w-6" />,
    },
    {
      title: "Other",
      description: "Manage global store settings, tax, size guides, and discount rules.",
      href: "/admin/other",
      icon: <Settings2 className="h-6 w-6" />,
    },
  ];

  const activities = summary.activities || [];
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityFromDate, setActivityFromDate] = useState("");
  const [activityToDate, setActivityToDate] = useState("");
  const [activityUserFilter, setActivityUserFilter] = useState("");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteNumberInput, setQuoteNumberInput] = useState("");
  const [quoteLookupLoading, setQuoteLookupLoading] = useState(false);
  const [quoteLookupError, setQuoteLookupError] = useState<string | null>(null);
  const [quoteLookupResult, setQuoteLookupResult] = useState<QuoteLookupResult | null>(null);

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

  // Stat-tile values: compact so a KPI row never reflows on a big number.
  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(
      Number.isFinite(value) ? value : 0
    );

  const supportBadge =
    Number(summary.live_chat_notifications || 0) + Number(summary.support_messages_notifications || 0);

  const badgeForCard = (title: string) => {
    if (title === "Support & Live Chat") return supportBadge;
    if (title === "Orders") return Number(summary.orders_new_count || 0);
    return 0;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

  const kpis: Array<{ label: string; value: string; note?: string }> = [
    {
      label: "Orders",
      value: formatCompact(Number(summary.orders_total_count || 0)),
      note: Number(summary.orders_new_count || 0) > 0 ? `${summary.orders_new_count} new` : undefined,
    },
    { label: "Products sold", value: formatCompact(Number(summary.product_sales_count || 0)) },
    { label: "Quotes generated", value: formatCompact(Number(summary.quotes_generated || 0)) },
    { label: "Reviews left", value: formatCompact(Number(summary.reviews_left || 0)) },
    {
      label: "Open chats",
      value: formatCompact(Number(summary.open_live_chats || 0)),
      note: supportBadge > 0 ? `${supportBadge} unread` : undefined,
    },
  ];

  const normalizedQuoteItems = useMemo(() => {
    if (!Array.isArray(quoteLookupResult?.items)) {
      return [];
    }

    return quoteLookupResult.items.map((item, index) => {
      const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const name =
        String(row.name || row.title || row.product_name || row.product || "").trim() || `Item ${index + 1}`;
      const quantity = Number(row.quantity ?? row.qty ?? 1);
      const unitPrice = Number(row.price ?? row.unit_price ?? 0);
      const lineTotal = Number(row.total ?? quantity * unitPrice);

      return {
        key: `${name}-${index}`,
        name,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
      };
    });
  }, [quoteLookupResult]);

  const lookupQuote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quoteNumber = quoteNumberInput.trim();
    if (!quoteNumber) {
      setQuoteLookupError("Enter a quote number to continue.");
      setQuoteLookupResult(null);
      return;
    }

    setQuoteLookupLoading(true);
    setQuoteLookupError(null);
    setQuoteLookupResult(null);

    try {
      const response = await fetch(`/admin/quotes/lookup?quote_number=${encodeURIComponent(quoteNumber)}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to find that quote.");
      }

      setQuoteLookupResult(payload?.quote || null);
    } catch (error) {
      setQuoteLookupError(error instanceof Error ? error.message : "Unable to find that quote.");
    } finally {
      setQuoteLookupLoading(false);
    }
  };

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
      <div className="min-h-screen bg-[#FBF8F1] px-4 py-8 text-[#2D2515] sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="mx-auto w-full max-w-6xl"
        >
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.back();
                }
              }}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#7B6530] transition hover:text-[#2D2515]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {/* Header: one hero figure, per the stat-tile contract */}
          <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[#E8DCC0] pb-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#9A8352]">
                <Shield className="h-3.5 w-3.5" />
                Admin Control Centre
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, {userName}
              </h1>
              <p className="mt-1.5 text-sm text-[#6B5A34]">
                Monitor performance, manage inventory, and support customers.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-xs font-medium text-[#6B5A34]">Product sales value</p>
                <p className="mt-1 text-[48px] font-semibold leading-none tracking-tight text-[#2D2515]">
                  {formatCurrency(Number(summary.product_sales_value || 0))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQuoteModalOpen(true);
                  setQuoteLookupError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D2515] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#443A22]"
              >
                View quote
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-b border-[#E8DCC0] py-7 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label}>
                <p className="text-xs font-medium text-[#6B5A34]">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-semibold leading-none tracking-tight text-[#2D2515]">
                  {kpi.value}
                </p>
                {kpi.note ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#9A5B23]">
                    <TriangleAlert className="h-3 w-3" />
                    {kpi.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const badge = badgeForCard(card.title);
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#8A6D2B]">{card.icon}</span>
                    {badge > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B42318] px-1.5 text-xs font-semibold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 text-base font-semibold tracking-tight">{card.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B5A34]">{card.description}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#8A6D2B]">
                    {card.disabled ? "Coming soon" : "Open"}
                    {card.disabled ? null : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </p>
                </>
              );

              return card.disabled ? (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#E8DCC0] bg-white p-5 opacity-60"
                >
                  {body}
                </div>
              ) : (
                <Link
                  key={card.title}
                  href={card.href || "#"}
                  className="rounded-xl border border-[#E8DCC0] bg-white p-5 transition hover:border-[#C6A75E] hover:shadow-[0_2px_12px_rgba(91,70,27,0.07)]"
                >
                  {body}
                </Link>
              );
            })}
          </div>

          {/* Activity */}
          <section className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Activity</h2>
                <p className="mt-0.5 text-sm text-[#6B5A34]">Live notifications for admin changes</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(true)}
                className="rounded-lg border border-[#E8DCC0] bg-white px-3 py-1.5 text-sm font-medium text-[#7D6228] transition hover:border-[#C6A75E]"
              >
                Expand history
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-[#E8DCC0] bg-white">
              {activities.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#6B5A34]">No recent activity yet.</p>
              ) : (
                <ul className="divide-y divide-[#F0E8D6]">
                  {activities.slice(0, 12).map((activity) => (
                    <li key={activity.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="shrink-0 text-[#8A6D2B]">{iconForActivity(activity.icon)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2D2515]">{activity.title}</p>
                        <p className="truncate text-xs text-[#6B5A34]">{activity.description}</p>
                      </div>
                      <p className="shrink-0 text-xs tabular-nums text-[#9A8352]">
                        {new Date(activity.created_at).toLocaleString("en-GB")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
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

        {isQuoteModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[121] bg-black/55 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Quote lookup"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E2D2AE] bg-[#FFFDF7] shadow-[0_30px_80px_rgba(20,15,10,0.35)]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-[#E7D7B3] bg-[#FFF6DF] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">Quote Manager</p>
                  <h2 className="mt-1 text-xl font-bold text-[#2D2515]">View Quote</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8C395] bg-white text-[#6E5726] transition hover:border-[#BE9A52]"
                  aria-label="Close quote modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="border-b border-[#E7D7B3] bg-white px-5 py-4">
                <form className="flex flex-col gap-3 sm:flex-row" onSubmit={lookupQuote}>
                  <label className="sr-only" htmlFor="quote-number-input">
                    Quote number
                  </label>
                  <input
                    id="quote-number-input"
                    type="text"
                    value={quoteNumberInput}
                    onChange={(event) => setQuoteNumberInput(event.target.value)}
                    placeholder="Enter quote number (e.g. BL-QUOTE-12345)"
                    className="h-11 flex-1 rounded-xl border border-[#E0CFA9] bg-[#FFFDF8] px-3 text-sm text-[#2D2515] outline-none focus:border-[#C29A4F]"
                  />
                  <button
                    type="submit"
                    disabled={quoteLookupLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C6A75E] px-4 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {quoteLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </form>
                {quoteLookupError ? (
                  <p className="mt-3 rounded-xl border border-[#F2C5BD] bg-[#FFF3F0] px-3 py-2 text-sm font-semibold text-[#A63D2F]">
                    {quoteLookupError}
                  </p>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FFFCF4] px-5 py-4">
                {!quoteLookupResult && !quoteLookupLoading && !quoteLookupError ? (
                  <div className="rounded-xl border border-dashed border-[#E2D2AE] bg-white px-4 py-5 text-sm text-[#6B5A34]">
                    Search by quote number to view customer details, total, and requested items.
                  </div>
                ) : null}

                {quoteLookupResult ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#E3D2AD] bg-white p-4 shadow-[0_8px_24px_rgba(91,70,27,0.08)]">
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#846B37]">Quote Number</p>
                          <p className="mt-1 font-semibold text-[#2D2515]">{quoteLookupResult.quote_number}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#846B37]">Created</p>
                          <p className="mt-1 font-semibold text-[#2D2515]">
                            {quoteLookupResult.created_at
                              ? new Date(quoteLookupResult.created_at).toLocaleString("en-GB")
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#846B37]">Customer</p>
                          <p className="mt-1 font-semibold text-[#2D2515]">{quoteLookupResult.name || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#846B37]">Email</p>
                          <p className="mt-1 font-semibold text-[#2D2515]">{quoteLookupResult.email || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-[#E9DAB7] bg-[#FFF9EC] px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">Quote Total</p>
                        <p className="mt-1 text-xl font-bold text-[#2D2515]">{formatCurrency(Number(quoteLookupResult.total || 0))}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E3D2AD] bg-white p-4 shadow-[0_8px_24px_rgba(91,70,27,0.08)]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#846B37]">Quote Items</h3>
                        <p className="text-xs font-semibold text-[#6B5A34]">{normalizedQuoteItems.length} item(s)</p>
                      </div>
                      <div className="space-y-2">
                        {normalizedQuoteItems.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-3 py-4 text-sm text-[#6B5A34]">
                            No item breakdown is available for this quote.
                          </p>
                        ) : (
                          normalizedQuoteItems.map((item) => (
                            <div key={item.key} className="rounded-xl border border-[#E9DAB7] bg-[#FFF9EC] px-3 py-2.5">
                              <p className="text-sm font-semibold text-[#2D2515]">{item.name}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6B5A34]">
                                <span>Qty: {item.quantity}</span>
                                <span>Unit: {formatCurrency(item.unitPrice)}</span>
                                <span>Total: {formatCurrency(item.lineTotal)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
}
