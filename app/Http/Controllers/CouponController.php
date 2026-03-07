<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Coupon;
use Illuminate\Support\Facades\Log;

class CouponController extends Controller
{
    public function apply(Request $request)
    {
        $code = strtoupper(trim((string) $request->input('code', '')));
        $subtotal = (int) $request->input('subtotal_cents', 0);
        $shipping = max(0, (int) $request->input('shipping_cents', 0));

        Log::info('[CouponController] Applying coupon', [
            'code' => $code,
            'subtotal_cents' => $subtotal,
            'shipping_cents' => $shipping,
        ]);

        try {
            $coupon = Coupon::whereRaw('UPPER(code) = ?', [$code])->where('active', true)->first();

            if (!$coupon) {
                Log::warning('[CouponController] Invalid coupon code', ['code' => $code]);
                return response()->json(['valid' => false, 'message' => 'Invalid code'], 400);
            }

            if ($coupon->starts_at && now()->lt($coupon->starts_at)) {
                return response()->json(['valid' => false, 'message' => 'Not active yet'], 400);
            }

            if ($coupon->expires_at && now()->gt($coupon->expires_at)) {
                return response()->json(['valid' => false, 'message' => 'Expired'], 400);
            }

            if ($coupon->usage_limit && $coupon->times_used >= $coupon->usage_limit) {
                return response()->json(['valid' => false, 'message' => 'Code fully used'], 400);
            }

            if ($subtotal < $coupon->min_spend) {
                return response()->json(['valid' => false, 'message' => 'Minimum spend not met'], 400);
            }

            if ($code === 'FREESHIP') {
                return response()->json([
                    'valid' => true,
                    'coupon_id' => $coupon->id,
                    'code' => $coupon->code,
                    'type' => 'shipping',
                    'value' => 0,
                    'discount_cents' => $shipping,
                    'new_subtotal_cents' => $subtotal,
                ]);
            }

            $discount = $coupon->type === 'percent'
                ? intval($subtotal * $coupon->value / 100)
                : min($coupon->value, $subtotal);

            return response()->json([
                'valid' => true,
                'coupon_id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->type === 'fixed' ? (((int) $coupon->value) / 100) : $coupon->value,
                'discount_cents' => $discount,
                'new_subtotal_cents' => max(0, $subtotal - $discount),
            ]);
        } catch (\Throwable $e) {
            Log::error('[CouponController] Error applying coupon', [
                'code' => $code,
                'subtotal' => $subtotal,
                'exception' => $e->getMessage(),
            ]);
            return response()->json(['valid' => false, 'message' => 'Server error'], 500);
        }
    }
}
