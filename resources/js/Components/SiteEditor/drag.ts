import type { PointerEvent as ReactPointerEvent } from "react";
import type { MoveCap } from "./types";

const EDGE = 90; // px from the top/bottom of the window where dragging starts scrolling the page
const SCROLL_STEP = 14;

/**
 * Starts dragging `el` around the page. Call it from a handle's onPointerDown.
 * The element follows the pointer live; the new position is saved once, when the pointer is released.
 * Dragging near the top or bottom of the window scrolls the page so long distances are easy.
 */
export function beginMove(event: ReactPointerEvent<HTMLElement>, el: HTMLElement, move: MoveCap) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);

  const start = move.get();
  const origin = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY };
  const pointer = { x: event.clientX, y: event.clientY };
  let x = start.x;
  let y = start.y;
  let frame = 0;

  document.documentElement.classList.add("bl-dragging");

  const apply = () => {
    x = Math.round(start.x + (pointer.x + window.scrollX - origin.x));
    y = Math.round(start.y + (pointer.y + window.scrollY - origin.y));
    el.classList.add("bl-moved");
    el.style.setProperty("--bl-x", `${x}px`);
    el.style.setProperty("--bl-y", `${y}px`);
  };

  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    apply();
  };

  const tick = () => {
    if (pointer.y < EDGE) window.scrollBy(0, -SCROLL_STEP);
    else if (pointer.y > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_STEP);
    else {
      frame = requestAnimationFrame(tick);
      return;
    }
    apply();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  const end = () => {
    cancelAnimationFrame(frame);
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    document.documentElement.classList.remove("bl-dragging");
    if (x !== start.x || y !== start.y) move.set(x, y);
  };

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
