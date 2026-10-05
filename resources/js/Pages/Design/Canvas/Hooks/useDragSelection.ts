// 🖱️ Handles single & multi-image selection and dragging
// ✅ Multi-drag now clamps as a GROUP (no overlap at borders)

import { useState, useRef, useEffect } from "react";
import React from "react";

interface RestrictedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface UseDragSelectionArgs {
  uids: string[];
  sizes: Record<string, { w: number; h: number }>;
  positions: Record<string, { x: number; y: number }>;
  setPositions: React.Dispatch<
    React.SetStateAction<Record<string, { x: number; y: number }>>
  >;
  canvasRef: React.RefObject<HTMLDivElement>;
  restrictedBox?: RestrictedBox;
  onDelete?: (uids: string[]) => void;
  onDuplicate?: (uids: string[]) => void;
  onResize?: (uid: string, w: number, h: number) => void;
  onReset?: (uids: string[]) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export function useDragSelection(args: UseDragSelectionArgs) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedRef = useRef<string[]>([]);

  const draggingUids = useRef<string[]>([]);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>(
    {}
  );

  const setSelectedSafe = (next: string[] | ((prev: string[]) => string[])) => {
    setSelected((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      selectedRef.current = resolved;
      return resolved;
    });
  };

  const onPointerDown = (e: React.PointerEvent, uid: string) => {
    // Only primary button should start drag/select interactions.
    if (e.button !== 0) return;
    if (e.pointerType === "touch") {
      e.preventDefault();
    }
    e.stopPropagation();

    if (!args.positions[uid]) return;

    const isShiftPressed = e.shiftKey;
    const currentSelected = selectedRef.current;
    const isSelected = currentSelected.includes(uid);
    let multiSelected: string[] = [uid];

    if (isShiftPressed) {
      multiSelected = isSelected
        ? currentSelected.filter(item => item !== uid)
        : [...currentSelected, uid];
    } else {
      multiSelected = isSelected ? currentSelected : [uid];
    }

    if (multiSelected.length === 0) {
      setSelectedSafe([]);
      return;
    }

    setSelectedSafe(multiSelected);
    draggingUids.current = multiSelected;
    args.onGestureStart?.();

    dragStartPointer.current = {
      x: e.clientX,
      y: e.clientY,
    };

    // Snapshot starting positions
    const snapshot: Record<string, { x: number; y: number }> = {};
    multiSelected.forEach(u => {
      snapshot[u] = { ...args.positions[u] };
    });
    dragStartPositions.current = snapshot;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (
      !draggingUids.current.length ||
      !args.restrictedBox ||
      !dragStartPointer.current
    )
      return;

    const box = args.restrictedBox;
    const dx = e.clientX - dragStartPointer.current.x;
    const dy = e.clientY - dragStartPointer.current.y;

    // 🧠 1️⃣ Compute group bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    draggingUids.current.forEach(uid => {
      const pos = dragStartPositions.current[uid];
      const size = args.sizes[uid];
      if (!pos || !size) return;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.w);
      maxY = Math.max(maxY, pos.y + size.h);
    });

    // 🧱 2️⃣ Clamp the delta (NOT individual positions)
    let clampedDx = dx;
    let clampedDy = dy;

    if (minX + dx < box.left) {
      clampedDx = box.left - minX;
    }
    if (maxX + dx > box.left + box.width) {
      clampedDx = box.left + box.width - maxX;
    }
    if (minY + dy < box.top) {
      clampedDy = box.top - minY;
    }
    if (maxY + dy > box.top + box.height) {
      clampedDy = box.top + box.height - maxY;
    }

    // 🧩 3️⃣ Apply the SAME delta to every item
    args.setPositions(prev => {
      const next = { ...prev };

      draggingUids.current.forEach(uid => {
        const start = dragStartPositions.current[uid];
        if (!start) return;

        next[uid] = {
          x: start.x + clampedDx,
          y: start.y + clampedDy,
        };
      });

      return next;
    });
  };

  const onPointerUp = () => {
    draggingUids.current = [];
    dragStartPointer.current = null;
    dragStartPositions.current = {};

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    args.onGestureEnd?.();
  };

  // 🔒 Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const selectionBoxProps = {
    selectedImages: selected,
    canvasRef: args.canvasRef,
    onDelete: args.onDelete ?? (() => {}),
    onDuplicate: args.onDuplicate ?? (() => {}),
    onResize: args.onResize ?? (() => {}),
    onReset: args.onReset ?? (() => {}),
  };

  return {
    selected,
    setSelected: setSelectedSafe,
    onPointerDown,
    selectionBoxProps,
  };
}
