// 🔲 Enables click-and-drag marquee selection on the canvas, tracking intersecting images and selecting them on pointer


import { useEffect, useState } from "react";
import React from "react";

export type Marquee = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type UseMarqueeSelectionProps = {
  canvasRef: React.RefObject<HTMLElement>;
  uids: string[];
  onSelect: (selected: string[]) => void;
};

export function useMarqueeSelection({
  canvasRef,
  uids,
  onSelect,
}: UseMarqueeSelectionProps) {
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [hovered, setHovered] = useState<Record<string, boolean>>({});

  // -------------------- Pointer Down --------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!canvasRef.current) return;

    const target = e.target as HTMLElement;

    // Prevent marquee on text or other draggable elements
    if (target.dataset.type === "img" || target.dataset.type === "text") {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarquee({
      startX: x,
      startY: y,
      x,
      y,
      w: 0,
      h: 0,
    });

    setHovered({});
  };


  // -------------------- Pointer Move --------------------
  const onPointerMove = (e: React.PointerEvent) => {
    if (!marquee || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - canvasRect.left;
    const my = e.clientY - canvasRect.top;

    const x = Math.min(mx, marquee.startX);
    const y = Math.min(my, marquee.startY);
    const w = Math.abs(mx - marquee.startX);
    const h = Math.abs(my - marquee.startY);

    setMarquee({ ...marquee, x, y, w, h });

    const next: Record<string, boolean> = {};

  uids.forEach((uid) => {
    const el = document.querySelector(
      `[data-uid="${CSS.escape(uid)}"]`
    ) as HTMLElement | null;

    if (!el) return;

    const r = el.getBoundingClientRect();
    const imgX = r.left - canvasRect.left;
    const imgY = r.top - canvasRect.top;

    if (
      imgX < x + w &&
      imgX + r.width > x &&
      imgY < y + h &&
      imgY + r.height > y
    ) {
      next[uid] = true;
    }
  });


    setHovered(next);
  };

  // -------------------- Pointer Up (global) --------------------
  useEffect(() => {
    if (!marquee) return;

    const handlePointerUp = () => {
      const selectedUids = Object.keys(hovered).filter((uid) => hovered[uid]);

      if (selectedUids.length > 0) {
        onSelect(selectedUids);
      }

      setMarquee(null);
      setHovered({});
    };

    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [marquee, hovered, onSelect]);

  // ✅ RETURN SHAPE MATCHES Canvas.tsx
  return {
    marquee,
    hovered,
    onPointerDown,
    onPointerMove,
  };
}
