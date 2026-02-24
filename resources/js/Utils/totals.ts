// resources/js/utils/totals.ts

export type ItemForTotals = {
  unit_price?: number; // Price in pounds (£)
  unit_price_cents?: number; // Price in pence (integer)
  quantity?: number;
};

export type AppliedDiscount = {
  type: "percent" | "fixed";
  value: number; // e.g. 25 for 25%, or 5 for £5 off
  code?: string;
} | null;

/**
 * Computes all order totals in integer pence (cents) for precision.
 * 
 * Calculation order:
 *  1. Subtotal (sum of all item prices * quantity)
 *  2. Discount (applied only to subtotal)
 *  3. VAT (20% of discounted subtotal)
 *  4. Add shipping
 *  5. Return all totals in cents
 */
export function computeTotalsInCents(args: {
  items: ItemForTotals[];
  shippingCost?: number; // in pounds (£)
  extraFeeCost?: number; // in pounds (£)
  appliedDiscount?: AppliedDiscount;
}) {
  const { items, shippingCost = 0, extraFeeCost = 0, appliedDiscount = null } = args;

  // --- subtotal in cents
  const subtotal_cents = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 1);
    const unit_cents =
      typeof item.unit_price_cents === "number"
        ? Math.round(item.unit_price_cents)
        : Math.round((Number(item.unit_price) || 0) * 100);
    return sum + unit_cents * qty;
  }, 0);

  // --- shipping in cents
  const shipping_cents = Math.round((Number(shippingCost) || 0) * 100);
  const extra_fee_cents = Math.round((Number(extraFeeCost) || 0) * 100);

  // --- discount applied only to subtotal (not VAT or shipping)
  let discount_cents = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === "percent") {
      discount_cents = Math.round(subtotal_cents * (appliedDiscount.value / 100));
    } else if (appliedDiscount.type === "fixed") {
      discount_cents = Math.round((Number(appliedDiscount.value) || 0) * 100);
      discount_cents = Math.min(discount_cents, subtotal_cents); // never more than subtotal
    }
  }

  // --- discounted subtotal
  const discounted_subtotal_cents = Math.max(subtotal_cents - discount_cents, 0);

  // --- VAT (20% on discounted subtotal only)
  const vat_cents = Math.round(discounted_subtotal_cents * 0.2);

  // --- final total (subtotal - discount + VAT + shipping + extra fee)
  const total_cents = Math.max(
    discounted_subtotal_cents + vat_cents + shipping_cents + extra_fee_cents,
    0
  );

  // --- return breakdown
  return {
    subtotal_cents,
    discount_cents,
    discounted_subtotal_cents,
    vat_cents,
    shipping_cents,
    extra_fee_cents,
    total_cents,

    // Also return readable £ versions for frontend display
    subtotal: (subtotal_cents / 100).toFixed(2),
    discount: (discount_cents / 100).toFixed(2),
    discounted_subtotal: (discounted_subtotal_cents / 100).toFixed(2),
    vat: (vat_cents / 100).toFixed(2),
    shipping: (shipping_cents / 100).toFixed(2),
    extra_fee: (extra_fee_cents / 100).toFixed(2),
    total: (total_cents / 100).toFixed(2),
  };
}
    
