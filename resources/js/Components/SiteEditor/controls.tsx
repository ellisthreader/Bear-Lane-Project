import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Move, Plus, Trash2 } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { announceDeleted, nameFor } from "./actions";
import AddMenu from "./AddMenu";
import ColorControl from "./ColorControl";
import { beginMove } from "./drag";
import { colourCap, ContentImage, cx, EditAction, EditText, moveCap, useLook } from "./primitives";
import { effectiveSectionOrder, isCustomSection, sectionLabel } from "./sections";
import {
  addListItem,
  deleteSection,
  extraKey,
  extraKindOf,
  extraList,
  moveListItem,
  moveSection,
  removeListItem,
  useEditMode,
  useHidden,
  useHiddenMap,
  useListIds,
  useSectionConfig,
  useStyleEntry,
  useVisibleIds,
} from "./store";
import type { MoveCap, SectionKey } from "./types";

/* Small dark pill buttons used by the per-section and per-item controls. */
export function PillButton({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
        danger ? "hover:bg-red-500" : "hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}

/**
 * "Move": press and drag to put the element anywhere; the arrow keys nudge it a little.
 * `el` is the thing that moves (resolved when the drag starts, since it may be the handle's parent).
 */
export function MoveHandle({ el, cap, className }: { el: () => HTMLElement | null; cap: MoveCap; className?: string }) {
  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 25 : 5;
    const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    const now = cap.get();
    cap.set(now.x + dx, now.y + dy);
  };

  return (
    <button
      type="button"
      title="Press and drag to move it anywhere (arrow keys nudge it)"
      aria-label="Move"
      onPointerDown={(event) => {
        const target = el();
        if (target) beginMove(event, target, cap);
      }}
      onKeyDown={nudge}
      className={cx(
        "inline-flex h-7 cursor-grab touch-none items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-white transition hover:bg-white/20 active:cursor-grabbing",
        className,
      )}
    >
      <Move className="h-3.5 w-3.5" />
      Move
    </button>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Sections
 * ---------------------------------------------------------------------------------------------- */

type SectionProps = {
  id: SectionKey;
  children: ReactNode;
  /** Tailwind `order-*` class that places the section in the page. */
  orderClass?: string;
  /** Sections that are only an image (the hero) have no background colour to pick. */
  noBackground?: boolean;
  /** Extra section-specific buttons for the control pill (e.g. "Choose products"). */
  extra?: ReactNode;
};

/**
 * Wraps a homepage section: gives it a background colour and a place in the page order, lets the
 * owner delete it or add things to it, and shows the blocks they added. Visitors only see the
 * section; the pill is edit-mode only.
 */
export function EditSection({ id, children, orderClass, noBackground, extra }: SectionProps) {
  const editing = useEditMode();
  const config = useSectionConfig();
  const hiddenMap = useHiddenMap();
  const hidden = useHidden(`section.${id}`);
  const look = useLook(`section.${id}`);
  // Arrows only consider sections that are still on the page.
  const visible = effectiveSectionOrder(config).filter((item) => !(`section.${item}` in hiddenMap));
  const index = visible.indexOf(id);

  if (hidden) return null;

  return (
    <div data-section={id} className={cx("group/section relative bg-white", orderClass)} style={look.style}>
      {editing ? (
        <div
          data-editor-ui
          className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-gray-900/90 py-1 pl-3 pr-1 text-xs text-white shadow-lg backdrop-blur transition group-hover/section:bg-gray-900"
        >
          <span className="mr-1 whitespace-nowrap font-semibold">{sectionLabel(id)}</span>
          <PillButton title="Move this section up the page" disabled={index <= 0} onClick={() => moveSection(id, -1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton title="Move this section down the page" disabled={index === -1 || index >= visible.length - 1} onClick={() => moveSection(id, 1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </PillButton>
          {noBackground ? null : <SectionBackground id={id} />}
          <AddMenu section={id} variant="pill" />
          {extra}
          <PillButton
            title="Delete this section"
            danger
            onClick={() => {
              const name = `section “${sectionLabel(id)}”`;
              deleteSection(id, sectionLabel(id));
              announceDeleted(name);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </PillButton>
        </div>
      ) : null}
      {children}
      <ExtraBlocks section={id} />
    </div>
  );
}

function SectionBackground({ id }: { id: SectionKey }) {
  const styleId = `section.${id}`;
  const value = useStyleEntry(styleId)?.background;

  return (
    <ColorControl label="Background" value={value} fallback={() => "#FFFFFF"} onChange={colourCap(styleId, "background").set} />
  );
}

const NO_IDS: string[] = [];

/**
 * What a blank section shows while editing: room under its control pill, and a hint while it is
 * still empty. Visitors see nothing here (just whatever was put inside).
 */
export function BlankSection({ id }: { id: SectionKey }) {
  const editing = useEditMode();
  const blocks = useListIds(extraList(id), NO_IDS);
  if (!editing || !isCustomSection(id)) return null;

  if (blocks.length > 0) return <div className="h-12" />;

  return (
    <div className="mx-auto mb-10 mt-14 flex min-h-[140px] max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 px-6 text-center text-sm text-blue-600">
      This is a blank section. Use “+ Add” above to put text, buttons or pictures in it.
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Text, buttons and pictures the owner added
 * ---------------------------------------------------------------------------------------------- */

export function ExtraBlocks({ section }: { section: SectionKey }) {
  const ids = useListIds(extraList(section), NO_IDS);
  if (ids.length === 0) return null;

  return (
    <>
      {ids.map((itemId) => {
        const key = extraKey(section, itemId);
        const kind = extraKindOf(itemId);

        if (kind === "button") {
          return (
            <div key={itemId} className="flex justify-center px-6 py-8">
              <EditAction
                id={key}
                label="Click me"
                defaultHref="/"
                className="rounded-2xl bg-[#C9A24D] px-8 py-4 font-semibold text-white shadow-lg transition hover:opacity-90"
              />
            </div>
          );
        }
        if (kind === "image") {
          return (
            <div key={itemId} className="mx-auto max-w-2xl px-6 py-8">
              <ContentImage id={key} src="/images/placeholder.jpg" alt="" label="Picture" className="w-full rounded-2xl object-cover" />
            </div>
          );
        }
        return (
          <div key={itemId} className="mx-auto max-w-3xl px-6 py-8 text-center">
            <EditText id={key} as="p" label="Text" className="text-xl leading-relaxed text-[#2D2515]">
              Click here and type your own text
            </EditText>
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Repeated items (steps, reviews, footer links, ...)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Move / delete controls for one item of a list. The item's container needs `relative group/item`.
 * `axis` is the direction the list is laid out in, which decides the arrow icons. With a `styleId`
 * the pill also offers a background colour and a free "Move" handle for the whole item.
 */
export function ItemControls({
  listId,
  itemId,
  defaults,
  axis = "x",
  min = 0,
  styleId,
  noun = "item",
  position = "-top-4 right-3",
}: {
  listId: string;
  itemId: string;
  defaults: string[];
  axis?: "x" | "y";
  min?: number;
  styleId?: string;
  /** What to call the item in messages ("step", "review"…). */
  noun?: string;
  /** Tailwind classes placing the pill inside the item (which needs `relative group/item`). */
  position?: string;
}) {
  const editing = useEditMode();
  const ids = useVisibleIds(listId, defaults);
  const background = useStyleEntry(styleId ?? "")?.background;
  const root = useRef<HTMLDivElement>(null);
  if (!editing) return null;

  const index = ids.indexOf(itemId);
  const Earlier = axis === "x" ? ChevronLeft : ArrowUp;
  const Later = axis === "x" ? ChevronRight : ArrowDown;
  const container = () => root.current?.parentElement ?? null;

  return (
    <div
      ref={root}
      data-editor-ui
      className={cx(
        // Hangs over the item's edge and ignores the mouse until the item is hovered, so it never covers
        // (or blocks clicks on) what is inside the item.
        "pointer-events-none absolute z-30 flex items-center gap-0.5 rounded-full bg-gray-900/90 p-0.5 text-white opacity-0 shadow-lg transition focus-within:pointer-events-auto focus-within:opacity-100 group-hover/item:pointer-events-auto group-hover/item:opacity-100",
        position,
      )}
    >
      {styleId ? <MoveHandle el={container} cap={moveCap(styleId)} /> : null}
      <PillButton title="Move earlier in the list" disabled={index <= 0} onClick={() => moveListItem(listId, itemId, -1, defaults)}>
        <Earlier className="h-3.5 w-3.5" />
      </PillButton>
      <PillButton title="Move later in the list" disabled={index === -1 || index >= ids.length - 1} onClick={() => moveListItem(listId, itemId, 1, defaults)}>
        <Later className="h-3.5 w-3.5" />
      </PillButton>
      {styleId ? (
        <ColorControl label="Colour" value={background} fallback={() => "#FFFFFF"} onChange={colourCap(styleId, "background").set} align="right" />
      ) : null}
      <PillButton
        title={`Delete this ${noun}`}
        danger
        disabled={ids.length <= min}
        onClick={() => {
          const name = nameFor(noun, container());
          removeListItem(listId, itemId, defaults, name);
          announceDeleted(name);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </PillButton>
    </div>
  );
}

export function AddItemButton({
  listId,
  defaults,
  label,
  max,
  className,
  wrapperClassName,
}: {
  listId: string;
  defaults: string[];
  label: string;
  max?: number;
  className?: string;
  /** Classes for a wrapper div (spacing, centring). It only exists in edit mode, so visitors see no extra gap. */
  wrapperClassName?: string;
}) {
  const editing = useEditMode();
  const ids = useVisibleIds(listId, defaults);
  if (!editing || (max !== undefined && ids.length >= max)) return null;

  const button = (
    <button
      data-editor-ui
      type="button"
      onClick={() => addListItem(listId, defaults)}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-blue-400 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50",
        className,
      )}
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );

  return wrapperClassName ? <div className={wrapperClassName}>{button}</div> : button;
}

/* ------------------------------------------------------------------------------------------------
 * Colour bands (the footer's two stripes)
 * ---------------------------------------------------------------------------------------------- */

/** A full-width band with an owner-pickable background colour. */
export function EditBand({
  id,
  label,
  className,
  pill = "top",
  children,
}: {
  id: string;
  label: string;
  className?: string;
  /** Where the control sits: inside the top-right corner, or just above the band. */
  pill?: "top" | "above";
  children: ReactNode;
}) {
  const editing = useEditMode();
  const look = useLook(id);
  const value = useStyleEntry(id)?.background;

  return (
    <div className={cx("relative", className)} style={look.style}>
      {editing ? (
        <div
          data-editor-ui
          className={cx(
            "absolute right-4 z-30 rounded-full bg-gray-900/90 px-1 text-white shadow-lg",
            pill === "top" ? "top-2" : "bottom-full mb-1.5",
          )}
        >
          <ColorControl label={label} value={value} fallback={() => "#FFFFFF"} onChange={colourCap(id, "background").set} align="right" up={pill === "above"} />
        </div>
      ) : null}
      {children}
    </div>
  );
}
