import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const EPSILON = 0.25;
const boxesAreEqual = (a: Box | null, b: Box) =>
  Boolean(
    a &&
      Math.abs(a.left - b.left) < EPSILON &&
      Math.abs(a.top - b.top) < EPSILON &&
      Math.abs(a.width - b.width) < EPSILON &&
      Math.abs(a.height - b.height) < EPSILON
  );

export function useBoundingBox(
  selectedText: string[],
  canvasRef: React.RefObject<HTMLDivElement>,
  positions: Record<string, { x: number; y: number }>,
  sizes: Record<string, { w: number; h: number }>
) {
  const [box, setBox] = useState<Box | null>(null);
  const selectedKey = useMemo(() => selectedText.join("|"), [selectedText]);

  const computeStateBox = useCallback((): Box | null => {
    if (selectedText.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    selectedText.forEach(uid => {
      const pos = positions[uid];
      const size = sizes[uid];
      if (!pos || !size) return;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.w);
      maxY = Math.max(maxY, pos.y + size.h);
    });

    if (minX === Infinity) return null;

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedText, positions, sizes]);

  const update = useCallback(() => {
    if (!canvasRef.current || selectedText.length === 0) {
      setBox(null);
      return;
    }

    const stateBox = computeStateBox();
    if (stateBox) {
      setBox(prev => (boxesAreEqual(prev, stateBox) ? prev : stateBox));
      return;
    }

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    selectedText.forEach(uid => {
      const el = canvas.querySelector<HTMLElement>(
        `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
      );
      if (!el) return;

      const r = el.getBoundingClientRect();
      const x = r.left - canvasRect.left;
      const y = r.top - canvasRect.top;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + r.width);
      maxY = Math.max(maxY, y + r.height);
    });

    if (minX === Infinity) {
      setBox(null);
      return;
    }

    const next: Box = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    setBox(prev => (boxesAreEqual(prev, next) ? prev : next));
  }, [canvasRef, selectedText, computeStateBox]);

  useLayoutEffect(() => {
    update();
  }, [update, selectedKey, computeStateBox]);

  useEffect(() => {
    const handle = () => update();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selectedText.length === 0) return;

    const els = selectedText
      .map(uid =>
        canvas.querySelector<HTMLElement>(
          `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
        )
      )
      .filter((el): el is HTMLElement => Boolean(el));

    if (!els.length) return;

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(canvas);
    els.forEach(el => resizeObserver.observe(el));

    const mutationObserver = new MutationObserver(() => update());
    els.forEach(el => {
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [canvasRef, selectedKey, selectedText, update]);

  return { box, update };
}
