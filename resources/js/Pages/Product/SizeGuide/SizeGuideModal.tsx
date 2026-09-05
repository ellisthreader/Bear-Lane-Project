import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useSizeGuide, useSizeGuideData } from "./SizeGuideContext";

export default function SizeGuideModal() {
  const { isOpen, close, gender } = useSizeGuide();
  const guide = useSizeGuideData();

  useEffect(() => {
    if (!isOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [close, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${guide.heading} modal`}>
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#E8DAB8] bg-[#FFFCF6] shadow-[0_30px_70px_rgba(33,25,13,0.35)]">
        <header className="relative overflow-hidden border-b border-[#E9DFC8] bg-gradient-to-r from-[#FFF2D7] via-[#FFF8EA] to-[#FDF2D7] px-5 pb-5 pt-6 sm:px-7">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#E9D1A0]/30 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-[#DDB770]/20 blur-2xl" />

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full border border-[#D9C79E] bg-white/80 p-2 text-[#5C4B27] transition hover:bg-white"
            aria-label="Close size guide"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">{gender.toUpperCase()} Guide</p>
          <h2 className="mt-1 text-2xl font-black text-[#271D0F] sm:text-3xl">{guide.heading}</h2>
          <p className="mt-2 max-w-3xl text-sm text-[#5F4D29]">{guide.subtitle}</p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#FFFDF9] p-4 sm:p-6">
          {guide.sections.map((section) => {
            if (section.kind === "note") {
              return (
                <section key={section.id} className="rounded-2xl border border-[#E8DCC3] bg-white p-4 sm:p-5">
                  <h3 className="text-base font-bold text-[#2F2415]">{section.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C4C31]">{section.text}</p>
                </section>
              );
            }

            return (
              <section key={section.id} className="rounded-2xl border border-[#E8DCC3] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#2F2415]">{section.title}</h3>
                  <span className="rounded-full bg-[#FFF3DA] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8B6A2F]">
                    Measurements
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-[#EFE5D2]">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FBF4E5]">
                        {section.columns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap border-b border-[#EFE5D2] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#6A5530]"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, rowIndex) => (
                        <tr key={`${section.id}-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#FFFCF5]"}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${section.id}-${rowIndex}-${cellIndex}`} className="whitespace-nowrap border-b border-[#F2EBDD] px-3 py-2 text-[#413522]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {section.note ? <p className="mt-2 text-xs text-[#6B5A3D]">{section.note}</p> : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
