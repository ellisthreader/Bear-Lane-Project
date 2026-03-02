export async function captureCanvasCompositePng(
  canvasElement: HTMLDivElement | null
): Promise<string | null> {
  if (!canvasElement) return null;

  const rect = canvasElement.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width <= 0 || height <= 0) return null;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const capturedCanvas = await html2canvas(canvasElement, {
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      width,
      height,
      scale: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      logging: false,
      ignoreElements: element => {
        if (!(element instanceof HTMLElement)) return false;
        return element.dataset.exportIgnore === "true";
      },
    });

    return capturedCanvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to capture exact design PNG from canvas", error);
    return null;
  }
}
