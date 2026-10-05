<?php

namespace App\Http\Controllers;

use App\Mail\InstantQuoteMail;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class QuoteController extends Controller
{
    public function sendQuote(Request $request, RecaptchaService $recaptchaService)
    {
        $recaptchaService->verifyOrFail($request, 'send_quote');

        Log::info('sendQuote called', [
            'items_count' => count((array) $request->input('items', [])),
            'has_email' => filled($request->input('email')),
        ]);

        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'items' => 'required|array|min:1',
            'total' => 'required|numeric',
            'quoteNumber' => 'required|numeric',
        ]);

        $data = $request->only(['name', 'email', 'items', 'total', 'quoteNumber']);

        $items = array_values(array_map(function ($item) {
            $item = is_array($item) ? $item : [];

            return [
                'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                'productType' => (string) ($item['productType'] ?? ''),
                'designType' => (string) ($item['designType'] ?? ''),
                'sizeCategory' => (string) ($item['sizeCategory'] ?? ''),
                'size' => (string) ($item['size'] ?? ''),
                'price' => isset($item['price']) && is_numeric($item['price']) ? (float) $item['price'] : null,
            ];
        }, (array) $data['items']));

        try {
            Mail::to((string) $data['email'])->send(new InstantQuoteMail(
                (string) $data['name'],
                (string) $data['email'],
                (string) $data['quoteNumber'],
                $items,
                (float) $data['total'],
            ));

            Log::info('Quote email sent successfully', [
                'quote_number' => $data['quoteNumber'],
            ]);

            return response()->json(['message' => 'Quote sent successfully']);
        } catch (\Exception $e) {
            Log::error('sendQuote failed: ' . $e->getMessage(), [
                'quote_number' => $data['quoteNumber'] ?? null,
                'items_count' => count($items),
            ]);

            return response()->json([
                'message' => 'Failed to send quote',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
