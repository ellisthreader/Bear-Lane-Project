import React from "react";
import { AlertTriangle, Palette } from "lucide-react";
import { contrastRatio, isHexColor } from "@/Theme/colorMath.js";
import type { SiteDesignColors } from "@/Theme/siteDesign";
import { Panel } from "./Panel";

type Props = {
  colors: SiteDesignColors;
  onChange: (key: keyof SiteDesignColors, value: string) => void;
  onApplyPreset: (colors: SiteDesignColors) => void;
};

const FIELDS: Array<{ key: keyof SiteDesignColors; label: string; hint: string }> = [
  { key: "accent", label: "Brand colour", hint: "Buttons, highlights, borders and links." },
  { key: "text", label: "Text colour", hint: "Headings, body copy and labels." },
  { key: "surface", label: "Background tint", hint: "Page and card backgrounds." },
];

const PRESETS: Array<{ name: string; colors: SiteDesignColors }> = [
  { name: "Classic Gold", colors: { accent: "#C6A75E", text: "#2D2515", surface: "#FFFCF4" } },
  { name: "Midnight", colors: { accent: "#3B5BA9", text: "#141B2D", surface: "#F6F8FC" } },
  { name: "Forest", colors: { accent: "#3F7D5A", text: "#1C2B22", surface: "#F5FAF6" } },
  { name: "Rose", colors: { accent: "#C25E7A", text: "#2E1A22", surface: "#FFF6F8" } },
  { name: "Slate", colors: { accent: "#5B6B7F", text: "#1F242B", surface: "#F7F8FA" } },
  { name: "Terracotta", colors: { accent: "#C0623B", text: "#2B1D16", surface: "#FFF8F3" } },
];

export default function ColorsPanel({ colors, onChange, onApplyPreset }: Props) {
  const contrast = isHexColor(colors.text) && isHexColor(colors.surface) ? contrastRatio(colors.text, colors.surface) : 21;
  const lowContrast = contrast < 4.5;

  return (
    <Panel title="Colours" description="Pick a colour and every shade across the site follows." icon={<Palette className="h-5 w-5" />}>
      <div className="space-y-3">
        {FIELDS.map((field) => (
          <ColorField key={field.key} label={field.label} hint={field.hint} value={colors[field.key]} onChange={(value) => onChange(field.key, value)} />
        ))}
      </div>

      {lowContrast ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Text and background are close in tone, so copy may be hard to read. Try a darker text colour or a lighter background.
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Quick palettes</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = (Object.keys(preset.colors) as Array<keyof SiteDesignColors>).every(
              (key) => preset.colors[key].toUpperCase() === colors[key].toUpperCase(),
            );
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onApplyPreset(preset.colors)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "border-[#C29A4F] bg-[#FFF8E7] text-[#7D6228]" : "border-[#E4D2AA] bg-white text-[#6B5A34] hover:border-[#C29A4F]"
                }`}
              >
                <span className="flex -space-x-1">
                  <span className="h-3.5 w-3.5 rounded-full border border-white" style={{ background: preset.colors.accent }} />
                  <span className="h-3.5 w-3.5 rounded-full border border-white" style={{ background: preset.colors.text }} />
                  <span className="h-3.5 w-3.5 rounded-full border border-white" style={{ background: preset.colors.surface }} />
                </span>
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  const [text, setText] = React.useState(value);
  React.useEffect(() => setText(value), [value]);

  const commitText = (next: string) => {
    const candidate = next.trim().startsWith("#") ? next.trim() : `#${next.trim()}`;
    if (isHexColor(candidate)) onChange(candidate.toUpperCase());
    else setText(value);
  };

  return (
    <label className="flex items-center gap-3 rounded-xl border border-[#EDE0BF] bg-[#FFFDF8] p-3">
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#DCC99D] shadow-inner" style={{ background: value }}>
        <input
          type="color"
          value={isHexColor(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} picker`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#5F4C2A]">{label}</span>
        <span className="block text-xs text-[#8A7B5A]">{hint}</span>
      </span>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => commitText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitText((event.target as HTMLInputElement).value);
        }}
        spellCheck={false}
        className="w-24 rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5 font-mono text-xs uppercase text-[#2D2515]"
        aria-label={`${label} hex value`}
      />
    </label>
  );
}
