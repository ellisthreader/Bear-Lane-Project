import React, { useState, useEffect } from "react";
import HoverLabel from "./HoverLabel";
import SelectionBoundingBox from "./SelectionBoundingBox";
import DeleteButton from "./DeleteButton";
import DuplicateButton from "./DuplicateButton";
import ResizeHandle from "./ResizeHandle";
import { useTextResize } from "./useTextResize";
import { useBoundingBox } from "./useBoundingBox";

interface Props {
  selectedText: string[];
  canvasRef: React.RefObject<HTMLDivElement>;
  onDelete: (uids: string[]) => void;
  onDuplicate: (uids: string[]) => void;
  onDeselectAll?: () => void;
  onResizeText: (uid: string, newFontSize: number) => void;
  restrictedBox: { left: number; top: number; width: number; height: number };
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  imageState: Record<string, any>;
}

export default function TextSelectionBox(props: Props) {
  const {
    selectedText,
    canvasRef,
    onDelete,
    onDuplicate,
    onDeselectAll,
    onResizeText,
    restrictedBox,
    positions,
    sizes,
    imageState,
  } = props;

  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [labelPos, setLabelPos] = useState<{ left: number; top: number } | null>(null);
  const hasSelection = selectedText.length > 0;

  const { box, update } = useBoundingBox(selectedText, canvasRef, positions, sizes);

  useEffect(() => {
    update();
  }, [positions, sizes, imageState, update]);

  /* ---------------- Outside click ---------------- */

  useEffect(() => {
    if (!hasSelection) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const inside = selectedText.some(uid =>
        target.closest(`[data-uid="${CSS.escape(uid)}"]`)
      );

      if (!inside) {
        onDeselectAll?.();
      }
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [selectedText, onDeselectAll]);

  /* ---------------- Resize hook (single text only) ---------------- */

  const resizeUid = selectedText[0] ?? null;
  const handleResize = useTextResize(
    resizeUid,
    canvasRef,
    restrictedBox,
    id => imageState[id]?.fontSize ?? 16,
    onResizeText
  );




  /* ---------------- Re size multiple ---------------- */

const startGroupResize = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;

  const startBox = { ...box };

  // Capture original font sizes AND original measured sizes
  const startState = selectedText.map(uid => {
    const size = sizes[uid];
    const pos = positions[uid];
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const el = document.querySelector<HTMLElement>(
      `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
    );
    const elRect = el?.getBoundingClientRect();
    const fallbackPos =
      canvasRect && elRect
        ? { x: elRect.left - canvasRect.left, y: elRect.top - canvasRect.top }
        : null;
    const fallbackSize = elRect
      ? { w: elRect.width, h: elRect.height }
      : null;

    return {
      uid,
      fontSize: imageState[uid]?.fontSize ?? 16,
      width: size?.w ?? fallbackSize?.w ?? 0,
      height: size?.h ?? fallbackSize?.h ?? 0,
      x: pos?.x ?? fallbackPos?.x ?? 0,
      y: pos?.y ?? fallbackPos?.y ?? 0,
    };
  });

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    const scaleX = (startBox.width + dx) / startBox.width;
    const scaleY = (startBox.height + dy) / startBox.height;

    const scale = Math.max(0.2, Math.min(scaleX, scaleY));

    // 🚫 HARD STOP if ANY text would exceed restricted box
    for (const item of startState) {
      const newW = item.width * scale;
      const newH = item.height * scale;

      const exceeds =
        item.x < restrictedBox.left ||
        item.y < restrictedBox.top ||
        item.x + newW > restrictedBox.left + restrictedBox.width ||
        item.y + newH > restrictedBox.top + restrictedBox.height;

      if (exceeds) {
        return; // ⛔ STOP ENTIRE GROUP RESIZE
      }
    }

    // ✅ Safe → apply resize to ALL
    startState.forEach(item => {
      const nextFontSize = Math.max(6, Math.round(item.fontSize * scale));
      onResizeText(item.uid, nextFontSize);
    });
  };

  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};


  /* ---------------- Render ---------------- */
  if (!hasSelection) return null;

  if (!box) {
    console.warn("⏳ Waiting for text measurement", selectedText);
    return null;
  }

  return (
    <>
      {hoverLabel && labelPos && (
        <HoverLabel text={hoverLabel} left={labelPos.left} top={labelPos.top} />
      )}

      <SelectionBoundingBox box={box}>
        <DeleteButton
          stopAll={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => onDelete(selectedText)}
        />
        
    <ResizeHandle
      className="selection-button"
      onMouseDown={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 🟢 SINGLE TEXT → old behavior
        if (selectedText.length === 1 && handleResize) {
          handleResize(e);
          return;
        }

        // 🟡 MULTI TEXT → group resize
        startGroupResize(e);
      }}
    />


        <DuplicateButton
          stopAll={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => onDuplicate(selectedText)}
        />
      </SelectionBoundingBox>
    </>
  );
}
