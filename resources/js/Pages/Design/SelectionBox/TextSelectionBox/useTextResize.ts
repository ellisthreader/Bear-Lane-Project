// useTextResize.ts
export function useTextResize(
  uid: string | null,
  canvasRef: React.RefObject<HTMLDivElement>,
  restrictedBox: { left: number; top: number; width: number; height: number },
  getFontSize: (uid: string) => number,
  onResizeText: (uid: string, size: number) => void
) {
  return (e: React.MouseEvent) => {
    console.log("🔥 useTextResize START");
    e.preventDefault();
    e.stopPropagation();

    if (!uid || !canvasRef.current) return;

    const el = document.querySelector<HTMLElement>(
      `[data-uid="${CSS.escape(uid)}"][data-type="text"]`
    );
    console.log("🔍 resize target", el);
    if (!el) return;

    const startFont = getFontSize(uid);
    const minFont = 8;
    const sensitivity = 0.005;
    const startX = e.clientX;

    const canvasRect = canvasRef.current.getBoundingClientRect();

    let lastValidSize = startFont;

    const onMove = (ev: MouseEvent) => {
      console.log("➡️ resizing move", ev.clientX);
      const dx = ev.clientX - startX;
      const desired = Math.max(minFont, startFont * (1 + dx * sensitivity));

      // Measure using temp span
      const style = window.getComputedStyle(el);
      const tmp = document.createElement("span");
      tmp.style.fontFamily = style.fontFamily;
      tmp.style.fontWeight = style.fontWeight;
      tmp.style.fontStyle = style.fontStyle;
      tmp.style.fontSize = `${desired}px`;
      tmp.style.position = "absolute";
      tmp.style.whiteSpace = "nowrap";
      tmp.style.visibility = "hidden";
      tmp.innerText = el.innerText;
      document.body.appendChild(tmp);

      const rect = tmp.getBoundingClientRect();
      document.body.removeChild(tmp);

      const elRect = el.getBoundingClientRect();
      const left = elRect.left - canvasRect.left;
      const top = elRect.top - canvasRect.top;

      const maxRight = restrictedBox.left + restrictedBox.width;
      const maxBottom = restrictedBox.top + restrictedBox.height;

      const exceeds =
        left < restrictedBox.left ||
        top < restrictedBox.top ||
        left + rect.width > maxRight ||
        top + rect.height > maxBottom;

      const finalSize = exceeds ? lastValidSize : desired;
      console.log("📏 new size", desired);

      if (!exceeds) {
        lastValidSize = desired;
      }

      // ✅ SINGLE SOURCE OF TRUTH
      onResizeText(uid, finalSize);
      console.log("🧠 onResizeText", uid, desired);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
}
