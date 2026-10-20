import { useEffect } from "react";
import EditorBar from "./EditorBar";
import EditorGuide from "./EditorGuide";
import EditToolbar from "./EditToolbar";
import ProductPicker from "./ProductPicker";
import { getSelectedTarget, selectTarget } from "./selection";
import { redo, undo } from "./store";

const typingIn = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/**
 * Mounted only while an admin is in edit mode. Owns the page-wide behaviour of editing:
 *  - marks <html> so editable things get their hover outlines (see app.css)
 *  - stops links and buttons inside the page content from navigating or firing
 *    (anything inside [data-editor-ui] or [data-edit-allow] still works)
 *  - clears the selection when the owner clicks somewhere that is not editable
 *  - keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Delete removes the selected element
 *    (never while typing, where those keys keep their normal text meaning)
 */
export default function EditorHost() {
  useEffect(() => {
    document.documentElement.classList.add("bl-editing");

    const onMouseDown = (event: MouseEvent) => {
      const el = event.target as Element | null;
      if (el && !el.closest("[data-edit-target],[data-editor-ui]")) selectTarget(null);
    };

    const onClickCapture = (event: MouseEvent) => {
      const el = event.target as Element | null;
      if (!el || el.closest("[data-editor-ui],[data-edit-allow]") || !el.closest("[data-edit-scope]")) return;
      if (el.closest("a, button")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        selectTarget(null);
        return;
      }
      if (typingIn(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && !mod) {
        const target = getSelectedTarget();
        if (target?.remove) {
          event.preventDefault();
          target.remove();
          selectTarget(null);
        }
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.documentElement.classList.remove("bl-editing");
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyDown);
      selectTarget(null);
    };
  }, []);

  return (
    <>
      <EditorBar />
      <EditToolbar />
      <ProductPicker />
      <EditorGuide />
    </>
  );
}
