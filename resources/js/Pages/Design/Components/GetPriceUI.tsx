import React, { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  Images,
  Palette,
  Ruler,
  ShieldCheck,
  Shirt,
  Sticker,
  Type,
} from "lucide-react";
import type { PricePreviewSnapshot } from "../Canvas/Canvas";

import DesignPreview from "./DesignPreview";

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
    unitPrice: number;
    previewSnapshot?: PricePreviewSnapshot;
  }) => void;
  onBuyNow?: (payload: {
    quantity: number;
    sizeBreakdown: Record<string, number>;
    unitPrice: number;
    previewSnapshot?: PricePreviewSnapshot;
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
  const [zoomedSide, setZoomedSide] = useState<SideStatus | null>(null);
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>(() => {
    if (!availableSizes.length) return {};
    const defaultSize = selectedSize && availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0];
    return availableSizes.reduce<Record<string, number>>((acc, size) => {
      acc[size] = size === defaultSize ? 1 : 0;
      return acc;
    }, {});
  });
  useEffect(() => {
    setStep("configure");
    setLoadingPrice(false);
  }, []);

  useEffect(() => {
    if (!availableSizes.length) {
      const fallback = selectedSize?.trim() ? selectedSize : "One Size";
      setSizeBreakdown(prev => {
        if (typeof prev[fallback] === "number") return prev;
        return { ...prev, [fallback]: 1 };
      });
      return;
    }

    const defaultSize =
      selectedSize && availableSizes.includes(selectedSize)
        ? selectedSize
        : availableSizes[0];

    setSizeBreakdown(prev =>
      availableSizes.reduce<Record<string, number>>((acc, size) => {
        if (typeof prev[size] === "number") {
          acc[size] = prev[size];
        } else {
          acc[size] = size === defaultSize ? 1 : 0;
        }
        return acc;
      }, {})
    );

    if ((!selectedSize || !availableSizes.includes(selectedSize)) && defaultSize) {
      onSizeChange?.(defaultSize);
    }
  }, [availableSizes, selectedSize, onSizeChange]);
  const sizeList = useMemo(() => {
    if (availableSizes.length > 0) return availableSizes;
    if (Object.keys(sizeBreakdown).length > 0) return Object.keys(sizeBreakdown);
    if (selectedSize?.trim()) return [selectedSize];
    return ["One Size"];
  }, [availableSizes, sizeBreakdown, selectedSize]);

  const sizeSummaryItems = sizeList
    .map(size => {
      const qty = sizeBreakdown[size] ?? 0;
      return qty > 0 ? `${size}: ${qty}` : null;
    })
    .filter(Boolean) as string[];
  const sizeSummary =
    sizeSummaryItems.length > 0 ? sizeSummaryItems.join(" • ") : "No quantities selected yet";

  const editedCount = sides.filter(side => side.edited).length;
  const frontSide = sides.find(side => side.key === "front") ?? sides[0];
  const orderedSides = useMemo(
    () => [...sides].sort((a, b) => a.pictureNumber - b.pictureNumber),
    [sides]
  );
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
  const totalQuantity = sizeList.reduce(
    (sum, sizeKey) => sum + (sizeBreakdown[sizeKey] ?? 0),
    0
  );
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
    unitPrice,
    previewSnapshot: frontSide?.preview,
  };

  const wrapperClass = docked
    ? "h-full"
    : "fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4";
  const panelClass = docked
    ? "h-full w-full rounded-3xl border border-gray-100 bg-white shadow-[0_15px_50px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden"
    : "max-h-[92vh] w-[1080px] max-w-[98vw] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_15px_50px_rgba(0,0,0,0.06)] flex flex-col";
  const headerClass = docked
    ? "sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm"
    : "flex items-center justify-between border-b p-6";
  const mutedTextClass = "text-gray-600";
  const inputClass = "w-full rounded-lg border bg-white px-3 py-2";
  const tagClass = "inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-sm";
  const orderImageSize = docked ? 160 : 180;

  return (
    <div className={wrapperClass}>
      <div className={panelClass}>
        <div className={headerClass}>
          <div className="inline-flex bg-gray-50 rounded-full p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => setStep("configure")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === "configure"
                  ? "bg-[#C6A75E] text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Configure
            </button>
            <button
              type="button"
              onClick={() => setStep("summary")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === "summary"
                  ? "bg-[#C6A75E] text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Summary
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-600 hover:bg-[#C6A75E]/15 hover:text-[#8A6D2B] transition"
            aria-label="Close pricing panel"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {step === "configure" ? (
            <div className="flex h-full flex-col gap-5 overflow-hidden px-6 py-5">
              <div className="flex gap-4">
                <div className="h-32 w-32 overflow-hidden rounded-2xl bg-gray-100">
                  {(frontSide?.imageSrc || orderedSides[0]?.imageSrc) && (
                    <img
                      src={frontSide?.imageSrc || orderedSides[0]?.imageSrc}
                      alt={`${productName}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Product</p>
                    <p className="text-2xl font-semibold text-gray-900">{productName}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Colour: {selectedColourValue} • Size: {selectedSizeValue}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Edited sides: {editedCount} / {sides.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
              </div>

              <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-5 shadow-sm flex flex-col gap-3">
                <p className="text-sm font-medium">Set quantity by size</p>
                <div className="overflow-x-auto">
                  <div className="flex min-w-max items-end gap-3">
                    {sizeList.map(size => (
                      <label key={size} className="w-16">
                        <span className={`block text-center text-xs font-medium ${mutedTextClass}`}>{size}</span>
                        <input
                          type="number"
                          min={0}
                          value={sizeBreakdown[size] ? String(sizeBreakdown[size]) : ""}
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setSizeBreakdown(prev => ({ ...prev, [size]: 0 }));
                              return;
                            }
                            if (!/^\d+$/.test(raw)) return;
                            setSizeBreakdown(prev => ({
                              ...prev,
                              [size]: Number.parseInt(raw, 10),
                            }));
                          }}
                          className="mt-1 h-10 w-full rounded-md border px-1 text-center"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex justify-end">
                <button
                  onClick={handleContinue}
                  disabled={loadingPrice || totalQuantity <= 0}
                  className="rounded-xl bg-[#C6A75E] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#B8994E] disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loadingPrice ? "Loading price..." : "Continue"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Price per item</p>
                <div className="text-5xl font-bold text-gray-900">{formatGBP(unitPrice)}</div>
                <span className="text-sm text-gray-500">each {productName}</span>
                <p className="text-sm text-gray-600">
                  Total {Math.max(totalQuantity, 1)} item(s): {formatGBP(totalPrice)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {designTags.length > 0 ? (
                    designTags.map(tag => (
                      <span key={tag.key} className={tagClass}>
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
              </div>

              <div className="rounded-3xl border border-[#DAC885]/60 bg-gradient-to-br from-white via-white/90 to-[#FDFBF6] px-6 py-5 shadow-[0_25px_65px_rgba(198,167,94,0.25)] w-full">
                <div className="flex items-center justify-between text-gray-500">
                  <p className="text-[10px] uppercase tracking-[0.5em]">Your Order</p>
                  <span className="text-[10px] uppercase tracking-[0.5em]">Qty {Math.max(totalQuantity, 1)}</span>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <p className="text-lg font-semibold text-gray-900">{productName}</p>
                  <p className="text-sm text-gray-500">Colour: {selectedColourValue}</p>
                </div>
                <div className="flex flex-wrap items-start gap-3 overflow-x-auto">
                  {orderedSides.map(side => (
                    <div
                      key={side.key}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-2"
                      style={{ width: orderImageSize }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                        {side.label}
                      </p>
                      <DesignPreview
                        snapshot={side.preview}
                        fallbackImage={side.imageSrc}
                        width={orderImageSize}
                        fixedSize={orderImageSize}
                        alt={`${side.label} preview`}
                        className="h-[160px] w-full"
                        noFrame
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="flex items-center gap-4">
                  <img
                    src="/images/BLSatisfaction.png"
                    alt="Satisfaction badge"
                    className="h-20 w-20 object-contain"
                  />
                  <div className="flex flex-col">
                    <p className="text-base font-semibold text-[#C6A75E]">100% Satisfaction Guarantee</p>
                    <p className="text-xs text-gray-500">We deliver excellence.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setStep("configure")}
                  className="rounded-xl border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:border-[#C6A75E] hover:bg-[#C6A75E]/10"
                >
                  Edit quantity / sizes
                </button>
                <button
                  onClick={() => onAddToCart?.(actionPayload)}
                  className="rounded-xl bg-[#8A6D2B] px-5 py-2 font-semibold text-white hover:bg-[#755A22]"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => onBuyNow?.(actionPayload)}
                  className="rounded-xl bg-[#C6A75E] px-5 py-2 font-semibold text-white hover:bg-[#B8994E]"
                >
                  Buy Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {zoomedSide && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            onClick={() => setZoomedSide(null)}
            aria-label="Close zoom preview"
          />
          <div className="relative z-10 rounded-2xl bg-white p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedSide(null)}
              className="absolute right-3 top-3 rounded-md border bg-white px-2 py-1 text-sm"
            >
              Close
            </button>
            <p className="mb-3 text-sm font-semibold text-gray-700">{zoomedSide.label}</p>
            <DesignPreview
              snapshot={zoomedSide.preview}
              fallbackImage={zoomedSide.imageSrc}
              width={docked ? 700 : 760}
              alt={`${zoomedSide.label} zoomed preview`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GetPriceUI;
