import React from "react";
import { Type } from "lucide-react";
import { FONT_OPTIONS, ensureGoogleFontsLoaded, findFont } from "@/Theme/fonts";
import type { SiteDesignFonts } from "@/Theme/siteDesign";
import { Panel } from "./Panel";

type Props = {
  fonts: SiteDesignFonts;
  onChange: (key: keyof SiteDesignFonts, value: string) => void;
};

const FIELDS: Array<{ key: keyof SiteDesignFonts; label: string; sample: string; sampleClass: string }> = [
  { key: "heading", label: "Headings", sample: "Design-led products that build brand trust", sampleClass: "text-xl font-bold" },
  { key: "body", label: "Body text", sample: "Premium heavyweight cotton with custom front and sleeve print, made to order.", sampleClass: "text-sm" },
];

export default function FontsPanel({ fonts, onChange }: Props) {
  const heading = findFont(fonts.heading);
  const body = findFont(fonts.body);

  React.useEffect(() => {
    ensureGoogleFontsLoaded(document, [heading, body]);
  }, [heading, body]);

  return (
    <Panel title="Fonts" description="Choose typefaces for headings and body copy." icon={<Type className="h-5 w-5" />}>
      {FIELDS.map((field) => {
        const font = findFont(fonts[field.key]);
        return (
          <div key={field.key} className="rounded-xl border border-[#EDE0BF] bg-[#FFFDF8] p-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[#5F4C2A]">{field.label}</span>
              <select
                value={font.name}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="w-48 rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
              >
                <optgroup label="Default">
                  {FONT_OPTIONS.filter((option) => option.category === "system").map((option) => (
                    <option key={option.name} value={option.name}>{option.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Sans serif">
                  {FONT_OPTIONS.filter((option) => option.category === "sans").map((option) => (
                    <option key={option.name} value={option.name}>{option.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Serif">
                  {FONT_OPTIONS.filter((option) => option.category === "serif").map((option) => (
                    <option key={option.name} value={option.name}>{option.label}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <p className={`mt-3 truncate text-[#2D2515] ${field.sampleClass}`} style={{ fontFamily: font.stack }}>
              {field.sample}
            </p>
          </div>
        );
      })}
    </Panel>
  );
}
