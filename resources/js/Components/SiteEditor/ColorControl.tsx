import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

const PRESETS = [
  "#FFFFFF",
  "#FFFCF4",
  "#F5EFE2",
  "#C9A24D",
  "#8A6D2B",
  "#2D2515",
  "#1F1A13",
  "#000000",
  "#B91C1C",
  "#15803D",
  "#1D4ED8",
  "#007782",
];

/** "rgb(12, 34, 56)" -> "#0C2238". Anything it cannot read (e.g. transparent) becomes white. */
export function cssColorToHex(value: string): string {
  const match = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i);
  if (!match) return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : "#FFFFFF";
  if (match[4] !== undefined && Number(match[4]) === 0) return "#FFFFFF";
  return (
    "#" +
    [match[1], match[2], match[3]]
      .map((channel) => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

type Props = {
  label: string;
  /** The owner's colour, or undefined when the built-in one is in use. */
  value: string | undefined;
  /** Shown as the starting colour when nothing is set (read from the page). */
  fallback: () => string;
  onChange: (hex: string | undefined) => void;
  align?: "left" | "right";
  /** Opens above the button instead of below (for bars pinned to the bottom of the screen). */
  up?: boolean;
};

/** A swatch button that opens a small palette: presets, a free colour picker and a hex box. */
export default function ColorControl({ label, value, fallback, onChange, align = "left", up = false }: Props) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const shown = value ?? (open ? fallback() : "#FFFFFF");

  useEffect(() => {
    if (!open) return;
    setHex((value ?? fallback()).toUpperCase());
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (next: string) => {
    const clean = next.startsWith("#") ? next : `#${next}`;
    setHex(clean.toUpperCase());
    if (/^#[0-9a-f]{6}$/i.test(clean)) onChange(clean.toUpperCase());
  };

  return (
    <div ref={root} className="relative" data-editor-ui>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/90 transition hover:bg-white/10"
        aria-label={label}
        aria-expanded={open}
      >
        <span
          className="h-4 w-4 rounded-full ring-1 ring-white/50"
          style={{ background: value ?? "conic-gradient(#f87171, #fbbf24, #4ade80, #60a5fa, #c084fc, #f87171)" }}
        />
        {label}
      </button>

      {open ? (
        <div
          className={`absolute z-10 w-56 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-2xl ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => commit(preset)}
                className="relative h-7 w-7 rounded-full border border-gray-300 transition hover:scale-110"
                style={{ background: preset }}
                aria-label={`Use ${preset}`}
              >
                {shown.toUpperCase() === preset ? (
                  <Check className={`absolute inset-0 m-auto h-3.5 w-3.5 ${preset === "#FFFFFF" || preset === "#FFFCF4" || preset === "#F5EFE2" ? "text-gray-800" : "text-white"}`} />
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#FFFFFF"}
              onChange={(event) => commit(event.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
              aria-label="Pick any colour"
            />
            <input
              type="text"
              value={hex}
              onChange={(event) => commit(event.target.value)}
              maxLength={7}
              spellCheck={false}
              className="h-8 min-w-0 flex-1 rounded-lg border border-gray-300 px-2 font-mono text-xs uppercase outline-none focus:border-blue-500"
              aria-label="Hex colour"
            />
          </div>

          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-900"
            >
              <RotateCcw className="h-3 w-3" />
              Back to original
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
