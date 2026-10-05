import { Check, HelpCircle, Loader2, Palette, Pencil, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FONT_OPTIONS } from "@/Theme/fonts";
import AddMenu from "./AddMenu";
import ColorControl from "./ColorControl";
import { setGuideOpen } from "./selection";
import {
  discardChanges,
  redo,
  resetContent,
  resetTheme,
  restoreElement,
  saveChanges,
  setThemeColor,
  setThemeFont,
  stopEditing,
  themeDefaults,
  undo,
  useCanRedo,
  useCanUndo,
  useEditorState,
  useHiddenMap,
} from "./store";

const COLOUR_ROWS = [
  { key: "accent", label: "Accent", hint: "Buttons, highlights and gold details" },
  { key: "text", label: "Text", hint: "Main text colour" },
  { key: "surface", label: "Background", hint: "Soft cream panels and tints" },
] as const;

type Panel = "theme" | "deleted" | "more" | null;

/** Fixed bar at the bottom of the screen: undo, add, theme, deleted items, save and done. */
export default function EditorBar() {
  const editor = useEditorState();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const hidden = useHiddenMap();
  const deleted = Object.entries(hidden);
  const [panel, setPanel] = useState<Panel>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panel) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [panel]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveChanges();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the deleted list once there is nothing left in it.
  useEffect(() => {
    if (panel === "deleted" && deleted.length === 0) setPanel(null);
  }, [panel, deleted.length]);

  const busy = editor.loading || editor.saving || editor.uploads > 0;
  const status = editor.loading
    ? "Loading editor…"
    : editor.saving
      ? "Saving…"
      : editor.uploads > 0
        ? "Uploading picture…"
        : editor.dirty
          ? "You have unsaved changes"
          : "Click anything on the page to change it";

  const done = () => {
    if (editor.dirty && !window.confirm("You have changes that are not saved yet. Leave without saving them?")) return;
    stopEditing();
  };

  return createPortal(
    <div
      ref={root}
      data-editor-ui
      className="fixed bottom-4 left-1/2 z-[70] w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2"
    >
      {panel === "theme" && editor.design ? (
        <div className="absolute bottom-full left-1/2 mb-2 w-80 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Site colours &amp; fonts</h3>
            <button type="button" onClick={resetTheme} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Changes the whole website, not just this page.</p>

          <div className="mt-3 space-y-2.5">
            {COLOUR_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="truncate text-[11px] text-gray-500">{row.hint}</p>
                </div>
                <div className="rounded-lg bg-gray-900">
                  <ColorControl
                    label={editor.design!.colors[row.key]}
                    value={editor.design!.colors[row.key]}
                    fallback={() => editor.design!.colors[row.key]}
                    onChange={(hex) => setThemeColor(row.key, hex ?? themeDefaults.colors[row.key])}
                    align="right"
                    up
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["heading", "body"] as const).map((key) => (
              <label key={key} className="block text-xs font-medium text-gray-600">
                {key === "heading" ? "Headings font" : "Body font"}
                <select
                  value={editor.design!.fonts[key]}
                  onChange={(event) => setThemeFont(key, event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {panel === "deleted" ? (
        <div className="absolute bottom-full left-1/2 mb-2 w-96 max-w-[90vw] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-2">
            <div>
              <h3 className="text-sm font-semibold">Deleted items</h3>
              <p className="text-xs text-gray-500">Press Restore to bring something back where it was.</p>
            </div>
            <button
              type="button"
              onClick={() => deleted.forEach(([id]) => restoreElement(id))}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Restore all
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {deleted.map(([id, name]) => (
              <li key={id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm">{name || id}</span>
                <button
                  type="button"
                  onClick={() => restoreElement(id)}
                  className="shrink-0 rounded-lg bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel === "more" ? (
        <div className="absolute bottom-full right-0 mb-2 w-80 rounded-2xl border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl">
          <MenuItem
            title="How does this work?"
            hint="A quick guide to editing, moving and deleting."
            icon={<HelpCircle className="h-4 w-4 text-gray-500" />}
            onClick={() => {
              setPanel(null);
              setGuideOpen(true);
            }}
          />
          <MenuItem
            title="Throw away my changes"
            hint="Go back to the last saved version of the page."
            disabled={!editor.dirty}
            icon={<RotateCcw className="h-4 w-4 text-gray-500" />}
            onClick={() => {
              setPanel(null);
              if (window.confirm("Throw away all the changes you haven't saved yet?")) discardChanges();
            }}
          />
          <MenuItem
            title="Reset page to the original"
            hint="Clears your text, picture, colour, position and layout changes. Theme, logos, hero images and category circles are kept. Nothing is final until you save."
            icon={<Trash2 className="h-4 w-4 text-gray-500" />}
            onClick={() => {
              setPanel(null);
              if (window.confirm("Put the homepage text, pictures, colours and layout back to the original? You can still undo this before saving.")) {
                resetContent();
              }
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-gray-900 p-1.5 text-white shadow-2xl ring-1 ring-black/30">
        <span className="flex items-center gap-2 pl-3 pr-2 text-xs font-medium text-white/80">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editor.dirty ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : <Pencil className="h-3.5 w-3.5" />}
          <span className="hidden whitespace-nowrap lg:inline">{status}</span>
        </span>

        <BarButton onClick={undo} disabled={!canUndo} title="Undo your last change (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
          <span className="hidden xl:inline">Undo</span>
        </BarButton>
        <BarButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
          <span className="hidden xl:inline">Redo</span>
        </BarButton>

        <span className="mx-1 h-5 w-px bg-white/20" />

        <AddMenu variant="bar" />
        <BarButton onClick={() => setPanel(panel === "theme" ? null : "theme")} active={panel === "theme"} disabled={!editor.design} title="Change the site's colours and fonts">
          <Palette className="h-4 w-4" />
          Theme
        </BarButton>
        {deleted.length > 0 ? (
          <BarButton onClick={() => setPanel(panel === "deleted" ? null : "deleted")} active={panel === "deleted"} title="Bring back things you deleted">
            <Trash2 className="h-4 w-4" />
            Deleted ({deleted.length})
          </BarButton>
        ) : null}
        <BarButton onClick={() => setPanel(panel === "more" ? null : "more")} active={panel === "more"} disabled={!editor.ready}>
          More
        </BarButton>

        <span className="mx-1 h-5 w-px bg-white/20" />

        <button
          type="button"
          onClick={() => void saveChanges()}
          disabled={!editor.dirty || editor.saving || editor.uploads > 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          <Check className="h-4 w-4" />
          Save changes
        </button>
        <BarButton onClick={done} title="Finish editing">
          Done
        </BarButton>
      </div>
    </div>,
    document.body,
  );
}

function MenuItem({
  title,
  hint,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </button>
  );
}

function BarButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-white/20" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
