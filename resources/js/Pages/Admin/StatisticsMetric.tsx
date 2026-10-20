import { Link } from "@inertiajs/react";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, RefreshCw } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type RangeKey = "today" | "week" | "month" | "year" | "custom";

type DetailCard = {
  label: string;
  value: string;
  note?: string;
};

type DetailColumn = {
  key: string;
  label: string;
};

type DetailRow = Record<string, string | number | null>;

type ChartPoint = {
  label: string;
  value: number;
  secondary?: number;
};

type MetricDetail = {
  summary_cards: DetailCard[];
  chart_type: "line" | "bar";
  chart_title: string;
  chart_subtitle: string;
  chart_value_label: string;
  chart_secondary_label?: string | null;
  chart_series: ChartPoint[];
  table_title: string;
  table_columns: DetailColumn[];
  table_rows: DetailRow[];
  secondary_table_title?: string | null;
  secondary_table_columns?: DetailColumn[];
  secondary_table_rows?: DetailRow[];
};

type StatisticsMetricProps = {
  metric: string;
  title: string;
  subtitle: string;
  initial_range?: RangeKey;
  initial_date_from?: string;
  initial_date_to?: string;
  detail?: MetricDetail;
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Specific Time" },
];

const EMPTY_DETAIL: MetricDetail = {
  summary_cards: [],
  chart_type: "line",
  chart_title: "",
  chart_subtitle: "",
  chart_value_label: "",
  chart_secondary_label: null,
  chart_series: [],
  table_title: "",
  table_columns: [],
  table_rows: [],
  secondary_table_title: null,
  secondary_table_columns: [],
  secondary_table_rows: [],
};

