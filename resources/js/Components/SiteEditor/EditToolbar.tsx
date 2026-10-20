import { ImagePlus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ColorControl, { cssColorToHex } from "./ColorControl";
import { MoveHandle } from "./controls";
import { selectTarget, useSelectedTarget } from "./selection";
import { useEditorState } from "./store";
import type { EditTarget, SizeCap } from "./types";

const LINK_LIST_ID = "bl-edit-link-options";
const VALID_LINK = /^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)[^\s]*$/i;

/**
 * The little floating bar that follows whatever the owner has clicked: move it, recolour it, resize
 * it, point it somewhere, swap the picture, or delete it. Only the things that make sense for the
 * clicked element are shown.
 */
export default function EditToolbar() {
  const target = useSelectedTarget();
  const editor = useEditorState(); // re-render on any change so swatches and the link box stay current
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    let frame = 0;

    const place = () => {
      const el = bar.current;
      if (el) {
        if (!target.el.isConnected) {
          selectTarget(null);
          return;
        }
        const rect = target.el.getBoundingClientRect();
        const height = el.offsetHeight || 44;
        const width = el.offsetWidth || 240;
        const bottomBarRoom = 76;

        let top = rect.top - height - 8;
        if (top < 8) top = rect.bottom + 8; // not enough room above: go below
        if (top + height > window.innerHeight - bottomBarRoom) {
          // Tall element running off-screen: sit inside it near the top of the viewport.
          top = Math.min(Math.max(rect.top + 8, 64), window.innerHeight - height - bottomBarRoom);
        }
        const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));

        el.style.visibility = rect.bottom > 0 && rect.top < window.innerHeight ? "visible" : "hidden";
        el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      }
      frame = requestAnimationFrame(place);
    };

    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!target) return null;

  const hasOwnLook = target.resetLook?.has() ?? false;

  return createPortal(
    <div
      ref={bar}
      data-editor-ui
      data-edit-toolbar
      // Keep keyboard focus (and the caret) in the text being edited when a button is pressed.
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) event.preventDefault();
      }}
      className="fixed left-0 top-0 z-[70] flex w-max max-w-[min(94vw,920px)] flex-wrap items-center gap-1 rounded-xl bg-gray-900 px-1.5 py-1 text-white shadow-2xl ring-1 ring-black/20"
      style={{ visibility: "hidden" }}
    >
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">{target.label}</span>

      {target.move ? <MoveHandle el={() => target.el} cap={target.move} className="bg-white/10" /> : null}

      {target.color ? (
        <ColorControl
          label="Text colour"
          value={target.color.get()}
          fallback={() => cssColorToHex(getComputedStyle(target.el).color)}
          onChange={target.color.set}
        />
      ) : null}

      {target.background ? (
        <ColorControl
          label="Background"
          value={target.background.get()}
          fallback={() => cssColorToHex(getComputedStyle(target.el).backgroundColor)}
          onChange={target.background.set}
        />
      ) : null}

      {target.size ? <SizeControl cap={target.size} el={target.el} /> : null}
      {target.link ? <LinkField link={target.link} /> : null}
      {target.image ? <ImageActions image={target.image} /> : null}

      {hasOwnLook ? (
        <button
          type="button"
          onClick={target.resetLook?.run}
          title="Put the colours, size and position back to how they were"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3 w-3" />
          Original look
        </button>
      ) : null}

      {target.remove ? (
        <button
          type="button"
          onClick={() => {
            target.remove?.();
            selectTarget(null);
          }}
          title="Delete this (you can undo it)"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500/90 px-3 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => selectTarget(null)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {editor.categoryLinks.length > 0 ? (
        <datalist id={LINK_LIST_ID}>
          {editor.categoryLinks.map((option) => (
            <option key={option.href} value={option.href} label={option.label} />
          ))}
        </datalist>
      ) : null}
    </div>,
    document.body,
  );
}

function SizeControl({ cap, el }: { cap: SizeCap; el: HTMLElement }) {
  const builtIn = () => Math.round(parseFloat(getComputedStyle(el).fontSize) || 16);
  const current = cap.get() ?? builtIn();

  const bump = (direction: 1 | -1) => {
    const now = cap.get() ?? builtIn();
    const step = Math.max(1, Math.round(now / 10));
    cap.set(Math.max(8, Math.min(200, now + direction * step)));
  };

  const button = "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition hover:bg-white/10";

  return (
    <div className="flex items-center rounded-lg bg-white/5" title="Make the text bigger or smaller">
      <button type="button" onClick={() => bump(-1)} className={button} aria-label="Smaller text">
        A<span className="text-[9px]">−</span>
      </button>
      <span className="min-w-[2.2rem] text-center text-xs tabular-nums text-white/70">{current}px</span>
      <button type="button" onClick={() => bump(1)} className={button} aria-label="Bigger text">
        A<span className="text-[9px]">+</span>
      </button>
    </div>
  );
}

function LinkField({ link }: { link: NonNullable<EditTarget["link"]> }) {
  const current = link.get();
  const [value, setValue] = useState(current);
  const editing = useRef(false);

  // Follow outside changes (reset, switching elements) but never fight the owner while typing.
  useEffect(() => {
    if (!editing.current) setValue(current);
  }, [current]);

  const valid = value === "" || VALID_LINK.test(value);

  return (
    <label className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs">
      <span className="text-white/60">Goes to</span>
      <input
        type="text"
        value={value}
        list={link.suggestions ? LINK_LIST_ID : undefined}
        placeholder={link.blankHint ?? "/category/sale or https://…"}
        spellCheck={false}
        onFocus={() => (editing.current = true)}
        onBlur={() => {
          editing.current = false;
          if (!valid) setValue(current);
        }}
        onChange={(event) => {
          const next = event.target.value.trim();
          setValue(next);
          if (next === "" || VALID_LINK.test(next)) link.set(next);
        }}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className={`h-6 w-48 rounded bg-transparent px-1 text-white outline-none placeholder:text-white/30 ${
          valid ? "" : "ring-1 ring-red-400"
        }`}
        aria-label="Link address"
      />
    </label>
  );
}

function ImageActions({ image }: { image: NonNullable<EditTarget["image"]> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-500 px-3 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        {busy ? "Uploading…" : "Replace picture"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            await image.replace(file);
          } catch {
            // uploadImage already told the owner what went wrong
          } finally {
            setBusy(false);
          }
        }}
      />
      {image.reset && image.canReset() ? (
        <button
          type="button"
          onClick={image.reset}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3 w-3" />
          Original
        </button>
      ) : null}
    </>
  );
}
