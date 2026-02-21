import React, { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Images,
  Palette,
  Ruler,
  Shirt,
  Sticker,
  Type,
} from "lucide-react";
import type { PricePreviewSnapshot } from "../Canvas/Canvas";

type SideStatus = {
  key: "front" | "back" | "rightSleeve" | "leftSleeve";
  pictureNumber: 1 | 2 | 3 | 4;
  label: string;
  edited: boolean;
  imageSrc?: string;
  preview?: PricePreviewSnapshot;
};

interface GetPriceUIProps {
  onClose: () => void;
  docked?: boolean;
  productName: string;
  selectedColour?: string | null;
  availableColours?: string[];
  onColourChange?: (colour: string) => void;
  sides: SideStatus[];
  basePrice?: number | string;
  availableSizes?: string[];
  selectedSize?: string | null;
  onSizeChange?: (size: string) => void;
  onAddToCart?: (payload: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
  }) => void;
  onBuyNow?: (payload: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
  }) => void;
}

function parsePrice(price: number | string | undefined): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const parsed = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`;
}

function DesignPreview({
  snapshot,
  fallbackImage,
  width,
  alt,
}: {
  snapshot?: PricePreviewSnapshot;
  fallbackImage?: string;
  width: number;
  alt: string;
}) {
  const canvasWidth = snapshot?.canvasWidth && snapshot.canvasWidth > 0 ? snapshot.canvasWidth : 1000;
  const canvasHeight = snapshot?.canvasHeight && snapshot.canvasHeight > 0 ? snapshot.canvasHeight : 1000;
  const height = width * (canvasHeight / canvasWidth);
  const scale = width / canvasWidth;

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-white"
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

const GetPriceUI: React.FC<GetPriceUIProps> = ({
  onClose,
  docked = false,
  productName,
  selectedColour,
  availableColours = [],
  onColourChange,
  sides,
  basePrice,
  availableSizes = [],
  selectedSize,
  onSizeChange,
  onAddToCart,
  onBuyNow,
}) => {
  const [step, setStep] = useState<"configure" | "summary">("configure");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [singleQuantity, setSingleQuantity] = useState(1);
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>(() => {
    if (!availableSizes.length) return {};
    const defaultSize = selectedSize && availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0];
    return availableSizes.reduce<Record<string, number>>((acc, size) => {
      acc[size] = size === defaultSize ? 1 : 0;
      return acc;
    }, {});
  });

  const editedCount = sides.filter(side => side.edited).length;
  const frontSide = sides.find(side => side.key === "front") ?? sides[0];
  const baseUnitPrice = parsePrice(basePrice);
  const designCounts = useMemo(() => {
    const counts = {
      editedSides: 0,
      text: 0,
      image: 0,
      clipart: 0,
    };

    sides.forEach(side => {
      const layers = side.preview?.layers ?? [];
      if (layers.length > 0) counts.editedSides += 1;
      layers.forEach(layer => {
        if (layer.type === "text") counts.text += 1;
        if (layer.type === "image") counts.image += 1;
        if (layer.type === "clipart") counts.clipart += 1;
      });
    });

    return counts;
  }, [sides]);

  const designSurchargePerItem =
    designCounts.editedSides * 1.25 +
    designCounts.text * 0.75 +
    designCounts.image * 1.5 +
    designCounts.clipart * 1.0;
  const unitPrice = baseUnitPrice + designSurchargePerItem;
  const totalQuantity = availableSizes.length
    ? Object.values(sizeBreakdown).reduce((sum, qty) => sum + qty, 0)
    : singleQuantity;
  const totalPrice = unitPrice * Math.max(totalQuantity, 1);

  const selectedColourValue =
    selectedColour ?? availableColours[0] ?? "White";
  const selectedSizeValue =
    selectedSize ?? availableSizes[0] ?? "One Size";

  const designTags = [
    {
      key: "text",
      label: `${designCounts.text} Text`,
      icon: <Type size={14} />,
      show: designCounts.text > 0,
    },
    {
      key: "image",
      label: `${designCounts.image} Image`,
      icon: <Images size={14} />,
      show: designCounts.image > 0,
    },
    {
      key: "clipart",
      label: `${designCounts.clipart} Clipart`,
      icon: <Sticker size={14} />,
      show: designCounts.clipart > 0,
    },
    {
      key: "sides",
      label: `${designCounts.editedSides} Edited Side${designCounts.editedSides === 1 ? "" : "s"}`,
      icon: <Shirt size={14} />,
      show: designCounts.editedSides > 0,
    },
  ].filter(tag => tag.show);

  const handleContinue = () => {
    setLoadingPrice(true);
    window.setTimeout(() => {
      setLoadingPrice(false);
      setStep("summary");
    }, 550);
  };

  const actionPayload = {
    quantity: Math.max(totalQuantity, 1),
    sizeBreakdown: availableSizes.length ? sizeBreakdown : {},
  };

  const wrapperClass = docked
    ? "h-full"
    : "fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4";
  const panelClass = docked
    ? "h-full w-full rounded-2xl border bg-white shadow-xl flex flex-col overflow-hidden"
    : "max-h-[92vh] w-[1080px] max-w-[98vw] overflow-y-auto rounded-2xl bg-white shadow-2xl";
  const headerClass = docked
    ? "sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm"
    : "flex items-center justify-between border-b p-6";
  const mutedTextClass = "text-gray-600";
  const cardClass = "rounded-xl border bg-gray-50 p-4";
  const inputClass = "w-full rounded-lg border bg-white px-3 py-2";
  const tagClass = "inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-sm";

  return (
    <div className={wrapperClass}>
      <div className={panelClass}>
        <div className={headerClass}>
          <div>
            <h2 className="text-xl font-semibold">
              {step === "configure" ? "Confirm Product Setup" : "Pricing Summary"}
            </h2>
            <p className={`text-sm ${mutedTextClass}`}>
              {selectedColour ? `${selectedColour} ${productName}` : productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition"
            aria-label="Close pricing panel"
          >
            ✕
          </button>
        </div>

        {step === "configure" && (
          <div className={docked ? "flex-1 space-y-4 p-4 overflow-hidden" : "space-y-5 p-6"}>
            <div className="rounded-2xl border bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[320px_1fr]">
                <div>
                  <p className="mb-2 text-sm text-gray-500">Front Preview</p>
                  <DesignPreview
                    snapshot={frontSide?.preview}
                    fallbackImage={frontSide?.imageSrc}
                    width={docked ? 300 : 360}
                    alt="Front preview"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Product</p>
                    <p className="text-2xl font-semibold">
                      {selectedColourValue} {productName}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-sm text-gray-700">
                      <Palette size={14} />
                      Colour
                    </span>
                    <select
                      value={selectedColourValue}
                      onChange={e => onColourChange?.(e.target.value)}
                      className={inputClass}
                    >
                      {(availableColours.length ? availableColours : [selectedColourValue]).map(colour => (
                        <option key={colour} value={colour}>
                          {colour}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-sm text-gray-700">
                      <Ruler size={14} />
                      Size
                    </span>
                    <select
                      value={selectedSizeValue}
                      onChange={e => onSizeChange?.(e.target.value)}
                      className={inputClass}
                    >
                      {(availableSizes.length ? availableSizes : [selectedSizeValue]).map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border bg-white p-3">
                    <p className={`text-sm ${mutedTextClass}`}>Edited sides</p>
                    <p className="text-lg font-semibold">{editedCount} / {sides.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
              {availableSizes.length > 0 ? (
                <div className={cardClass}>
                  <p className="mb-3 font-medium">Set quantity by size</p>
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-end gap-3">
                      {availableSizes.map(size => (
                        <label key={size} className="w-16">
                          <span className={`block text-center text-xs font-medium ${mutedTextClass}`}>{size}</span>
                          <input
                            type="number"
                            min={0}
                            value={sizeBreakdown[size] ?? 0}
                            onChange={e =>
                              setSizeBreakdown(prev => ({
                                ...prev,
                                [size]: Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0),
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-md border px-1 text-center"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cardClass}>
                  <p className="mb-3 font-medium">Quantity</p>
                  <input
                    type="number"
                    min={1}
                    value={singleQuantity}
                    onChange={e => setSingleQuantity(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))}
                    className="w-28 rounded-md border px-2 py-1 text-right"
                  />
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={loadingPrice || totalQuantity <= 0}
                className="h-fit rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loadingPrice ? "Loading price..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className={docked ? "flex-1 space-y-4 p-4 overflow-hidden" : "space-y-6 p-6"}>
            <div className={cardClass}>
              <p className={`text-sm ${mutedTextClass}`}>Price per product (base + design complexity)</p>
              <p className="text-2xl font-semibold">
                {formatGBP(unitPrice)} each {productName}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Base {formatGBP(baseUnitPrice)} + Design {formatGBP(designSurchargePerItem)}
              </p>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Total: {Math.max(totalQuantity, 1)} item(s) • {formatGBP(totalPrice)}
              </p>
            </div>

            <div className="-mt-2 flex flex-wrap gap-2 px-1">
              {designTags.length > 0 ? (
                designTags.map(tag => (
                  <span
                    key={tag.key}
                    className={tagClass}
                  >
                    {tag.icon}
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className={tagClass}>
                  <CircleDollarSign size={14} />
                  No design extras added
                </span>
              )}
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Product card</h3>
                <p className="text-sm font-medium">
                  Qty {Math.max(totalQuantity, 1)} • {formatGBP(totalPrice)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                  <p className="font-semibold">{productName}</p>
                  <p className={mutedTextClass}>
                    Colour: {selectedColourValue} • Size: {selectedSizeValue} • Price each: {formatGBP(unitPrice)}
                  </p>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Design Preview</p>
                    <p className="text-sm font-semibold">{formatGBP(unitPrice)}</p>
                  </div>
                  <DesignPreview
                    snapshot={frontSide?.preview}
                    fallbackImage={frontSide?.imageSrc}
                    width={docked ? 300 : 420}
                    alt="Design preview"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setStep("configure")}
                className="rounded-xl border px-5 py-2 font-medium"
              >
                Edit quantity / sizes
              </button>
              <button
                onClick={() => onAddToCart?.(actionPayload)}
                className="rounded-xl bg-gray-900 px-5 py-2 font-semibold text-white"
              >
                Add to Cart
              </button>
              <button
                onClick={() => onBuyNow?.(actionPayload)}
                className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white"
              >
                Buy Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetPriceUI;
