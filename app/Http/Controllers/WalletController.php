<?php

namespace App\Http\Controllers;

use App\Models\UserPaymentMethod;
use App\Services\Stripe\StripeWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;

class WalletController extends Controller
{
    public function __construct(private readonly StripeWalletService $walletService)
    {
    }

    public function connect(Request $request, string $provider): RedirectResponse
    {
        $normalized = strtoupper(trim($provider));
        if (!in_array($normalized, ['PAYPAL', 'KLARNA'], true)) {
            abort(404);
        }

        return redirect('/checkout?payment=' . $normalized);
    }

    public function checkoutComplete(Request $request): RedirectResponse
    {
        $query = $request->getQueryString();
        $target = '/checkout' . ($query ? ('?' . $query) : '');
        return redirect($target);
    }

    public function disconnect(Request $request, int $paymentMethodId): JsonResponse
    {
        $user = $request->user();
        $method = UserPaymentMethod::where('user_id', $user->id)
            ->where('is_active', true)
            ->findOrFail($paymentMethodId);

        $wasDefault = $method->is_default;

        try {
            $this->walletService->detachPaymentMethod($method);
        } catch (\Throwable $e) {
            // Keep local deactivation even if provider detach fails.
        }

        $method->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        if ($wasDefault) {
            $next = UserPaymentMethod::where('user_id', $user->id)
                ->where('is_active', true)
                ->latest('updated_at')
                ->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json(['success' => true]);
    }
}
