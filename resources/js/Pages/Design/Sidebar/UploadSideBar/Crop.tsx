"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

type CropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type CropProps = {
  originalImageUrl: string;
  initialCrop?: CropBox | null;
  onReplaceCanvasImage: (url: string, crop: CropBox) => void;
  onClose: () => void;
};

const checkerboardStyle: React.CSSProperties = {
  backgroundColor: "#d6d6d6",
  backgroundImage: `
    linear-gradient(45deg, #ececec 25%, transparent 25%),
    linear-gradient(-45deg, #ececec 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ececec 75%),
    linear-gradient(-45deg, transparent 75%, #ececec 75%)
  `,
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

const HANDLE_INSET = 6;
const MIN_SIZE = 40;

export default function Crop({
  originalImageUrl,
  initialCrop,
  onReplaceCanvasImage,
  onClose,
}: CropProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [crop, setCrop] = useState<CropBox | null>(initialCrop ?? null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const dragState = useRef({
    dragging: false,
    handle: null as string | null,
    startX: 0,
    startY: 0,
    startCrop: null as CropBox | null,
  });

  // ---------- IMAGE BOUNDS (RENDERED, NOT NATURAL) ----------
  const getImageBounds = () => {
    if (!imgRef.current || !containerRef.current) return null;

    const img = imgRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = rect.width / rect.height;

    let width = 0;
    let height = 0;
    let left = 0;
    let top = 0;

    if (imgAspect > containerAspect) {
      width = rect.width;
      height = width / imgAspect;
      top = (rect.height - height) / 2;
    } else {
      height = rect.height;
      width = height * imgAspect;
      left = (rect.width - width) / 2;
    }

    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
  };

  // ---------- AUTO FIT ----------
  const handleImageLoad = () => {
    const bounds = getImageBounds();
    if (!bounds || initialCrop) {
      setImageLoaded(true);
      return;
    }

    setCrop({
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    });

    setImageLoaded(true);
  };

  // ---------- DRAG ----------
  const startDrag = (e: React.MouseEvent, handle: string) => {
    if (!crop) return;
    dragState.current = {
      dragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    const state = dragState.current;
    if (!state.dragging || !state.startCrop) return;

    const bounds = getImageBounds();
    if (!bounds) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const start = state.startCrop;
    const h = state.handle;

    let next = { ...start };

    // LEFT
    if (h?.includes("w")) {
      const newWidth = Math.max(MIN_SIZE, start.width - dx);
      next.left = Math.min(start.left + (start.width - newWidth), start.left + start.width - MIN_SIZE);
      next.width = newWidth;
    }

    // RIGHT
    if (h?.includes("e")) {
      next.width = Math.max(MIN_SIZE, start.width + dx);
    }

    // TOP
    if (h?.includes("n")) {
      const newHeight = Math.max(MIN_SIZE, start.height - dy);
      next.top = Math.min(start.top + (start.height - newHeight), start.top + start.height - MIN_SIZE);
      next.height = newHeight;
    }

    // BOTTOM
    if (h?.includes("s")) {
      next.height = Math.max(MIN_SIZE, start.height + dy);
    }

    // ---------- HARD CLAMP TO IMAGE ----------
    next.left = Math.max(bounds.left, next.left);
    next.top = Math.max(bounds.top, next.top);

    if (next.left + next.width > bounds.right) {
      next.width = bounds.right - next.left;
    }

    if (next.top + next.height > bounds.bottom) {
      next.height = bounds.bottom - next.top;
    }

    setCrop(next);
  };

  useEffect(() => {
    const stop = () => (dragState.current.dragging = false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  // ---------- APPLY ----------
  const applyCrop = () => {
    if (!imgRef.current || !containerRef.current || !crop) return;

    const img = imgRef.current;
    const bounds = getImageBounds();
    if (!bounds) return;

    const scaleX = img.naturalWidth / (bounds.right - bounds.left);
    const scaleY = img.naturalHeight / (bounds.bottom - bounds.top);

    const canvas = document.createElement("canvas");
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      (crop.left - bounds.left) * scaleX,
      (crop.top - bounds.top) * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    onReplaceCanvasImage(canvas.toDataURL("image/png"), crop);
    onClose();
  };

  // ---------- UI ----------
  return (
    <div className="p-5 h-full flex flex-col bg-white shadow-lg rounded-xl">
      <button onClick={onClose} className="flex items-center gap-2 text-sm mb-4">
        <ArrowLeft size={18} /> Back
      </button>

      <h2 className="text-2xl font-bold mb-4">Crop Image</h2>

      <div ref={containerRef} className="relative h-[50vh] overflow-hidden rounded-xl border">
        <div className="absolute inset-0" style={checkerboardStyle} />

        <img
          ref={imgRef}
          src={originalImageUrl}
          onLoad={handleImageLoad}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {imageLoaded && crop && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.45)",
              clipPath: `
                polygon(
                  0 0, 100% 0, 100% 100%, 0 100%,
                  0 ${crop.top}px,
                  ${crop.left}px ${crop.top}px,
                  ${crop.left}px ${crop.top + crop.height}px,
                  ${crop.left + crop.width}px ${crop.top + crop.height}px,
                  ${crop.left + crop.width}px ${crop.top}px,
                  0 ${crop.top}px
                )
              `,
            }}
          />
        )}

        {crop && (
          <div className="absolute" style={crop}>
            <div className="absolute inset-0 border-2 border-white" />

            {["nw","ne","sw","se","n","s","w","e"].map((pos) => (
              <div
                key={pos}
                onMouseDown={(e) => startDrag(e, pos)}
                className="absolute w-3 h-3 bg-white rounded-full cursor-pointer"
                style={{
                  left: pos.includes("w")
                    ? HANDLE_INSET
                    : pos.includes("e")
                    ? `calc(100% - ${HANDLE_INSET}px)`
                    : "50%",
                  top: pos.includes("n")
                    ? HANDLE_INSET
                    : pos.includes("s")
                    ? `calc(100% - ${HANDLE_INSET}px)`
                    : "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <button onClick={applyCrop} className="mt-5 w-full py-3 bg-[#C6A75E] text-white rounded-xl">
        Apply Crop
      </button>
    </div>
  );
}
