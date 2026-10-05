import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

/*
 * Dependency-free drag-and-drop ordering.
 *
 * Works with mouse, touch and pen (pointer events) and with the keyboard
 * (arrow keys on the handle). The list re-orders live while dragging and
 * commits through `onReorder` on release, so callers just keep an array in
 * state and hand it back.
 */

export type DragHandleProps = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  role: "button";
  tabIndex: number;
  "aria-label": string;
  "aria-grabbed": boolean;
  className: string;
  style: React.CSSProperties;
};

type RenderMeta = {
  index: number;
  isDragging: boolean;
  dragHandleProps: DragHandleProps;
};

type SortableListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, meta: RenderMeta) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
  /** "list" stacks vertically; "grid" lets the parent control layout with its own grid classes. */
  layout?: "list" | "grid";
};

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  className = "",
  itemClassName = "",
  disabled = false,
  layout = "list",
}: SortableListProps<T>) {
  const [draggingKey, setDraggingKey] = useState<string | number | null>(null);
  const [workingItems, setWorkingItems] = useState<T[] | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef<T[]>(items);
  const pointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (draggingKey === null) latestRef.current = items;
  }, [items, draggingKey]);

  const list = workingItems ?? items;

  const finishDrag = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const next = latestRef.current;
    setDraggingKey(null);
    setWorkingItems(null);
    pointerIdRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    if (next !== items) onReorder(next);
  }, [items, onReorder]);

  useEffect(() => {
    if (draggingKey === null) return;

    const onMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const container = containerRef.current;
        if (!container) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const node = target?.closest<HTMLElement>("[data-sortable-key]");
        if (!node || !container.contains(node)) return;
        const overKey = node.dataset.sortableKey ?? "";
        const current = latestRef.current;
        const from = current.findIndex((item) => String(getKey(item)) === String(draggingKey));
        const to = current.findIndex((item) => String(getKey(item)) === overKey);
        if (from === -1 || to === -1 || from === to) return;

        // Only swap once the pointer has crossed the midpoint of the hovered item,
        // which stops the list from flickering back and forth on the boundary.
        const rect = node.getBoundingClientRect();
        const vertical = layout === "list";
        const midpoint = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
        const pointer = vertical ? event.clientY : event.clientX;
        if (from < to && pointer < midpoint) return;
        if (from > to && pointer > midpoint) return;

        const next = move(current, from, to);
        latestRef.current = next;
        setWorkingItems(next);
      });
    };

    const onUp = (event: PointerEvent) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      finishDrag();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingKey, finishDrag, getKey, layout]);

  const startDrag = (key: string | number) => (event: React.PointerEvent<HTMLElement>) => {
    if (disabled) return;
    if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    latestRef.current = items;
    setWorkingItems(items);
    setDraggingKey(key);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const keyboardMove = (key: string | number) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !backward) return;
    event.preventDefault();
    const from = items.findIndex((item) => String(getKey(item)) === String(key));
    if (from === -1) return;
    const to = forward ? from + 1 : from - 1;
    if (to < 0 || to >= items.length) return;
    onReorder(move(items, from, to));
    requestAnimationFrame(() => {
      const handle = containerRef.current?.querySelector<HTMLElement>(`[data-sortable-handle="${String(key)}"]`);
      handle?.focus();
    });
  };

  return (
    <div ref={containerRef} className={`${layout === "list" ? "space-y-2" : ""} ${className}`}>
      {list.map((item, index) => {
        const key = getKey(item);
        const isDragging = draggingKey !== null && String(draggingKey) === String(key);
        const dragHandleProps: DragHandleProps = {
          onPointerDown: startDrag(key),
          onKeyDown: keyboardMove(key),
          role: "button",
          tabIndex: disabled ? -1 : 0,
          "aria-label": "Drag to reorder (or use arrow keys)",
          "aria-grabbed": isDragging,
          className: `touch-none select-none ${disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"}`,
          style: { touchAction: "none" },
        };
        return (
          <div
            key={String(key)}
            data-sortable-key={String(key)}
            className={`transition-[transform,opacity,box-shadow] duration-150 ${
              isDragging ? "z-10 scale-[1.01] opacity-90 shadow-[0_18px_40px_rgba(63,47,17,0.18)]" : ""
            } ${itemClassName}`}
          >
            {renderItem(item, {
              index,
              isDragging,
              dragHandleProps: {
                ...dragHandleProps,
                // Stash the key so keyboard moves can restore focus after re-render.
                ...({ "data-sortable-handle": String(key) } as Record<string, string>),
              },
            })}
          </div>
        );
      })}
    </div>
  );
}

export function DragHandle({ handleProps, className = "" }: { handleProps: DragHandleProps; className?: string }) {
  return (
    <span
      {...handleProps}
      className={`inline-flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-[#B3A585] transition hover:bg-[#F6EFDF] hover:text-[#6B5A34] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A75E]/50 ${handleProps.className} ${className}`}
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );
}
