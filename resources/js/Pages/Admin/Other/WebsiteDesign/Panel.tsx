import React from "react";

type PanelProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function Panel({ title, description, icon, action, children }: PanelProps) {
  return (
    <section className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2CCA1] bg-[#FFF8E7] text-[#8A6D2B]">
            {icon}
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#2D2515]">{title}</h2>
            <p className="mt-0.5 text-sm text-[#6B5A34]">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#DCC99D] bg-white px-3 py-1.5 text-xs font-semibold text-[#7D6228] transition hover:border-[#C29A4F] hover:bg-[#FFF8E7] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
