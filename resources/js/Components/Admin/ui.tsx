import React from "react";
import { Head, Link } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, Check, Info, Loader2, Minus, Plus } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

/*
 * Shared building blocks for the admin console.
 *
 * Every admin screen that manages store options (homepage, delivery, measurements,
 * categories, personalisation) is built from these pieces so the console reads as
 * one calm, consistent surface: warm cream canvas, soft hairline borders, a single
 * gold accent for the primary action and a dark ink button for "Save".
 */

export const getCsrfToken = () =>
  (typeof document !== "undefined"
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    : "") || "";

type AdminFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

/**
 * Small fetch wrapper used by the admin pages. Sends the CSRF token, parses the JSON
 * body and turns validation errors into a readable Error message.
 */
export async function adminFetch<T = any>(url: string, options: AdminFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-CSRF-TOKEN": getCsrfToken(),
    "X-Requested-With": "XMLHttpRequest",
  };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers,
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation =
      data && typeof data.errors === "object" && data.errors !== null
        ? Object.values(data.errors as Record<string, string[] | string>)
            .flat()
            .filter(Boolean)
            .join(" ")
        : "";
    throw new Error(data?.message || validation || `Request failed (${response.status})`);
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

type AdminPageProps = {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  headTitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  width?: "narrow" | "default" | "wide";
  children: React.ReactNode;
};

export function AdminPage({
  title,
  eyebrow,
  description,
  headTitle,
  backHref,
  backLabel = "Back",
  actions,
  width = "default",
  children,
}: AdminPageProps) {
  const maxWidth = width === "narrow" ? "max-w-4xl" : width === "wide" ? "max-w-7xl" : "max-w-6xl";

  return (
    <AuthenticatedLayout>
      <Head title={headTitle ?? `Admin · ${title}`} />
      <AdminTopNav />
      <div className="min-h-screen bg-[#FAF7F0] px-4 pb-28 pt-8 text-[#2D2515] sm:px-8">
        <div className={`mx-auto w-full ${maxWidth} space-y-6`}>
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              {backHref ? (
                <Link
                  href={backHref}
                  className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6D2B] transition hover:text-[#5E4A1A]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backLabel}
                </Link>
              ) : null}
              {eyebrow ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A38A4F]">{eyebrow}</p>
              ) : null}
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[#1F1A13] sm:text-[34px]">{title}</h1>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B5A34]">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </header>
          {children}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Cards & layout                                                      */
/* ------------------------------------------------------------------ */

type CardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  tone?: "default" | "muted";
};

export function Card({ title, description, actions, children, className = "", padding = "md", tone = "default" }: CardProps) {
  const pad = padding === "none" ? "" : padding === "sm" ? "p-4" : "p-5 sm:p-6";
  const bg = tone === "muted" ? "bg-[#FFFDF8]" : "bg-white";
  return (
    <section className={`rounded-2xl border border-[#EBE2CF] ${bg} shadow-[0_1px_2px_rgba(63,47,17,0.04),0_12px_32px_-18px_rgba(63,47,17,0.25)] ${className}`}>
      {title || actions ? (
        <div className={`flex flex-wrap items-start justify-between gap-3 ${padding === "none" ? "px-5 pt-5" : pad} ${children ? "pb-0" : ""}`}>
          <div className="min-w-0">
            {title ? <h2 className="text-base font-bold text-[#1F1A13]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-[#6B5A34]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className={`${pad} ${title || actions ? "pt-4" : ""}`}>{children}</div> : null}
    </section>
  );
}

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B] ${className}`}>{children}</p>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger" | "dangerGhost";
type ButtonSize = "xs" | "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  full?: boolean;
};

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "bg-[#1F1A12] text-white hover:bg-[#3A3021] border border-transparent shadow-sm",
  gold: "bg-[#C6A75E] text-white hover:bg-[#B8964B] border border-transparent shadow-sm",
  secondary: "bg-white text-[#4E3F1F] border border-[#DCCFB4] hover:border-[#C6A75E] hover:bg-[#FFFCF4]",
  ghost: "bg-transparent text-[#6B5A34] border border-transparent hover:bg-[#F6EFDF]",
  danger: "bg-[#B42318] text-white border border-transparent hover:bg-[#9A1E14]",
  dangerGhost: "bg-white text-[#A63D2F] border border-[#F0CFC8] hover:bg-[#FFF5F3] hover:border-[#E0A79C]",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  xs: "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-9 px-3 text-sm gap-2 rounded-xl",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
};

export function Button({
  variant = "secondary",
  size = "sm",
  icon,
  loading = false,
  full = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50 disabled:cursor-not-allowed disabled:opacity-55 ${buttonVariantClass[variant]} ${buttonSizeClass[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "default" | "gold" | "danger" | "success";
  size?: "sm" | "md";
  active?: boolean;
};

const iconToneClass = {
  default: "border-[#DCCFB4] bg-white text-[#6B5A34] hover:border-[#C6A75E] hover:text-[#8A6D2B]",
  gold: "border-[#C6A75E] bg-[#FFF8E7] text-[#8A6D2B] hover:bg-[#FFF1D3]",
  danger: "border-[#F0CFC8] bg-white text-[#A63D2F] hover:bg-[#FFF5F3]",
  success: "border-[#BFE3C6] bg-[#F1FBF3] text-[#1E7B3A] hover:bg-[#E3F6E8]",
};

export function IconButton({ label, tone = "default", size = "md", active = false, className = "", children, type = "button", ...rest }: IconButtonProps) {
  const dims = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50 disabled:cursor-not-allowed disabled:opacity-50 ${dims} ${iconToneClass[tone]} ${active ? "ring-2 ring-[#C6A75E]/40" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A round "+" or "−" control: the one-click add / remove pattern used across the console. */
export function PlusMinusButton({
  mode,
  label,
  onClick,
  disabled,
  size = "md",
}: {
  mode: "add" | "remove";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const cls =
    mode === "add"
      ? "border-[#C6A75E] bg-[#1F1A12] text-white hover:bg-[#3A3021]"
      : "border-[#E5C6C0] bg-white text-[#A63D2F] hover:bg-[#FFF5F3]";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50 disabled:cursor-not-allowed disabled:opacity-45 ${dims} ${cls}`}
    >
      {mode === "add" ? <Plus className={iconSize} strokeWidth={2.4} /> : <Minus className={iconSize} strokeWidth={2.4} />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export const inputClass =
  "w-full rounded-xl border border-[#DCCFB4] bg-white px-3.5 py-2.5 text-sm text-[#1F1A13] placeholder:text-[#B3A585] transition focus:border-[#C6A75E] focus:outline-none focus:ring-2 focus:ring-[#C6A75E]/25 disabled:cursor-not-allowed disabled:bg-[#F7F2E7] disabled:text-[#9A8C6A]";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = "",
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[#6B5A34]">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-[#A63D2F]">{error}</p> : hint ? <p className="mt-1.5 text-xs text-[#8F8060]">{hint}</p> : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...rest },
  ref
) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...rest} />;
});

