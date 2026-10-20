import { useSyncExternalStore } from "react";
import type { EditTarget } from "./types";

// Which element the floating toolbar is attached to, plus which product picker is open.
// Kept apart from the content store so selecting something never re-renders the page.

let selected: EditTarget | null = null;
let picker: "featured" | "premade" | null = null;
let guideOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function selectTarget(target: EditTarget | null) {
  if (selected?.el === target?.el && selected?.label === target?.label) {
    selected = target; // refresh the closures without flashing
    emit();
    return;
  }
  selected?.el.removeAttribute("data-edit-selected");
  selected = target;
  selected?.el.setAttribute("data-edit-selected", "true");
  emit();
}

export const getSelectedTarget = () => selected;

export const useSelectedTarget = () => useSyncExternalStore(subscribe, () => selected, () => selected);

export function openProductPicker(kind: "featured" | "premade" | null) {
  picker = kind;
  emit();
}

export function setGuideOpen(open: boolean) {
  guideOpen = open;
  emit();
}

export const useGuideOpen = () => useSyncExternalStore(subscribe, () => guideOpen, () => guideOpen);

export const useProductPicker = () => useSyncExternalStore(subscribe, () => picker, () => picker);

/**
 * Scrolls an element (by its data-edit-id) into view and selects it, e.g. a block that was just
 * added. Text gets its words selected so typing replaces the placeholder straight away.
 */
export function revealElement(editId: string, selectText = false) {
  let tries = 0;
  const attempt = () => {
    const el = document.querySelector<HTMLElement>(`[data-edit-id="${editId}"]`);
    if (!el) {
      if (tries++ < 30) requestAnimationFrame(attempt);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => {
      if (selectText && el.isContentEditable) {
        el.focus();
        window.getSelection()?.selectAllChildren(el);
      } else {
        el.click();
      }
    }, 450);
  };
  requestAnimationFrame(attempt);
}
