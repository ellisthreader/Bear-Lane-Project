import type { PricePreviewSnapshot } from "../Canvas/Canvas";

export function previewSnapshotSignature(snapshot?: PricePreviewSnapshot): string {
  if (!snapshot) return "";

  return JSON.stringify({
    baseImage: snapshot.baseImage,
    canvasWidth: snapshot.canvasWidth,
    canvasHeight: snapshot.canvasHeight,
    restrictedBox: snapshot.restrictedBox,
    layers: snapshot.layers.map((layer) => ({
      uid: layer.uid,
      type: layer.type,
      url: layer.url ?? "",
      text: layer.text ?? "",
      position: layer.position,
      size: layer.size,
      rotation: layer.rotation,
      flip: layer.flip,
      color: layer.color ?? "",
      borderColor: layer.borderColor ?? "",
      borderWidth: layer.borderWidth ?? 0,
      fontFamily: layer.fontFamily ?? "",
      fontSize: layer.fontSize ?? 0,
    })),
  });
}

