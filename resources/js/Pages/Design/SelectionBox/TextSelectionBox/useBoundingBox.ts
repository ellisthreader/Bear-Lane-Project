import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function useBoundingBox(
  selectedText: string[],
  canvasRef: React.RefObject<HTMLDivElement>
) {
  const [box, setBox] = useState<Box | null>(null);
  const selectedKey = useMemo(() => selectedText.join("|"), [selectedText]);

  const update = useCallback(() => {
    if (!canvasRef.current || selectedText.length === 0) {
      setBox(null);
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
      height: maxY - minY
    };

    setBox(prev => {
      if (
        prev &&
        Math.abs(prev.left - next.left) < 0.25 &&
        Math.abs(prev.top - next.top) < 0.25 &&
        Math.abs(prev.width - next.width) < 0.25 &&
        Math.abs(prev.height - next.height) < 0.25
      ) {
        return prev;
      }
      return next;
    });
  }, [canvasRef, selectedText]);

  useLayoutEffect(() => {
    update();
  }, [update, selectedKey]);

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
