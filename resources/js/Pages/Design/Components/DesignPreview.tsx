"use client";

import React from "react";
import type { PricePreviewSnapshot } from "../Canvas/Canvas";

type DesignPreviewProps = {
  snapshot?: PricePreviewSnapshot;
  fallbackImage?: string;
  width: number;
  alt: string;
  className?: string;
  noFrame?: boolean;
  fixedSize?: number;
};

export default function DesignPreview({
  snapshot,
  fallbackImage,
  width,
  alt,
  className,
  noFrame = false,
  fixedSize,
}: DesignPreviewProps) {
  const canvasWidth = snapshot?.canvasWidth && snapshot.canvasWidth > 0 ? snapshot.canvasWidth : 1000;
  const canvasHeight = snapshot?.canvasHeight && snapshot.canvasHeight > 0 ? snapshot.canvasHeight : 1000;
  const height = fixedSize ?? width * (canvasHeight / canvasWidth);
  const scale = width / canvasWidth;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl",
        !noFrame && "border bg-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width, height }}
    >
      {(fallbackImage || snapshot?.baseImage) && (
        <img
          src={fallbackImage || snapshot?.baseImage}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {snapshot?.layers.map(layer => {
        const scaleX = layer.flip === "horizontal" ? -1 : 1;
        const scaleY = layer.flip === "vertical" ? -1 : 1;
        const layerStyle: React.CSSProperties = {
          position: "absolute",
          left: layer.position.x * scale,
          top: layer.position.y * scale,
          width: layer.size.w * scale,
          height: layer.size.h * scale,
          transform: `rotate(${layer.rotation}deg) scale(${scaleX}, ${scaleY})`,
          transformOrigin: "center center",
        };

        if (layer.type === "text") {
          return (
            <div key={layer.uid} style={layerStyle}>
              <span
                style={{
                  fontFamily: layer.fontFamily ?? "Arial",
                  fontSize: `${(layer.fontSize ?? 24) * scale}px`,
                  whiteSpace: "pre-wrap",
                  color: layer.color ?? "#000000",
                  WebkitTextStrokeColor: layer.borderColor ?? "#000000",
                  WebkitTextStrokeWidth: `${(layer.borderWidth ?? 0) * scale}px`,
                  WebkitTextFillColor: layer.color ?? "#000000",
                  lineHeight: 1,
                }}
              >
                {layer.text || "Text"}
              </span>
            </div>
          );
        }

        const isSvgClipart =
          layer.type === "clipart" &&
          typeof layer.url === "string" &&
          /\.svg(?:[?#].*)?$/i.test(layer.url);

        if (isSvgClipart) {
          return (
            <div
              key={layer.uid}
              style={{
                ...layerStyle,
                backgroundColor: layer.color ?? "#000000",
                WebkitMaskImage: `url("${layer.url}")`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
                maskImage: `url("${layer.url}")`,
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />
          );
        }

        return (
          <img
            key={layer.uid}
            src={layer.url}
            alt=""
            style={layerStyle}
            className="object-contain"
          />
        );
      })}
    </div>
  );
}
