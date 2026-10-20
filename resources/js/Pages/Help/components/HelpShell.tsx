import { Head, Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { ReactNode } from "react";

type HelpShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  showBackToHelp?: boolean;
  compactTop?: boolean;
  children: ReactNode;
};

export default function HelpShell({
  title,
  eyebrow,
  description,
  showBackToHelp = true,
  compactTop = false,
  children,
}: HelpShellProps) {
  return (
    <AuthenticatedLayout
      containerClassName="min-h-screen w-full flex flex-col bg-[#F6F4EF]"
      contentClassName="flex-1 w-full overflow-visible"
    >
      <Head title={title} />

      <div className={`w-full px-4 pb-12 ${compactTop ? "pt-1" : "pt-6"} md:px-8 lg:px-10`}>
        <div className="mx-auto max-w-[1360px]">
          {showBackToHelp ? (
            <Link
              href="/help"
              className={`${compactTop ? "mb-4" : "mb-6"} inline-flex items-center gap-2 rounded-xl border border-[#DDCFAF] bg-white px-3 py-2 text-sm font-medium text-[#4D4232] transition hover:border-[#C9A85B] hover:text-[#2F281E]`}
            >
              <ArrowLeft className="h-4 w-4" />
              Help Centre
            </Link>
          ) : null}

          <div className={`relative overflow-hidden rounded-3xl border border-[#E6DCC4] bg-gradient-to-br from-[#FFFDF8] via-[#FCFAF3] to-[#F6EFDD] px-6 ${compactTop ? "py-3" : "py-8"} shadow-[0_14px_40px_rgba(120,88,28,0.08)] md:px-8`}>
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#E8D1A1]/45 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[#EFE3C6]/55 blur-2xl" />

            {eyebrow ? (
              <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.16em] text-[#8C7749]">{eyebrow}</p>
            ) : null}
            <h1 className={`relative z-10 mt-2 font-semibold tracking-tight text-[#221A10] ${compactTop ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>{title}</h1>
            {description ? (
              <p className="relative z-10 mt-3 max-w-3xl text-[15px] leading-relaxed text-[#5A4D38]">{description}</p>
            ) : null}
          </div>

          <div className={compactTop ? "mt-3" : "mt-7"}>{children}</div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
