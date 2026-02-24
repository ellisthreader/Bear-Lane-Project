import React, { useMemo } from "react";
import { Link } from "@inertiajs/react";
import { FiEdit2 } from "react-icons/fi";
import { useCart } from "@/Context/CartContext";
import { useCheckout } from "@/Context/CheckoutContext";
import { computeTotalsInCents } from "@/Utils/totals";

type OrderSummaryProps = {
  giftPackagingEnabled?: boolean;
  giftPackagingCost?: number;
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  giftPackagingEnabled = false,
  giftPackagingCost = 0,
}) => {
  const { cart } = useCart();
  const {
    shippingCost = 0,
    appliedDiscount,
    discountCode,
    setDiscountCode,
    validateDiscount,
    loading,
  } = useCheckout();

  const totals = useMemo(() => {
    return computeTotalsInCents({
      items: cart.map((item) => ({
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
      })),
      shippingCost,
      appliedDiscount,
      extraFeeCost: giftPackagingCost,
    });
  }, [cart, shippingCost, appliedDiscount, giftPackagingCost]);

  const handleApplyCode = async () => {
    const code = discountCode.trim();
    if (!code) return;
    await validateDiscount(code);
  };

  return (
    <aside className="rounded-2xl border border-[#C6A75E]/25 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Order summary</h3>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8A6D2B] hover:text-[#6F5724]"
        >
          <FiEdit2 size={14} />
          Edit bag
        </Link>
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
              key={`${item.slug}-${item.colour}-${item.size}`}
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-xs text-gray-600">Size: {item.size}</p>
                  <p className="text-xs text-gray-600">Colour: {item.colour}</p>
                </div>

                <p className="text-sm font-semibold text-gray-900">
                  £{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-2">
        <label className="text-sm font-medium text-gray-700">Add promotional code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="Enter code"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#C6A75E] focus:outline-none"
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
      </div>

      <div className="my-4 h-px bg-[#C6A75E]/20" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>£{totals.subtotal}</span>
        </div>

        {Number(totals.discount) > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promotional discount</span>
            <span>-£{totals.discount}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-700">
          <span>Delivery</span>
          <span>£{totals.shipping}</span>
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
  );
};

export default OrderSummary;
