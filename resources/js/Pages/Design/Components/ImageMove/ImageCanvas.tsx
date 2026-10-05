// 🧠 Implements an interactive image canvas supporting single and multi-image dragging, click-and-drag marquee selection, and coordinated pointer-based movement.

"use client";

import React, { useRef, useEffect } from "react";
import { ImageData, Marquee } from "./types";
import ImageItem from "./ImageMove";
import MarqueeBox from "./MarqueeBox";

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  images: ImageData[];
  setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  marquee: Marquee;
  setMarquee: React.Dispatch<React.SetStateAction<Marquee>>;
}

export default function ImageCanvas({
  containerRef,
  images,
  setImages,
  selected,
  setSelected,
  marquee,
  setMarquee,
}: Props) {
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startPositions: Record<string, { x: number; y: number }>;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startPositions: {},
  });

  // ---------------- POINTER DOWN ----------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const url = target.closest("[data-url]")?.getAttribute("data-url");

    // CLICKED EMPTY SPACE → START MARQUEE
    if (!url) {
      setSelected([]);
      setMarquee({
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        w: 0,
        h: 0,
        hovered: {},
      });
      return;
    }

    // CLICKED IMAGE → DRAG SELECTION
    if (!selected.includes(url)) {
      setSelected([url]);
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    const startPositions: Record<string, { x: number; y: number }> = {};
    images.forEach((img) => {
      if ((selected.includes(img.url) || img.url === url)) {
        startPositions[img.url] = { x: img.x, y: img.y };
      }
    });

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPositions,
    };
  };

  // ---------------- POINTER MOVE ----------------
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // DRAGGING IMAGES
    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      setImages((prev) =>
        prev.map((img) => {
          const start = dragRef.current.startPositions[img.url];
          if (!start) return img;
          return { ...img, x: start.x + dx, y: start.y + dy };
        })
      );
      return;
    }

    // MARQUEE MOVE
    if (!marquee.active) return;

    const x = Math.min(marquee.startX, e.clientX);
    const y = Math.min(marquee.startY, e.clientY);
    const w = Math.abs(e.clientX - marquee.startX);
    const h = Math.abs(e.clientY - marquee.startY);

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const hovered: Record<string, boolean> = {};

    images.forEach((img) => {
      const el = img.ref.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const ix = r.left - containerRect.left;
      const iy = r.top - containerRect.top;

      if (
        ix + r.width > x &&
        ix < x + w &&
        iy + r.height > y &&
        iy < y + h
      ) {
        hovered[img.url] = true;
      }
    });

    setMarquee((m) => ({
      ...m,
      x,
      y,
      w,
      h,
      hovered,
    }));
  };

  // ---------------- POINTER UP ----------------
  const handlePointerUp = () => {
    dragRef.current.dragging = false;
  };

  // ---------------- FINALIZE MARQUEE ----------------
  useEffect(() => {
    const up = () => {
      if (!marquee.active) return;

      const hoveredUids = Object.keys(marquee.hovered || {});
      setSelected(hoveredUids);
      setMarquee((m) => ({ ...m, active: false }));
    };

    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [marquee]);

  // ---------------- RENDER ----------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-[700px] border bg-white overflow-hidden mt-4"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {images.map((img) => (
        <div
          key={img.url}
          data-url={img.url}
          style={{ position: "absolute", left: img.x, top: img.y }}
        >
          <ImageItem
            img={img}
            isSelected={selected.includes(img.url)}
            marqueeActive={marquee.active}
          />
        </div>
      ))}

      {marquee.active && <MarqueeBox marquee={marquee} />}
    </div>
  );
}
