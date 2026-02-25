import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { X, Copy, Move } from "lucide-react";
import type { ImageState } from "./Design";

interface SelectionBoxProps {
  selectedImages: string[]; // uids
  canvasRef: React.RefObject<HTMLDivElement>;
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  onDelete: (uids: string[]) => void;
  onDuplicate: (uids: string[]) => void;
  onResize: (imageUid: string, width: number, height: number) => void;
  onStartGroupResize?: (startClientX: number) => any;
  onReset?: (uids: string[]) => void;
  onDeselectAll?: () => void;
  imageState?: Record<string, ImageState>;
}

const SelectionBox: React.FC<SelectionBoxProps> = ({
  selectedImages,
  canvasRef,
  positions,
  sizes,
  imageState,
  onDelete,
  onDuplicate,
  onResize,
  onStartGroupResize,
  onDeselectAll,
}) => {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [labelPos, setLabelPos] = useState<{ left: number; top: number } | null>(null);

  const firstUid = selectedImages.length > 0 ? selectedImages[0] : null;

  const updateBoundingBox = useCallback(() => {
    if (!canvasRef.current || selectedImages.length === 0) {
      setBox(null);
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    selectedImages.forEach((uid) => {
      const layer = imageState?.[uid];
      const clipartBounds = layer?.isClipart && sizes[uid] && positions[uid];

      if (clipartBounds) {
        const pos = positions[uid];
        const sz = sizes[uid];
        const x = pos.x;
        const y = pos.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + sz.w);
        maxY = Math.max(maxY, y + sz.h);
        return;
      }

      const el = document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(uid)}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const x = r.left - canvasRect.left;
        const y = r.top - canvasRect.top;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + r.width);
        maxY = Math.max(maxY, y + r.height);
        return;
      }

      const sz = sizes[uid];
      const pos = positions[uid];
      if (pos && sz) {
        const x = pos.x;
        const y = pos.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + sz.w);
        maxY = Math.max(maxY, y + sz.h);
      }
    });

    if (minX === Infinity) {
      setBox(null);
      return;
    }

    const nextBox = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    setBox(prev => {
      if (
        prev &&
        Math.abs(prev.left - nextBox.left) < 0.5 &&
        Math.abs(prev.top - nextBox.top) < 0.5 &&
        Math.abs(prev.width - nextBox.width) < 0.5 &&
        Math.abs(prev.height - nextBox.height) < 0.5
      ) {
        return prev;
      }
      return nextBox;
    });
  }, [canvasRef, selectedImages, positions, sizes]);

  // Keep the box synced with live transforms (drag / resize / rotate) on every render cycle.
  useLayoutEffect(() => {
    updateBoundingBox();
  });

  useEffect(() => {
    updateBoundingBox();
    const handleWindowResize = () => updateBoundingBox();
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [updateBoundingBox]);

  // click outside → deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!canvasRef.current) return;

      const clickedOnSelected = selectedImages.some((uid) => {
        const el = document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(uid)}"]`);
        return el?.contains(e.target as Node);
      });

      if (!clickedOnSelected) onDeselectAll?.();
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [selectedImages, canvasRef, onDeselectAll]);

  if (!box || !firstUid) return null;

  const showLabel = (text: string, x: number, y: number) => {
    setHoverLabel(text);
    setLabelPos({ left: x, top: y });
  };
  const hideLabel = () => {
    setHoverLabel(null);
    setLabelPos(null);
  };

  const stopAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // --- SIMPLE FIX: disable resize for text elements ---
  const handleSingleResizeMouseDown = (e: React.MouseEvent) => {
    stopAll(e);
    if (!firstUid) return;

    const el = document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(firstUid)}"]`);
    if (!el) return;

    // if it's text, don't resize (prevents icon + weird behavior)
    if (el.dataset.type === "text") return;

    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;
    const aspect = startW / startH;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const delta = Math.max(dx, dy);
      const newW = Math.max(30, startW + delta);
      const newH = Math.round(newW / aspect);

      onResize(firstUid, newW, newH);
      updateBoundingBox();
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleGroupResizeMouseDown = (e: React.MouseEvent) => {
    stopAll(e);
    if (typeof onStartGroupResize === "function") {
      onStartGroupResize(e.clientX);
    } else {
      handleSingleResizeMouseDown(e);
    }
  };

  return (
    <>
      {hoverLabel && labelPos && (
        <div
          className="absolute bg-black text-white text-xs px-2 py-1 rounded"
          style={{
            left: labelPos.left,
            top: labelPos.top,
            zIndex: 9999,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            transform: "translate(-50%, -100%)",
          }}
        >
          {hoverLabel}
        </div>
      )}

      <div
        className="absolute border-2 border-[#C6A75E] pointer-events-none"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          zIndex: 300,
          background: "rgba(198,167,94,0.12)",
        }}
      >
        {/* DELETE */}
        <div
          className="absolute bg-white rounded-full shadow p-1 cursor-pointer selection-button"
          style={{ right: -15, top: -15, zIndex: 400, pointerEvents: "auto" }}
          onMouseDown={stopAll}
          onClick={(e) => {
            stopAll(e);
            onDelete(selectedImages);
          }}
          onMouseEnter={() => showLabel("Delete", box.left + box.width - 10, box.top - 30)}
          onMouseLeave={hideLabel}
        >
          <X size={16} color="red" />
        </div>

        {/* RESIZE */}
        <div
          className="absolute bg-white rounded-full shadow p-1 cursor-se-resize selection-button"
          style={{ right: -15, bottom: -15, zIndex: 400, pointerEvents: "auto" }}
          onMouseDown={handleGroupResizeMouseDown}
          onMouseEnter={() => showLabel("Resize", box.left + box.width - 10, box.top + box.height + 20)}
          onMouseLeave={hideLabel}
        >
          <Move size={16} />
        </div>

        {/* DUPLICATE */}
        <div
          className="absolute bg-white rounded-full shadow p-1 cursor-pointer selection-button"
          style={{ left: -15, bottom: -15, zIndex: 400, pointerEvents: "auto" }}
          onMouseDown={stopAll}
          onClick={(e) => {
            stopAll(e);
            onDuplicate(selectedImages);
          }}
          onMouseEnter={() => showLabel("Duplicate", box.left - 10, box.top + box.height + 20)}
          onMouseLeave={hideLabel}
        >
          <Copy size={16} />
        </div>
      </div>
    </>
  );
};

export default SelectionBox;
