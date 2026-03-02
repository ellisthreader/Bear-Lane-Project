import type { PricePreviewLayer, PricePreviewSnapshot } from "../Canvas/Canvas";
import type { ViewKey } from "../types/designTypes";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

const drawTextLayer = (ctx: CanvasRenderingContext2D, layer: PricePreviewLayer, width: number, height: number) => {
  const text = (layer.text ?? "").toString();
  if (!text) return;

  const fontSize = Math.max(1, Number(layer.fontSize ?? 24));
  const fontFamily = layer.fontFamily ?? "Arial";
  const borderWidth = Math.max(0, Number(layer.borderWidth ?? 0));
  const textAlign = layer.textAlign ?? "center";
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.15;
  const anchorX = textAlign === "left" ? -width / 2 : textAlign === "right" ? width / 2 : 0;
  let y = -height / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(-width / 2, -height / 2, width, height);
  ctx.clip();
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";
  ctx.fillStyle = layer.color ?? "#000000";
  ctx.strokeStyle = layer.borderColor ?? "#000000";
  ctx.lineWidth = borderWidth;
  ctx.lineJoin = "round";

  lines.forEach(line => {
    if (borderWidth > 0) ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
    y += lineHeight;
  });

  ctx.restore();
};

const drawImageLayer = async (ctx: CanvasRenderingContext2D, layer: PricePreviewLayer, width: number, height: number) => {
  if (!layer.url) return;

  const image = await loadImage(layer.url);
  const isSvgClipart =
    layer.type === "clipart" &&
    typeof layer.url === "string" &&
    /\.svg(?:[?#].*)?$/i.test(layer.url) &&
    Boolean(layer.color);

  if (!isSvgClipart) {
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    return;
  }

  const tintCanvas = document.createElement("canvas");
  tintCanvas.width = Math.max(1, Math.round(width));
  tintCanvas.height = Math.max(1, Math.round(height));
  const tintCtx = tintCanvas.getContext("2d");
  if (!tintCtx) {
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    return;
  }

  tintCtx.drawImage(image, 0, 0, tintCanvas.width, tintCanvas.height);
  tintCtx.globalCompositeOperation = "source-in";
  tintCtx.fillStyle = layer.color ?? "#000000";
  tintCtx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
  tintCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(tintCanvas, -width / 2, -height / 2, width, height);
};

export const renderSnapshotToPng = async (snapshot?: PricePreviewSnapshot): Promise<string | null> => {
  if (!snapshot) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(snapshot.canvasWidth || 0));
  canvas.height = Math.max(1, Math.round(snapshot.canvasHeight || 0));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    if (snapshot.baseImage) {
      const baseImage = await loadImage(snapshot.baseImage);
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    }

    for (const layer of snapshot.layers ?? []) {
      const width = Math.max(1, Number(layer.size?.w ?? 0));
      const height = Math.max(1, Number(layer.size?.h ?? 0));
      const x = Number(layer.position?.x ?? 0);
      const y = Number(layer.position?.y ?? 0);
      const rotateRadians = ((Number(layer.rotation ?? 0) || 0) * Math.PI) / 180;
      const scaleX = layer.flip === "horizontal" ? -1 : 1;
      const scaleY = layer.flip === "vertical" ? -1 : 1;

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      if (rotateRadians) ctx.rotate(rotateRadians);
      if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

      if (layer.type === "text") {
        drawTextLayer(ctx, layer, width, height);
      } else {
        await drawImageLayer(ctx, layer, width, height);
      }

      ctx.restore();
    }

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to render design snapshot PNG", error);
    return null;
  }
};

export const renderSnapshotsToPngByView = async (
  snapshots: Partial<Record<ViewKey, PricePreviewSnapshot | undefined>>
): Promise<Partial<Record<ViewKey, string>>> => {
  const entries = await Promise.all(
    (Object.entries(snapshots) as Array<[ViewKey, PricePreviewSnapshot | undefined]>).map(
      async ([viewKey, snapshot]) => [viewKey, await renderSnapshotToPng(snapshot)] as const
    )
  );

  return entries.reduce<Partial<Record<ViewKey, string>>>((acc, [viewKey, png]) => {
    if (png) acc[viewKey] = png;
    return acc;
  }, {});
};
