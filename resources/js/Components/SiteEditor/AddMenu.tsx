import { Image as ImageIcon, LayoutTemplate, MousePointerClick, Plus, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { revealElement } from "./selection";
import { sectionLabel } from "./sections";
import { addExtra, addSection, useEditorState, type ExtraKind } from "./store";

/** The section most of the window is looking at, used when "Add" is pressed from the bottom bar. */
function sectionInView(): string {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
  const middle = window.innerHeight / 2;
  const hit = sections.find((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top <= middle && rect.bottom >= middle;
  });
  return (hit ?? sections[0])?.dataset.section ?? "hero";
}

const OPTIONS: Array<{ kind: ExtraKind | "section"; label: string; hint: string; icon: typeof Type }> = [
  { kind: "text", label: "Text", hint: "A heading or a few words", icon: Type },
  { kind: "button", label: "Button", hint: "Links somewhere you choose", icon: MousePointerClick },
  { kind: "image", label: "Picture", hint: "Upload your own image", icon: ImageIcon },
  { kind: "section", label: "Blank section", hint: "A new empty strip to build in", icon: LayoutTemplate },
];

/**
 * "+ Add": puts a new text, button, picture (or a whole blank section) on the page.
 * On a section's own pill it adds to that section; from the bottom bar it adds to whatever you are looking at.
 */
export default function AddMenu({ section, variant }: { section?: string; variant: "pill" | "bar" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEditorState(); // keep the menu in step with the editing session

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (kind: ExtraKind | "section") => {
    setOpen(false);
    const target = section ?? sectionInView();

    if (kind === "section") {
      const id = addSection(target);
      toast.success("Added a blank section. Use + Add on it to put things inside.");
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          document.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
        ),
      );
      return;
    }

    const id = addExtra(target, kind);
    toast.success(`Added ${kind === "image" ? "a picture" : `a ${kind}`} to “${sectionLabel(target)}”. Press Move to put it where you want.`);
    revealElement(id, kind === "text");
  };

  const options = OPTIONS.filter((option) => variant === "bar" || option.kind !== "section");
  const popover = variant === "bar" ? "bottom-full mb-3 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <div ref={root} data-editor-ui className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title="Add text, a button or a picture"
        className={
          variant === "bar"
            ? `inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition ${open ? "bg-white/20" : "hover:bg-white/10"}`
            : "inline-flex h-7 items-center gap-1 rounded-full bg-blue-500 px-2.5 text-xs font-semibold text-white transition hover:bg-blue-400"
        }
      >
        <Plus className={variant === "bar" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Add
      </button>

      {open ? (
        <div className={`absolute z-20 w-64 rounded-2xl border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl ${popover}`}>
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {section || variant === "pill" ? "Add to this section" : "Add to the page"}
          </p>
          {options.map(({ kind, label, hint, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => choose(kind)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-100"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
