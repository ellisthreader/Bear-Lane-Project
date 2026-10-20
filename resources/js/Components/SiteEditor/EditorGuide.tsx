import { MousePointerClick, Move, Plus, Trash2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { setGuideOpen, useGuideOpen } from "./selection";

export const GUIDE_SEEN_KEY = "bl-editor-guide-v1";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Click anything to change it",
    text: "Click any text, picture or button. A small bar appears with everything you can do to it: type, change colours, make text bigger, swap a picture, choose where a button goes.",
  },
  {
    icon: Move,
    title: "Press “Move” and drag it anywhere",
    text: "Hold the Move button and drag. Put a button, a heading or a picture exactly where you want it. Moves show on laptops and desktops; phones keep the neat original layout.",
  },
  {
    icon: Trash2,
    title: "Delete whatever you don’t want",
    text: "Every piece has a red Delete button. Deleted something by mistake? Press Undo straight away, or find it later under “Deleted” at the bottom.",
  },
  {
    icon: Plus,
    title: "Add new things",
    text: "Use Add to put new text, buttons, pictures or whole blank sections on the page.",
  },
  {
    icon: Undo2,
    title: "Nothing is live until you Save",
    text: "Customers only see your changes after you press the green Save changes button. Undo, Redo and “Throw away my changes” are always there if you change your mind.",
  },
];

/** First-time (and on-demand) friendly walkthrough of what the editor can do. */
export default function EditorGuide() {
  const open = useGuideOpen();

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {
      // storage can be blocked; just show the guide
    }
    if (!seen) setGuideOpen(true);
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      // not important
    }
    setGuideOpen(false);
  };

  return createPortal(
    <div data-editor-ui className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-label="How to edit your homepage" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">You’re editing your homepage</h2>
        <p className="mt-2 text-sm text-gray-600">Here’s everything you need to know. It takes ten seconds to read.</p>

        <ol className="mt-6 space-y-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {index + 1}. {title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" onClick={close} className="mt-8 h-12 w-full rounded-2xl bg-emerald-500 text-base font-semibold text-white transition hover:bg-emerald-400">
          Got it, let me start
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">You can open this again any time from More → How does this work?</p>
      </div>
    </div>,
    document.body,
  );
}
