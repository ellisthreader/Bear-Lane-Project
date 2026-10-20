<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use App\Mail\InstantQuoteMail;
use App\Models\InstantQuote;
use App\Models\User;
use App\Services\AdminNotificationService;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class InstantQuoteController extends Controller
{
    public function store(Request $request, RecaptchaService $recaptchaService, AdminNotificationService $adminNotificationService)
    {
        $recaptchaService->verifyOrFail($request, 'instant_quote');

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'quoteNumber' => 'required|string|max:20',
            'items' => 'required|array',
            'total' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $quote = InstantQuote::create([
            'name' => $request->name,
            'email' => $request->email,
            'quote_number' => $request->quoteNumber,
            'items' => json_encode($request->items),
            'total' => $request->total,
        ]);

        $items = $this->normalizeItems((array) $request->items);
        $name = (string) $request->name;
        $email = (string) $request->email;
        $quoteNumber = (string) $request->quoteNumber;
        $total = (float) $request->total;

        try {
            Mail::to($email)->send(new InstantQuoteMail(
                $name,
                $email,
                $quoteNumber,
                $items,
                $total,
                $quote->created_at,
            ));
        } catch (\Throwable $e) {
            Log::error('Instant quote email failed', [
                'email' => $email,
                'quote_number' => $quoteNumber,
                'error' => $e->getMessage(),
            ]);
        }

        $accountStatus = $request->user()
            ? 'Signed in (' . ($request->user()->email ?? 'account') . ')'
            : (User::query()->where('email', $email)->exists() ? 'Has an account (not signed in)' : 'Guest');

        $adminNotificationService->sendAdminEventView(
            'instant_quote_generated',
            'New instant quote #' . $quoteNumber . ' · £' . number_format($total, 2),
            'emails.quotes.instant-admin',
            [
                'name' => $name,
                'email' => $email,
                'quoteNumber' => $quoteNumber,
                'items' => $items,
                'total' => $total,
                'submittedAt' => $quote->created_at,
                'accountStatus' => $accountStatus,
            ]
        );

        return response()->json(['success' => true, 'quote' => $quote]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeItems(array $items): array
    {
        return array_values(array_map(function ($item) {
            $item = is_array($item) ? $item : [];

            return [
                'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                'productType' => (string) ($item['productType'] ?? ''),
                'productGroup' => (string) ($item['productGroup'] ?? ''),
                'productKey' => (string) ($item['productKey'] ?? ''),
                'designType' => (string) ($item['designType'] ?? ''),
                'sizeCategory' => (string) ($item['sizeCategory'] ?? ''),
                'size' => (string) ($item['size'] ?? ''),
                'unitPrice' => isset($item['unitPrice']) && is_numeric($item['unitPrice']) ? (float) $item['unitPrice'] : null,
                'price' => isset($item['price']) && is_numeric($item['price']) ? (float) $item['price'] : null,
            ];
        }, $items));
    }
}
