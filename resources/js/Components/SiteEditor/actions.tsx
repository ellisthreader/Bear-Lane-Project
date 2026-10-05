import { toast } from "react-toastify";
import { deleteElement, undo } from "./store";

/** Visible text of an element, ignoring the editor's own controls (pills, toolbars). */
export function plainTextOf(el: Element | null | undefined, max = 28): string {
  if (!el) return "";
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
  const text = (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** "Heading “From concept to…”" — a readable name for toasts and the Deleted items list. */
export const nameFor = (noun: string, el?: Element | null) => {
  const text = plainTextOf(el);
  return text ? `${noun} “${text}”` : noun;
};

function DeletedToast({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">Deleted {name}</span>
      <button
        type="button"
        onClick={() => {
          undo();
          toast.dismiss();
        }}
        className="shrink-0 rounded-lg bg-white/25 px-3 py-1 text-sm font-semibold transition hover:bg-white/40"
      >
        Undo
      </button>
    </div>
  );
}

/** Tells the owner something was deleted and gives them a one-click way back. */
export function announceDeleted(name: string) {
  toast(<DeletedToast name={name} />, { autoClose: 7000, closeOnClick: false, hideProgressBar: false, theme: "dark" });
}

export function deleteAndAnnounce(id: string, name: string) {
  deleteElement(id, name);
  announceDeleted(name);
}
