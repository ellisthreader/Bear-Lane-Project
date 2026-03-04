import { Link } from "@inertiajs/react";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Loader2,
  Package,
  PoundSterling,
  ReceiptText,
  RefreshCw,
  Star,
  Users,
} from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type RangeKey = "today" | "week" | "month" | "year" | "custom";

type TimelinePoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

type TransactionRow = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: string;
  created_at: string | null;
  payment_reference: string | null;
  archived_at: string | null;
};

type RefundRow = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  fees: number;
  stripe_refund_id: string;
  refunded_at: string | null;
};

type TopCustomerRow = {
  key: string;
  customer_name: string;
  username: string | null;
  customer_email: string;
  avatar: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
};

type BestSellingRow = {
  product_id: number | null;
  product_name: string;
  product_slug: string | null;
  units_sold: number;
  revenue: number;
  orders_count: number;
};

type ReviewSummary = {
  total_reviews: number;
  approved_reviews: number;
  flagged_reviews: number;
  average_rating: number;
  reviews_with_images: number;
};

type RatingBreakdownRow = {
  rating: number;
  count: number;
  share: number;
};

type ReviewStats = {
  summary: ReviewSummary;
  rating_breakdown: RatingBreakdownRow[];
  top_reviewed_products: Array<{
    product_id: number | null;
    product_name: string;
    product_slug: string | null;
    reviews_count: number;
    average_rating: number;
  }>;
  recent_reviews: Array<{
    id: number;
    product_name: string;
    customer_name: string;
    rating: number;
    status: string;
    created_at: string | null;
  }>;
};

type AnalyticsPayload = {
  cards: {
    total_revenue: number;
    total_users: number;
    total_orders: number;
    net_profit: number;
    total_refunds: number;
    total_fees: number;
    best_selling_product_name: string;
    best_selling_product_units: number;
    reviews_total: number;
    reviews_average: number;
  };
  timeline: TimelinePoint[];
  recent_transactions: TransactionRow[];
  recent_refunds: RefundRow[];
  top_customers: TopCustomerRow[];
  best_selling_products: BestSellingRow[];
  review_stats: ReviewStats;
  meta: {
    range_start: string;
    range_end: string;
    range_label: string;
    time_zone: string;
  };
};

type StatisticsProps = {
  initial_range?: RangeKey;
  initial_date_from?: string;
  initial_date_to?: string;
  analytics?: AnalyticsPayload;
};

const EMPTY_ANALYTICS: AnalyticsPayload = {
  cards: {
    total_revenue: 0,
    total_users: 0,
    total_orders: 0,
    net_profit: 0,
    total_refunds: 0,
    total_fees: 0,
    best_selling_product_name: "No sales in this range",
    best_selling_product_units: 0,
    reviews_total: 0,
    reviews_average: 0,
  },
  timeline: [],
  recent_transactions: [],
  recent_refunds: [],
  top_customers: [],
  best_selling_products: [],
  review_stats: {
    summary: {
      total_reviews: 0,
      approved_reviews: 0,
      flagged_reviews: 0,
      average_rating: 0,
      reviews_with_images: 0,
    },
    rating_breakdown: [],
    top_reviewed_products: [],
    recent_reviews: [],
  },
  meta: {
    range_start: "",
    range_end: "",
    range_label: "No range selected",
    time_zone: "Europe/London",
  },
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Specific Time" },
];

const formatMoney = (value?: number | null, currency = "GBP") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
};

const formatNumber = (value?: number | null) => new Intl.NumberFormat("en-GB").format(Number(value || 0));

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusBadgeClass = (status: string) => {
  const value = status.toLowerCase();
  if (value.includes("deliver")) return "border-[#CDE3B2] bg-[#F2FAE8] text-[#4D6E2A]";
  if (value.includes("cancel")) return "border-[#F4C7C1] bg-[#FFF2F1] text-[#9F3126]";
  if (value.includes("dispatch")) return "border-[#D0DDF3] bg-[#F4F8FF] text-[#315B8E]";
  if (value.includes("pack")) return "border-[#D9C79C] bg-[#FFF9E9] text-[#7A6231]";
  return "border-[#E8D0A0] bg-[#FFF5E2] text-[#8C6221]";
};

const toTitleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");

function RevenueLineChart({ points }: { points: TimelinePoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 900;
  const height = 250;
  const paddingX = 28;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const values = points.map((point) => Number(point.revenue || 0));
  const maxValue = Math.max(1, ...values);
  const yTicks = 4;

  const coordinates = points.map((point, index) => {
    const x = points.length <= 1
      ? paddingX + innerWidth / 2
      : paddingX + (index / (points.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - ((Number(point.revenue || 0) / maxValue) * innerHeight);
    return { x, y };
  });

  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = coordinates.length
    ? `${path} L ${coordinates[coordinates.length - 1].x} ${paddingY + innerHeight} L ${coordinates[0].x} ${paddingY + innerHeight} Z`
    : "";
  const activeIndex = hoveredIndex ?? null;
  const activePoint = activeIndex !== null ? coordinates[activeIndex] : null;
  const activeDataPoint = activeIndex !== null ? points[activeIndex] : null;

  const labelIndexes = Array.from(new Set([0, Math.floor(points.length / 2), Math.max(0, points.length - 1)]));

  return (
    <div className="rounded-2xl border border-[#E7D7B3] bg-[#FFFDF8] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="Revenue line graph">
        {Array.from({ length: yTicks + 1 }).map((_, index) => {
          const y = paddingY + (innerHeight / yTicks) * index;
          const tickValue = maxValue * (1 - index / yTicks);
          return (
            <g key={`grid-${index}`}>
              <line x1={paddingX} y1={y} x2={paddingX + innerWidth} y2={y} stroke="#EADDC0" strokeDasharray="4 4" />
              <text x={6} y={y + 4} fontSize="10" fill="#8A6D2B">
                {formatMoney(tickValue)}
              </text>
            </g>
          );
        })}

        {areaPath ? <path d={areaPath} fill="url(#revenueFill)" opacity={0.25} /> : null}
        {path ? <path d={path} fill="none" stroke="#B89443" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {coordinates.map((point, index) => {
          const isActive = activeIndex === index;
          return (
            <g key={`point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 6 : 3.6}
                fill="#FFF6DE"
                stroke="#A27D2D"
                strokeWidth={1.5}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={10}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}

        {labelIndexes.map((index) => {
          const point = coordinates[index];
          const label = points[index]?.label;
          if (!point || !label) return null;
          return (
            <text key={`label-${index}`} x={point.x} y={height - 6} textAnchor="middle" fontSize="10" fill="#7A6435">
              {label}
            </text>
          );
        })}

        {activePoint && activeDataPoint ? (
          <g pointerEvents="none">
            <rect
              x={Math.max(8, Math.min(width - 180, activePoint.x - 84))}
              y={Math.max(8, activePoint.y - 52)}
              width={168}
              height={42}
              rx={8}
              fill="#2D2515"
              opacity={0.92}
            />
            <text
              x={Math.max(16, Math.min(width - 168, activePoint.x - 76))}
              y={Math.max(24, activePoint.y - 34)}
              fontSize="10"
              fill="#FDF6E8"
            >
              {activeDataPoint.label}
            </text>
            <text
              x={Math.max(16, Math.min(width - 168, activePoint.x - 76))}
              y={Math.max(38, activePoint.y - 18)}
              fontSize="11"
              fill="#FDF6E8"
              fontWeight={700}
            >
              Revenue: {formatMoney(activeDataPoint.revenue)}
            </text>
          </g>
        ) : null}

        <defs>
          <linearGradient id="revenueFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C9A85B" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function OrdersPerDayChart({ points }: { points: TimelinePoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 900;
  const height = 250;
  const paddingX = 28;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const maxOrders = Math.max(1, ...points.map((point) => Number(point.orders || 0)));
  const barGap = 3;
  const barWidth = points.length > 0
    ? Math.max(4, (innerWidth - Math.max(0, points.length - 1) * barGap) / points.length)
    : 0;

  const labelIndexes = Array.from(new Set([0, Math.floor(points.length / 2), Math.max(0, points.length - 1)]));

  return (
    <div className="rounded-2xl border border-[#E7D7B3] bg-[#FFFDF8] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="Orders per day graph">
        {Array.from({ length: 5 }).map((_, index) => {
          const y = paddingY + (innerHeight / 4) * index;
          const tickValue = Math.round(maxOrders * (1 - index / 4));
          return (
            <g key={`orders-grid-${index}`}>
              <line x1={paddingX} y1={y} x2={paddingX + innerWidth} y2={y} stroke="#EADDC0" strokeDasharray="4 4" />
              <text x={6} y={y + 4} fontSize="10" fill="#8A6D2B">
                {tickValue}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const value = Number(point.orders || 0);
          const barHeight = (value / maxOrders) * innerHeight;
          const x = paddingX + index * (barWidth + barGap);
          const y = paddingY + innerHeight - barHeight;
          const isActive = hoveredIndex === index;
          return (
            <g key={`bar-${point.date}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="#B89443"
                opacity={isActive ? 1 : 0.92}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <rect
                x={x}
                y={paddingY}
                width={barWidth}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}

        {labelIndexes.map((index) => {
          const label = points[index]?.label;
          if (!label || points.length === 0) return null;
          const x = paddingX + index * (barWidth + barGap) + barWidth / 2;
          return (
            <text key={`orders-label-${index}`} x={x} y={height - 6} textAnchor="middle" fontSize="10" fill="#7A6435">
              {label}
            </text>
          );
        })}

        {hoveredIndex !== null && points[hoveredIndex] ? (
          <g pointerEvents="none">
            <rect
              x={Math.max(8, Math.min(width - 178, paddingX + hoveredIndex * (barWidth + barGap) - 80))}
              y={10}
              width={170}
              height={42}
              rx={8}
              fill="#2D2515"
              opacity={0.92}
            />
            <text
              x={Math.max(16, Math.min(width - 162, paddingX + hoveredIndex * (barWidth + barGap) - 72))}
              y={26}
              fontSize="10"
              fill="#FDF6E8"
            >
              {points[hoveredIndex].label}
            </text>
            <text
              x={Math.max(16, Math.min(width - 162, paddingX + hoveredIndex * (barWidth + barGap) - 72))}
              y={40}
              fontSize="11"
              fill="#FDF6E8"
              fontWeight={700}
            >
              Orders: {formatNumber(points[hoveredIndex].orders)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export default function Statistics({
  initial_range = "month",
  initial_date_from = "",
  initial_date_to = "",
  analytics: initialAnalytics,
}: StatisticsProps) {
  const [range, setRange] = useState<RangeKey>(initial_range);
  const [dateFrom, setDateFrom] = useState(initial_date_from);
  const [dateTo, setDateTo] = useState(initial_date_to);
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(initialAnalytics || EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (nextRange: RangeKey, nextDateFrom = dateFrom, nextDateTo = dateTo) => {
    const params = new URLSearchParams({ range: nextRange });
    if (nextRange === "custom") {
      if (nextDateFrom) params.set("date_from", nextDateFrom);
      if (nextDateTo) params.set("date_to", nextDateTo);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/admin/statistics/data?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load statistics right now.");
      }

      const loadedRange = (payload?.range as RangeKey) || nextRange;
      setRange(loadedRange);
      setDateFrom(String(payload?.date_from || nextDateFrom || ""));
      setDateTo(String(payload?.date_to || nextDateTo || ""));
      setAnalytics(payload?.analytics || EMPTY_ANALYTICS);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load statistics right now.");
    } finally {
      setLoading(false);
    }
  };

  const timelineHasData = analytics.timeline.length > 0;
  const bestCustomer = analytics.top_customers[0];

  const buildMetricHref = (metric: string) => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    }
    return `/admin/statistics/${metric}?${params.toString()}`;
  };

  const cardItems = useMemo(() => ([
    {
      id: "total_revenue",
      title: "Total Revenue",
      value: formatMoney(analytics.cards.total_revenue),
      subtitle: `Refunds ${formatMoney(analytics.cards.total_refunds)} • Fees ${formatMoney(analytics.cards.total_fees)}`,
      icon: <PoundSterling className="h-5 w-5" />,
    },
    {
      id: "total_users",
      title: "Total Users",
      value: formatNumber(analytics.cards.total_users),
      subtitle: "New customer accounts in range",
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "total_orders",
      title: "Total Orders",
      value: formatNumber(analytics.cards.total_orders),
      subtitle: "Placed orders in selected range",
      icon: <ReceiptText className="h-5 w-5" />,
    },
    {
      id: "net_profit",
      title: "Net Profit",
      value: formatMoney(analytics.cards.net_profit),
      subtitle: "Revenue minus refunded amount and Stripe fees",
      icon: <ChartNoAxesCombined className="h-5 w-5" />,
    },
    {
      id: "best_selling_products",
      title: "Best Selling Product",
      value: analytics.cards.best_selling_product_name,
      subtitle: `${formatNumber(analytics.cards.best_selling_product_units)} units sold`,
      icon: <Package className="h-5 w-5" />,
    },
    {
      id: "reviews",
      title: "Reviews",
      value: `${analytics.cards.reviews_average.toFixed(2)} / 5`,
      subtitle: `${formatNumber(analytics.cards.reviews_total)} total reviews`,
      icon: <Star className="h-5 w-5" />,
    },
  ]), [analytics.cards]);

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-5 py-8 text-[#2D2515] sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C6A75E]/30 blur-3xl" />
          <div className="absolute right-[-120px] top-[12%] h-[28rem] w-[28rem] rounded-full bg-[#E7D3A3]/30 blur-3xl" />
          <div className="absolute bottom-[-140px] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#D7BB80]/25 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl space-y-6">
          <section className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_18px_50px_rgba(91,70,27,0.10)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#D6BB80] bg-[#FFF8E7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Live Analytics
                </p>
                <h1 className="mt-3 text-3xl font-bold">Admin Statistics</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">
                  {analytics.meta.range_label} ({analytics.meta.time_zone})
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadAnalytics(range, dateFrom, dateTo)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-4 py-2.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Data
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] p-4">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setRange(option.key);
                      if (option.key !== "custom") {
                        void loadAnalytics(option.key, dateFrom, dateTo);
                      }
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      range === option.key
                        ? "bg-[#B89443] text-white"
                        : "border border-[#E1D4B8] bg-white text-[#7B6530] hover:bg-[#FFF4DF]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {range === "custom" ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                    From
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="mt-1 h-10 w-[180px] rounded-lg border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C29A4F]"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#7A6435]">
                    To
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="mt-1 h-10 w-[180px] rounded-lg border border-[#E1D4B8] bg-white px-3 text-sm outline-none focus:border-[#C29A4F]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadAnalytics("custom", dateFrom, dateTo)}
                    disabled={loading || !dateFrom || !dateTo}
                    className="inline-flex h-10 items-center rounded-lg bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    Apply Range
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cardItems.map((card) => (
              <Link
                key={card.id}
                href={buildMetricHref(card.id)}
                className="group rounded-2xl border border-[#E5D4AF] bg-white/95 p-4 shadow-[0_8px_24px_rgba(91,70,27,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(91,70,27,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">{card.title}</p>
                    <p className="mt-1 text-2xl font-bold text-[#2D2515]">{card.value}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2CCA1] bg-[#FFF8E7] text-[#8A6D2B]">
                    {card.icon}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#6B5A34]">{card.subtitle}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A6D2B] transition group-hover:translate-x-0.5">
                  Open in-depth
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Revenue Line Graph</h2>
                  <p className="mt-1 text-xs text-[#6B5A34]">Hover points to inspect values. Click through for full breakdown.</p>
                </div>
                <Link href={buildMetricHref("total_revenue")} className="text-xs font-semibold text-[#8A6D2B] hover:underline">
                  Open full report
                </Link>
              </div>
              {timelineHasData ? (
                <div className="mt-4">
                  <RevenueLineChart points={analytics.timeline} />
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-4 py-8 text-sm text-[#6B5A34]">
                  No revenue data available for this range.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Orders Per Day Graph</h2>
                  <p className="mt-1 text-xs text-[#6B5A34]">Hover bars to inspect values. Click through for full breakdown.</p>
                </div>
                <Link href={buildMetricHref("total_orders")} className="text-xs font-semibold text-[#8A6D2B] hover:underline">
                  Open full report
                </Link>
              </div>
              {timelineHasData ? (
                <div className="mt-4">
                  <OrdersPerDayChart points={analytics.timeline} />
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-4 py-8 text-sm text-[#6B5A34]">
                  No order data available for this range.
                </p>
              )}
            </article>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <article className="xl:col-span-2 rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <p className="mt-1 text-xs text-[#6B5A34]">Latest orders in the selected range.</p>

              {analytics.recent_transactions.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-4 py-8 text-sm text-[#6B5A34]">
                  No transactions found.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#E9DAB7] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-[#7A6435]">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Order</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1E5CB]">
                      {analytics.recent_transactions.map((transaction) => (
                        <tr key={transaction.id} className="text-[#2D2515]">
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(transaction.created_at)}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold">#{transaction.order_number}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium">{transaction.customer_name}</p>
                            <p className="text-xs text-[#6B5A34]">{transaction.customer_email || "No email"}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(transaction.status)}`}>
                              {toTitleCase(transaction.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold">{formatMoney(transaction.amount)}</td>
                          <td className="px-3 py-2 text-xs text-[#6B5A34]">
                            {transaction.payment_reference || "N/A"}
                            {transaction.archived_at ? (
                              <p className="mt-1 inline-flex rounded-full border border-[#CDE3B2] bg-[#F2FAE8] px-2 py-0.5 text-[11px] font-semibold text-[#4D6E2A]">
                                Archived
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <div className="space-y-5">
              <article className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
                <h2 className="text-lg font-semibold">Recent Refunds</h2>
                <p className="mt-1 text-xs text-[#6B5A34]">Most recent completed refunds.</p>
                <div className="mt-4 space-y-3">
                  {analytics.recent_refunds.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-3 py-4 text-sm text-[#6B5A34]">
                      No refunds in this period.
                    </p>
                  ) : (
                    analytics.recent_refunds.slice(0, 6).map((refund) => (
                      <div key={refund.id} className="rounded-xl border border-[#E9DAB7] bg-[#FFF9EC] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">#{refund.order_number}</p>
                            <p className="text-xs text-[#6B5A34]">{refund.customer_name}</p>
                          </div>
                          <p className="text-sm font-bold text-[#8A6D2B]">- {formatMoney(refund.amount, refund.currency)}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-[#6B5A34]">Ref: {refund.stripe_refund_id || "N/A"}</p>
                        <p className="text-[11px] text-[#6B5A34]">
                          Fee: {formatMoney(refund.fees, refund.currency)} • {formatDateTime(refund.refunded_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
                <h2 className="text-lg font-semibold">Top Customers</h2>
                <p className="mt-1 text-xs text-[#6B5A34]">Highest spenders for this period.</p>
                {bestCustomer ? (
                  <div className="mt-3 rounded-xl border border-[#E9DAB7] bg-[#FFF9EC] p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-[#7A6435]">Top customer</p>
                    <p className="mt-1 text-base font-bold">{bestCustomer.customer_name}</p>
                    <p className="text-xs text-[#6B5A34]">{formatMoney(bestCustomer.total_spent)} spent</p>
                  </div>
                ) : null}
                <div className="mt-3 space-y-2.5">
                  {analytics.top_customers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-3 py-4 text-sm text-[#6B5A34]">
                      No customer spend data in this range.
                    </p>
                  ) : (
                    analytics.top_customers.slice(0, 6).map((customer, index) => (
                      <div key={customer.key} className="flex items-center gap-3 rounded-xl border border-[#E9DAB7] bg-[#FFFDF8] px-3 py-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF2D7] text-xs font-bold text-[#8A6D2B]">
                          #{index + 1}
                        </span>
                        {customer.avatar ? (
                          <img src={customer.avatar} alt={customer.customer_name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F0E4C8] text-sm font-semibold text-[#7A6435]">
                            {(customer.customer_name || "C").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{customer.customer_name}</p>
                          <p className="truncate text-xs text-[#6B5A34]">
                            {customer.orders_count} orders • Last {formatDateTime(customer.last_order_at)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-[#8A6D2B]">{formatMoney(customer.total_spent)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </section>

          {error ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-[#F4C7C1] bg-[#FFF2F1] px-3 py-2 text-xs font-semibold text-[#9F3126]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
