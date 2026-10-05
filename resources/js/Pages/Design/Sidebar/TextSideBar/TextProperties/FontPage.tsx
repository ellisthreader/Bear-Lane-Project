"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import {
  DEFAULT_DESIGN_FONT,
  DESIGN_FONTS,
  DESIGN_FONT_CATEGORY_LABELS,
  loadAllDesignFonts,
  toCssFontFamily,
  type DesignFontCategory,
} from "../../../constants/designFonts";
import { ensureGoogleFontsLoaded, findFont } from "@/Theme/fonts";

type Props = {
  fontFamily: string;
  textValue: string;
  onFontChange: (v: string) => void;
  onBack: () => void;
};

const CATEGORY_ORDER: DesignFontCategory[] = ["sans", "serif", "display", "script", "mono"];

export default function FontPage({ fontFamily, textValue, onFontChange, onBack }: Props) {
  const [search, setSearch] = useState("");
  const [fontsReady, setFontsReady] = useState(false);

  const activeFont = (fontFamily || DEFAULT_DESIGN_FONT).trim().toLowerCase();

  // Load every editor font once so the preview rows render in the real face.
  useEffect(() => {
    let cancelled = false;
    if (typeof document !== "undefined") {
      ensureGoogleFontsLoaded(document, [findFont("Inter")]);
    }
    void loadAllDesignFonts().then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: DESIGN_FONT_CATEGORY_LABELS[category],
      fonts: DESIGN_FONTS.filter(
        (font) => font.category === category && (query === "" || font.name.toLowerCase().includes(query))
      ),
    })).filter((group) => group.fonts.length > 0);
  }, [search]);

  const previewText = textValue.trim() || "Sample Text";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="transition hover:text-[#8A6D2B]" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold">Choose a Font</h2>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          placeholder="Search fonts..."
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#C6A75E]"
        />
      </div>

      {!fontsReady ? <p className="text-xs text-gray-400">Loading font previews…</p> : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.category}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">{group.label}</p>
            <div className="flex flex-col gap-2">
              {group.fonts.map((font) => {
                const isActive = font.name.toLowerCase() === activeFont;
                return (
                  <button
                    key={font.name}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      onFontChange(font.name);
                      onBack();
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#C6A75E] bg-[#C6A75E]/15"
                        : "border-gray-100 hover:border-[#C6A75E]/50 hover:bg-[#C6A75E]/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xl leading-tight" style={{ fontFamily: toCssFontFamily(font.name) }}>
                        {previewText}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{font.name}</div>
                    </div>
                    {isActive ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6A75E] text-white">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {groups.length === 0 && <div className="p-2 text-sm italic text-gray-400">No fonts found</div>}
      </div>
    </div>
  );
}