function MetricChart({
  series,
  chartType,
  valueLabel,
  secondaryLabel,
}: {
  series: ChartPoint[];
  chartType: "line" | "bar";
  valueLabel: string;
  secondaryLabel?: string | null;
}) {
  if (series.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-4 py-8 text-sm text-[#6B5A34]">
        No chart data available for this range.
      </p>
    );
  }

  const width = 1000;
  const height = 280;
  const paddingX = 38;
  const paddingY = 26;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const maxValue = Math.max(1, ...series.map((point) => Number(point.value || 0)));
  const maxSecondary = Math.max(1, ...series.map((point) => Number(point.secondary || 0)));
  const hasSecondary = series.some((point) => typeof point.secondary === "number");

  const labelIndexes = Array.from(new Set([0, Math.floor(series.length / 2), Math.max(0, series.length - 1)]));

  if (chartType === "bar") {
    const gap = 4;
    const barWidth = Math.max(5, (innerWidth - Math.max(0, series.length - 1) * gap) / series.length);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label="Metric bar chart">
        {Array.from({ length: 5 }).map((_, index) => {
          const y = paddingY + (innerHeight / 4) * index;
          const tick = Math.round(maxValue * (1 - index / 4));
          return (
            <g key={`bar-grid-${index}`}>
              <line x1={paddingX} y1={y} x2={paddingX + innerWidth} y2={y} stroke="#EADDC0" strokeDasharray="4 4" />
              <text x={6} y={y + 4} fontSize="10" fill="#8A6D2B">{tick}</text>
            </g>
          );
        })}

        {series.map((point, index) => {
          const value = Number(point.value || 0);
          const barHeight = (value / maxValue) * innerHeight;
          const x = paddingX + index * (barWidth + gap);
          const y = paddingY + innerHeight - barHeight;
          return <rect key={`bar-${index}`} x={x} y={y} width={barWidth} height={barHeight} rx={3} fill="#B89443" />;
        })}

        {labelIndexes.map((index) => {
          const label = series[index]?.label;
          if (!label) return null;
          const x = paddingX + index * (barWidth + gap) + barWidth / 2;
          return <text key={`bar-label-${index}`} x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="#7A6435">{label}</text>;
        })}
      </svg>
    );
  }

  const primaryPoints = series.map((point, index) => {
    const x = series.length <= 1
      ? paddingX + innerWidth / 2
      : paddingX + (index / (series.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - ((Number(point.value || 0) / maxValue) * innerHeight);
    return { x, y };
  });
  const primaryPath = primaryPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = primaryPoints.length
    ? `${primaryPath} L ${primaryPoints[primaryPoints.length - 1].x} ${paddingY + innerHeight} L ${primaryPoints[0].x} ${paddingY + innerHeight} Z`
    : "";

  const secondaryPoints = hasSecondary
    ? series.map((point, index) => {
        const x = series.length <= 1
          ? paddingX + innerWidth / 2
          : paddingX + (index / (series.length - 1)) * innerWidth;
        const y = paddingY + innerHeight - ((Number(point.secondary || 0) / maxSecondary) * innerHeight);
        return { x, y };
      })
    : [];
  const secondaryPath = hasSecondary
    ? secondaryPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label="Metric line chart">
      {Array.from({ length: 5 }).map((_, index) => {
        const y = paddingY + (innerHeight / 4) * index;
        const tick = maxValue * (1 - index / 4);
        return (
          <g key={`line-grid-${index}`}>
            <line x1={paddingX} y1={y} x2={paddingX + innerWidth} y2={y} stroke="#EADDC0" strokeDasharray="4 4" />
            <text x={6} y={y + 4} fontSize="10" fill="#8A6D2B">{tick.toFixed(0)}</text>
          </g>
        );
      })}

      {areaPath ? <path d={areaPath} fill="url(#metricFill)" opacity={0.24} /> : null}
      {primaryPath ? <path d={primaryPath} fill="none" stroke="#B89443" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {primaryPoints.map((point, index) => <circle key={`primary-point-${index}`} cx={point.x} cy={point.y} r={3.4} fill="#FFF6DE" stroke="#A27D2D" strokeWidth={1.3} />)}
      {secondaryPath ? <path d={secondaryPath} fill="none" stroke="#315B8E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /> : null}

      {labelIndexes.map((index) => {
        const point = primaryPoints[index];
        const label = series[index]?.label;
        if (!point || !label) return null;
        return <text key={`line-label-${index}`} x={point.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#7A6435">{label}</text>;
      })}

      <defs>
        <linearGradient id="metricFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C9A85B" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <g>
        <text x={paddingX} y={16} fontSize="11" fill="#7A6435" fontWeight={600}>{valueLabel}</text>
        {hasSecondary && secondaryLabel ? <text x={paddingX + 100} y={16} fontSize="11" fill="#315B8E" fontWeight={600}>{secondaryLabel}</text> : null}
      </g>
    </svg>
  );
}

function DataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: DetailColumn[];
  rows: DetailRow[];
}) {
  return (
    <article className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#E2D2AE] bg-[#FFF9EB] px-4 py-8 text-sm text-[#6B5A34]">
          No data available for this section.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E9DAB7] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[#7A6435]">
                {columns.map((column) => <th key={column.key} className="px-3 py-2">{column.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1E5CB]">
              {rows.map((row, index) => (
                <tr key={`row-${index}`}>
                  {columns.map((column) => (
                    <td key={`${index}-${column.key}`} className="px-3 py-2">
                      {String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default function StatisticsMetric({
  metric,
  title,
  subtitle,
  initial_range = "month",
  initial_date_from = "",
  initial_date_to = "",
  detail: initialDetail,
}: StatisticsMetricProps) {
  const [range, setRange] = useState<RangeKey>(initial_range);
  const [dateFrom, setDateFrom] = useState(initial_date_from);
  const [dateTo, setDateTo] = useState(initial_date_to);
  const [detail, setDetail] = useState<MetricDetail>(initialDetail || EMPTY_DETAIL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async (nextRange: RangeKey, nextDateFrom = dateFrom, nextDateTo = dateTo) => {
    const params = new URLSearchParams({ range: nextRange });
    if (nextRange === "custom") {
      if (nextDateFrom) params.set("date_from", nextDateFrom);
      if (nextDateTo) params.set("date_to", nextDateTo);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/admin/statistics/${metric}/data?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load metric details.");
      }

      setRange((payload?.range as RangeKey) || nextRange);
      setDateFrom(String(payload?.date_from || nextDateFrom || ""));
      setDateTo(String(payload?.date_to || nextDateTo || ""));
      setDetail(payload?.detail || EMPTY_DETAIL);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load metric details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-5 py-8 text-[#2D2515] sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C6A75E]/30 blur-3xl" />
          <div className="absolute right-[-120px] top-[12%] h-[28rem] w-[28rem] rounded-full bg-[#E7D3A3]/30 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl space-y-6">
          <section className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_18px_50px_rgba(91,70,27,0.10)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link href="/admin/statistics" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B] hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Statistics
                </Link>
                <h1 className="mt-2 text-3xl font-bold">{title}</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">{subtitle}</p>
              </div>

              <button
                type="button"
                onClick={() => void loadDetail(range, dateFrom, dateTo)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-4 py-2.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Data
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E7D7B3] bg-[#FFF9EB] p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">
                <CalendarDays className="h-3.5 w-3.5" />
                Filter Range
              </div>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setRange(option.key);
                      if (option.key !== "custom") {
                        void loadDetail(option.key, dateFrom, dateTo);
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
                    onClick={() => void loadDetail("custom", dateFrom, dateTo)}
                    disabled={loading || !dateFrom || !dateTo}
                    className="inline-flex h-10 items-center rounded-lg bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                  >
                    Apply Range
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {detail.summary_cards.map((card, index) => (
              <article key={`${card.label}-${index}`} className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-4 shadow-[0_8px_24px_rgba(91,70,27,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#846B37]">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#2D2515]">{card.value}</p>
                {card.note ? <p className="mt-2 text-xs text-[#6B5A34]">{card.note}</p> : null}
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-[#E5D4AF] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
            <h2 className="text-lg font-semibold">{detail.chart_title}</h2>
            <p className="mt-1 text-xs text-[#6B5A34]">{detail.chart_subtitle}</p>
            <div className="mt-4 rounded-2xl border border-[#E7D7B3] bg-[#FFFDF8] p-3">
              <MetricChart
                series={detail.chart_series}
                chartType={detail.chart_type}
                valueLabel={detail.chart_value_label}
                secondaryLabel={detail.chart_secondary_label}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable title={detail.table_title} columns={detail.table_columns} rows={detail.table_rows} />
            {detail.secondary_table_title && detail.secondary_table_columns && detail.secondary_table_rows ? (
              <DataTable
                title={detail.secondary_table_title}
                columns={detail.secondary_table_columns}
                rows={detail.secondary_table_rows}
              />
            ) : null}
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
