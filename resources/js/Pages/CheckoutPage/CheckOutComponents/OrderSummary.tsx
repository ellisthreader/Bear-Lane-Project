import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useCart } from "@/Context/CartContext";
import type { CartItem } from "@/Context/CartContext";
import { useCheckout } from "@/Context/CheckoutContext";
import { computeTotalsInCents } from "@/Utils/totals";
import { showCheckoutError, showCheckoutSuccess } from "../checkoutToasts";
import DesignPreview from "@/Pages/Design/Components/DesignPreview";

type OrderSummaryProps = {
  giftPackagingEnabled?: boolean;
  giftPackagingCost?: number;
  taxRatePercent?: number;
  taxEnabled?: boolean;
  taxMode?: "inclusive" | "exclusive";
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  giftPackagingEnabled = false,
  giftPackagingCost = 0,
  taxRatePercent = 20,
  taxEnabled = true,
  taxMode = "exclusive",
}) => {
  const { cart, removeFromCart } = useCart();
  const {
    shippingCost = 0,
    appliedDiscount,
    discountCode,
    setDiscountCode,
    validateDiscount,
    discountError,
    loading,
  } = useCheckout();
  const [isPromoInvalid, setIsPromoInvalid] = React.useState(false);
  const [promoJustApplied, setPromoJustApplied] = React.useState(false);
  const [isEditingBag, setIsEditingBag] = React.useState(false);
  const [zoomedItem, setZoomedItem] = React.useState<CartItem | null>(null);

  const totals = useMemo(() => {
    return computeTotalsInCents({
      items: cart.map((item) => ({
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
      })),
      shippingCost,
      appliedDiscount,
      extraFeeCost: giftPackagingCost,
      taxRatePercent,
      taxEnabled,
      taxMode,
    });
  }, [cart, shippingCost, appliedDiscount, giftPackagingCost, taxRatePercent, taxEnabled, taxMode]);

  const handleApplyCode = async () => {
    const code = discountCode.trim();
    if (!code) {
      setIsPromoInvalid(true);
      showCheckoutError("Please enter a promotional code.");
      return;
    }

    const result = await validateDiscount(code);
    if (result.success) {
      setIsPromoInvalid(false);
      setPromoJustApplied(true);
      window.setTimeout(() => setPromoJustApplied(false), 900);
      showCheckoutSuccess(`Promotional code "${code.toUpperCase()}" applied.`);
      return;
    }

    setIsPromoInvalid(true);
    showCheckoutError(result.message || "Invalid or expired promotional code.");
  };

  const promoDiscountPercent = useMemo(() => {
    if (totals.discount_cents <= 0 || totals.subtotal_cents <= 0) return null;
    const percent = (totals.discount_cents / totals.subtotal_cents) * 100;
    return Number(percent.toFixed(percent % 1 === 0 ? 0 : 1));
  }, [totals.discount_cents, totals.subtotal_cents]);

  const zoomModal = zoomedItem ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onClick={() => setZoomedItem(null)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#C6A75E]/30 bg-white p-4 shadow-[0_24px_90px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Design preview</h4>
          <button
            type="button"
            onClick={() => setZoomedItem(null)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-[#C6A75E]/60 hover:text-[#8A6D2B]"
          >
            Close
          </button>
        </div>

        <div className="flex justify-center rounded-xl border border-gray-200 bg-[#F8F8F8] p-3">
          {zoomedItem.previewSnapshot ? (
            <DesignPreview
              snapshot={zoomedItem.previewSnapshot}
              fallbackImage={zoomedItem.image}
              width={560}
              alt={`${zoomedItem.title} full preview`}
              className="max-w-full"
              noFrame
            />
          ) : zoomedItem.image ? (
            <img loading="lazy" decoding="async"
              src={zoomedItem.image}
              alt={zoomedItem.title}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center text-sm text-gray-500">
              No preview available
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <aside className="rounded-2xl border border-[#C6A75E]/25 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Order summary</h3>
        <button
          type="button"
          onClick={() => setIsEditingBag((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C6A75E]/35 bg-white px-2.5 py-1.5 text-sm font-medium text-[#8A6D2B] transition hover:border-[#C6A75E] hover:bg-[#FCF7EB]"
        >
          {isEditingBag ? <FiCheck size={14} /> : <FiEdit2 size={14} />}
          {isEditingBag ? "Done" : "Edit bag"}
        </button>
      </div>

      <div className="my-4 h-px bg-[#C6A75E]/20" />

      <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">My bag</p>

      <div className="mt-3 space-y-3">
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Your bag is empty.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={`${item.slug}-${item.colour}-${item.size}-${item.designType}`}
              className={`rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all duration-300 ${
                isEditingBag ? "shadow-[0_8px_24px_rgba(198,167,94,0.15)]" : ""
              }`}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setZoomedItem(item)}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:border-[#C6A75E]/60"
                  aria-label={`Zoom ${item.title} preview`}
                >
                  {item.previewSnapshot ? (
                    <DesignPreview
                      snapshot={item.previewSnapshot}
                      fallbackImage={item.image}
                      width={64}
                      fixedSize={64}
                      alt={`${item.title} preview`}
                      className="h-full w-full rounded-lg"
                      noFrame
                    />
                  ) : item.image ? (
                    <img loading="lazy" decoding="async" src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-xs text-gray-600">Size: {item.size}</p>
                  <p className="text-xs text-gray-600">Colour: {item.colour}</p>
                  <p className="text-xs text-gray-600">Design: {item.designType === "embroidery" ? "Embroidery" : "Printing"}</p>
                </div>

                <p className="text-sm font-semibold text-gray-900">
                  £{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </p>
              </div>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  isEditingBag ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.slug, item.colour, item.size, item.designType)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      <FiTrash2 size={13} />
                      Remove item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-gray-700">Add promotional code</label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => {
              setDiscountCode(e.target.value);
              if (isPromoInvalid) setIsPromoInvalid(false);
            }}
            placeholder="Enter code"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 transition-all duration-500 focus:outline-none ${
              isPromoInvalid
                ? "animate-checkout-shake border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200"
                : promoJustApplied
                ? "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] scale-[1.01] focus:border-emerald-500"
                : "border-gray-300 focus:border-[#C6A75E]"
            }`}
          />
          <button
            type="button"
            onClick={handleApplyCode}
            disabled={loading}
            className="rounded-lg bg-[#C6A75E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#B8994E] disabled:opacity-60"
          >
            Apply
          </button>
        </div>
        {appliedDiscount && (
          <div
            className={`inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 transition-all duration-500 ${
              promoJustApplied ? "translate-y-0 opacity-100" : "opacity-95"
            }`}
          >
            {appliedDiscount.code}
          </div>
        )}
        {isPromoInvalid && (
          <p className="text-xs text-red-600">{discountError || "Invalid or expired promotional code."}</p>
        )}
      </div>

      <div className="my-4 h-px bg-[#C6A75E]/20" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>£{totals.subtotal}</span>
        </div>

        {Number(totals.discount) > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promotional discount {promoDiscountPercent !== null ? `(${promoDiscountPercent}% off)` : ""}</span>
            <span>-£{totals.discount}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-700">
          <span>Delivery</span>
          <span>£{totals.shipping}</span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>
            {taxMode === "inclusive" ? "VAT included" : "VAT"}
            {taxEnabled ? ` (${Number(taxRatePercent || 0).toFixed(2).replace(/\\.00$/, "")}%)` : " (disabled)"}
          </span>
          <span>£{totals.vat}</span>
        </div>

        {giftPackagingEnabled && giftPackagingCost > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Gift packaging</span>
            <span>£{Number(giftPackagingCost).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="my-4 h-px bg-[#C6A75E]/20" />

      <div className="flex justify-between text-base font-bold text-gray-900">
        <span>Order total</span>
        <span>£{totals.total}</span>
      </div>
      </aside>

      {typeof document !== "undefined" && zoomModal ? createPortal(zoomModal, document.body) : null}
    </>
  );
};

export default OrderSummary;