export function Select({ className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238A6D2B%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[length:12px_12px] bg-[position:right_12px_center] bg-no-repeat pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[96px] resize-y ${className}`} {...rest} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <label className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex shrink-0 items-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50 ${track} ${
          checked ? "border-[#1F1A12] bg-[#1F1A12]" : "border-[#D6CAB0] bg-[#EFE7D6]"
        }`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow transition-transform ${knob} ${checked ? shift : "translate-x-0.5"}`}
        />
      </button>
      {label || description ? (
        <span className="min-w-0">
          {label ? <span className="block text-sm font-semibold text-[#1F1A13]">{label}</span> : null}
          {description ? <span className="block text-xs text-[#8F8060]">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  label,
  className = "",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={`inline-flex h-10 items-stretch overflow-hidden rounded-xl border border-[#DCCFB4] bg-white ${className}`} aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label ?? "value"}`}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="flex w-9 items-center justify-center text-[#6B5A34] transition hover:bg-[#F6EFDF] disabled:opacity-35"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isFinite(next)) return;
          onChange(clamp(next));
        }}
        className="w-16 border-x border-[#EFE6D3] text-center text-sm font-semibold text-[#1F1A13] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Increase ${label ?? "value"}`}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="flex w-9 items-center justify-center text-[#6B5A34] transition hover:bg-[#F6EFDF] disabled:opacity-35"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation & status                                                 */
/* ------------------------------------------------------------------ */

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: Array<{ key: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-[#EBE2CF] bg-[#F6F0E2] p-1 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              active ? "bg-white text-[#1F1A13] shadow-sm" : "text-[#7A6640] hover:text-[#1F1A13]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#1F1A12] text-white" : "bg-[#E7DCC3] text-[#6B5A34]"}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "success" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "border-[#E7DCC3] bg-[#FAF6EC] text-[#6B5A34]",
    gold: "border-[#E2CC94] bg-[#FFF5DC] text-[#7A5C1E]",
    success: "border-[#BFE3C6] bg-[#EFFAF2] text-[#1E7B3A]",
    danger: "border-[#F0CFC8] bg-[#FFF5F3] text-[#A63D2F]",
    info: "border-[#C9DCF0] bg-[#EFF5FD] text-[#2B5C9C]",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Notice({ tone = "info", children, className = "" }: { tone?: "info" | "success" | "error"; children: React.ReactNode; className?: string }) {
  const map = {
    info: { cls: "border-[#E7DCC3] bg-[#FFFBF1] text-[#5E4A1A]", Icon: Info },
    success: { cls: "border-[#BFE3C6] bg-[#EFFAF2] text-[#1E7B3A]", Icon: Check },
    error: { cls: "border-[#F0CFC8] bg-[#FFF5F3] text-[#A63D2F]", Icon: AlertCircle },
  };
  const { cls, Icon } = map[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${cls} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DFD3B7] bg-[#FFFDF8] text-center ${compact ? "px-4 py-6" : "px-6 py-10"}`}>
      {icon ? <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6EFDF] text-[#8A6D2B]">{icon}</div> : null}
      <p className="text-sm font-bold text-[#1F1A13]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-[#7A6640]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Sticky footer that appears while there are unsaved changes. Keeps "Save" one
 * click away no matter how long the page is.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = "Save changes",
  note,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  label?: string;
  note?: React.ReactNode;
}) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 transition-all duration-300 ${
        dirty ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      aria-hidden={!dirty}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-[#E3D6B8] bg-white/95 px-4 py-3 shadow-[0_18px_46px_rgba(91,70,27,0.22)] backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1F1A13]">Unsaved changes</p>
          {note ? <p className="truncate text-xs text-[#7A6640]">{note}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onDiscard ? (
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
          ) : null}
          <Button variant="primary" size="md" onClick={onSave} loading={saving} icon={<Check className="h-4 w-4" />}>
            {label}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Numeric helper used by price inputs: keeps two decimals and never NaN. */
export const toMoney = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
};

export const formatMoney = (value: unknown) => `£${toMoney(value).toFixed(2)}`;
