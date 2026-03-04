<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnRequest;
use App\Services\OpenAiModerationService;
use App\Services\ShippoRateService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrderReturnController extends Controller
{
    private const REASONS = [
        'item_arrived_damaged' => 'product_condition',
        'item_faulty_defective' => 'product_condition',
        'incorrect_item_received' => 'product_condition',
        'missing_parts_incomplete' => 'product_condition',
        'wrong_size_received' => 'order_fulfilment',
        'wrong_variant_received' => 'order_fulfilment',
        'ordered_multiple_by_mistake' => 'order_fulfilment',
        'other' => 'other',
    ];

    public function __construct(
        private readonly ShippoRateService $shippoRateService,
    ) {
    }

    public function shippingOptions(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'You are not authorised to access return shipping options for this order.'], 403);
        }

        $deliveryDate = $this->resolveDeliveryDate($order);
        if (!$deliveryDate) {
            return response()->json(['message' => 'Return shipping options are only available once the order is delivered.'], 422);
        }

        $fromAddress = [
            'name' => trim(((string) ($order->first_name ?? '')) . ' ' . ((string) ($order->last_name ?? ''))) ?: 'Customer',
            'street1' => (string) ($order->address_line1 ?? 'Address pending'),
            'street2' => (string) ($order->address_line2 ?? ''),
            'city' => (string) ($order->city ?? 'London'),
            'zip' => (string) ($order->postcode ?? ''),
            'country' => strtoupper((string) ($order->country ?: 'GB')),
            'phone' => (string) ($order->phone ?? ''),
            'email' => (string) ($order->email ?? $user->email ?? ''),
        ];

        if (trim((string) $fromAddress['zip']) === '') {
            return response()->json(['message' => 'A valid postcode is required before showing return shipping options.'], 422);
        }

        $toAddress = [
            'name' => 'Bear Lane',
            'street1' => '390 Springfield Road',
            'city' => 'Chelmsford',
            'zip' => 'CM2 6AT',
            'country' => 'GB',
        ];

        $parcel = [
            'length' => '30',
            'width' => '25',
            'height' => '5',
            'distance_unit' => 'cm',
            'weight' => '1.2',
            'mass_unit' => 'kg',
        ];

        try {
            $rates = $this->shippoRateService->getRates($fromAddress, $toAddress, $parcel);
            $mapped = collect($rates)
                ->map(function (array $rate) {
                    $provider = trim((string) ($rate['provider'] ?? ''));
                    $serviceLevel = trim((string) data_get($rate, 'servicelevel.name', ''));
                    $serviceName = trim($provider . ' ' . $serviceLevel);
                    $amount = is_numeric($rate['amount'] ?? null) ? (float) $rate['amount'] : null;

                    return [
                        'object_id' => (string) ($rate['object_id'] ?? ''),
                        'service_name' => $serviceName !== '' ? $serviceName : 'Standard Service',
                        'provider' => $provider !== '' ? $provider : null,
                        'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                        'amount' => $amount,
                        'currency' => strtoupper((string) ($rate['currency'] ?? 'GBP')),
                    ];
                })
                ->filter(fn (array $rate) => $rate['object_id'] !== '' && $rate['amount'] !== null)
                ->sortBy(fn (array $rate) => (float) $rate['amount'])
                ->values();

            if ($mapped->isEmpty()) {
                return response()->json([
                    'rates' => [],
                    'cheapest_rate_id' => null,
                    'return_address' => $toAddress,
                ]);
            }

            return response()->json([
                'rates' => $mapped->all(),
                'cheapest_rate_id' => $mapped->first()['object_id'],
                'return_address' => $toAddress,
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'Unable to load return shipping options right now.',
            ], 422);
        }
    }

    public function store(Request $request, Order $order, OpenAiModerationService $moderationService): JsonResponse
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'You are not authorised to return this order.'], 403);
        }

        $deliveryDate = $this->resolveDeliveryDate($order);
        if (!$deliveryDate) {
            return response()->json(['message' => 'Returns are only available after the order is delivered.'], 422);
        }

        $windowEnd = $deliveryDate->copy()->addDays(30)->endOfDay();
        if (Carbon::now('Europe/London')->greaterThan($windowEnd)) {
            return response()->json(['message' => 'This order is outside of our 30-day return window.'], 422);
        }

        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'integer'],
            'item_quantities' => ['nullable', 'array'],
            'item_quantities.*' => ['nullable', 'integer', 'min:1'],
            'reason_code' => ['required', 'string', Rule::in(array_keys(self::REASONS))],
            'reason_text' => ['nullable', 'string', 'max:2000'],
            'proofs' => ['required', 'array', 'min:1', 'max:6'],
            'proofs.*' => ['required', 'file', 'image', 'max:10240'],
            'selected_rate_object_id' => ['nullable', 'string', 'max:120'],
            'selected_rate_service' => ['nullable', 'string', 'max:180'],
            'selected_rate_amount' => ['nullable', 'numeric', 'min:0'],
            'selected_rate_currency' => ['nullable', 'string', 'max:12'],
        ]);

        if ($validated['reason_code'] === 'other' && trim((string) ($validated['reason_text'] ?? '')) === '') {
            return response()->json(['message' => 'Please provide details for "Other" return reason.'], 422);
        }

        $selectedItems = $order->items()
            ->whereIn('id', $validated['item_ids'])
            ->get();

        if ($selectedItems->isEmpty()) {
            return response()->json(['message' => 'Please select at least one valid order item to return.'], 422);
        }

        $proofFiles = collect($request->file('proofs', []))
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->values();

        $proofPaths = [];
        foreach ($proofFiles as $index => $proofFile) {
            $moderationError = $this->moderateUpload($moderationService, $proofFile, [
                'endpoint' => '/orders/{order}/returns',
                'order_id' => $order->id,
                'user_id' => $user->id,
                'image_index' => $index,
                'ip' => $request->ip(),
            ]);
            if ($moderationError !== null) {
                return $moderationError;
            }

            $proofPaths[] = $proofFile->store("returns/{$order->order_number}", 'public');
        }

        $itemQuantities = collect((array) ($validated['item_quantities'] ?? []))
            ->mapWithKeys(fn ($qty, $key) => [(int) $key => (int) $qty]);

        $requestRecord = ReturnRequest::create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'selected_items' => $selectedItems->map(function ($item) use ($itemQuantities) {
                $selectedQuantity = max(1, min((int) $item->quantity, (int) ($itemQuantities->get((int) $item->id, (int) $item->quantity))));
                $unitLine = (float) $item->line_total / max(1, (int) $item->quantity);

                return [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'size' => $item->size,
                    'colour' => $item->colour,
                    'quantity' => $selectedQuantity,
                    'line_total' => round($unitLine * $selectedQuantity, 2),
                    'image_url' => $item->image_url,
                ];
            })->values()->all(),
            'reason_code' => $validated['reason_code'],
            'reason_category' => self::REASONS[$validated['reason_code']],
            'reason_text' => trim((string) ($validated['reason_text'] ?? '')) ?: null,
            'proof_paths' => $proofPaths,
            'status' => 'pending',
            'requested_at' => now(),
            'delivery_date' => $deliveryDate->toDateString(),
            'eligibility_expires_at' => $deliveryDate->copy()->addDays(30)->toDateString(),
            'is_within_window' => true,
            'return_shipping_rate_id' => trim((string) ($validated['selected_rate_object_id'] ?? '')) ?: null,
            'return_shipping_service' => trim((string) ($validated['selected_rate_service'] ?? '')) ?: null,
            'return_shipping_amount' => isset($validated['selected_rate_amount']) ? (float) $validated['selected_rate_amount'] : null,
            'return_shipping_currency' => isset($validated['selected_rate_amount'])
                ? strtoupper((string) ($validated['selected_rate_currency'] ?? 'GBP'))
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Return request submitted successfully.',
            'return_request' => [
                'id' => $requestRecord->id,
                'status' => $requestRecord->status,
                'requested_at' => optional($requestRecord->requested_at)->toIso8601String(),
                'reason_code' => $requestRecord->reason_code,
            ],
        ]);
    }

    public function markSent(Request $request, Order $order, ReturnRequest $returnRequest): JsonResponse
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id || (int) $returnRequest->order_id !== (int) $order->id) {
            return response()->json(['message' => 'You are not authorised to update this return request.'], 403);
        }

        if (!in_array((string) $returnRequest->status, ['approved', 'in_transit'], true)) {
            return response()->json([
                'message' => 'This return can be marked as sent only after approval.',
            ], 422);
        }

        $returnRequest->status = 'in_transit';
        $returnRequest->customer_shipped_at = now();
        $returnRequest->save();

        return response()->json([
            'success' => true,
            'return_request' => [
                'id' => $returnRequest->id,
                'status' => $returnRequest->status,
                'customer_shipped_at' => optional($returnRequest->customer_shipped_at)->toIso8601String(),
            ],
        ]);
    }

    public function submitMoreEvidence(Request $request, Order $order, ReturnRequest $returnRequest, OpenAiModerationService $moderationService): JsonResponse
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id || (int) $returnRequest->order_id !== (int) $order->id) {
            return response()->json(['message' => 'You are not authorised to update this return request.'], 403);
        }

        if ((string) $returnRequest->status !== 'more_info_requested') {
            return response()->json([
                'message' => 'Additional evidence can only be submitted when more information is requested.',
            ], 422);
        }

        $validated = $request->validate([
            'proofs' => ['required', 'array', 'min:1', 'max:6'],
            'proofs.*' => ['required', 'file', 'image', 'max:10240'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $proofFiles = collect($request->file('proofs', []))
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->values();

        $proofPaths = (array) ($returnRequest->proof_paths ?? []);
        foreach ($proofFiles as $index => $proofFile) {
            $moderationError = $this->moderateUpload($moderationService, $proofFile, [
                'endpoint' => '/orders/{order}/returns/{returnRequest}/more-evidence',
                'order_id' => $order->id,
                'return_request_id' => $returnRequest->id,
                'user_id' => $user->id,
                'image_index' => $index,
                'ip' => $request->ip(),
            ]);
            if ($moderationError !== null) {
                return $moderationError;
            }

            $proofPaths[] = $proofFile->store("returns/{$order->order_number}", 'public');
        }

        $message = trim((string) ($validated['message'] ?? ''));
        if ($message !== '') {
            $existingReason = trim((string) ($returnRequest->reason_text ?? ''));
            $returnRequest->reason_text = $existingReason === ''
                ? $message
                : $existingReason . "\n\n[Additional evidence note " . now('Europe/London')->format('d/m/Y H:i') . "]\n" . $message;
        }

        $returnRequest->proof_paths = $proofPaths;
        $returnRequest->status = 'pending';
        $returnRequest->additional_info_submitted_at = now();
        $returnRequest->reviewed_at = null;
        $returnRequest->save();

        return response()->json([
            'success' => true,
            'return_request' => [
                'id' => $returnRequest->id,
                'status' => $returnRequest->status,
                'requested_at' => optional($returnRequest->requested_at)->toIso8601String(),
            ],
        ]);
    }

    public function refundStatement(Request $request, Order $order, ReturnRequest $returnRequest)
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id || (int) $returnRequest->order_id !== (int) $order->id) {
            abort(403, 'You are not authorised to access this refund statement.');
        }

        if ((string) $returnRequest->status !== 'refunded' || !$returnRequest->stripe_refund_id) {
            $pendingContent = implode("\n", [
                'Bear Lane Refund Statement',
                "Date: " . now('Europe/London')->format('d M Y H:i'),
                "Order number: " . (string) ($order->order_number ?? 'N/A'),
                "Return request: #" . $returnRequest->id,
                "Current status: " . strtoupper((string) ($returnRequest->status ?? 'pending')),
                '',
                'Refund statement is not available yet because refund has not been completed.',
                'Once a refund is issued, this page will include the Stripe reference and full payment breakdown.',
                '',
            ]);

            $pendingFileName = 'refund-statement-pending-' . Str::slug((string) ($order->order_number ?: ('return-' . $returnRequest->id))) . '.txt';

            return response($pendingContent, 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$pendingFileName}\"",
            ]);
        }

        $currency = strtoupper((string) ($returnRequest->stripe_refund_currency ?: 'GBP'));
        $content = implode("\n", [
            'Bear Lane Refund Statement',
            "Date: " . now('Europe/London')->format('d M Y H:i'),
            "Order number: " . (string) ($order->order_number ?? 'N/A'),
            "Return request: #" . $returnRequest->id,
            "Stripe reference: " . (string) $returnRequest->stripe_refund_id,
            '',
            "Payment amount: " . $this->formatMoney($returnRequest->stripe_payment_amount, $currency),
            "Fees: - " . $this->formatMoney($returnRequest->stripe_fee_amount, $currency),
            "Refunded amount: - " . $this->formatMoney($returnRequest->refund_amount, $currency),
            "Net amount: " . $this->formatMoney($returnRequest->stripe_net_amount, $currency),
            '',
            'It may take a few business days for this refund to appear on your account.',
            '',
        ]);

        $fileName = 'refund-statement-' . Str::slug((string) ($order->order_number ?: ('return-' . $returnRequest->id))) . '.txt';

        return response($content, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }

    private function resolveDeliveryDate(Order $order): ?Carbon
    {
        if ($order->delivered_at) {
            return Carbon::parse($order->delivered_at, 'Europe/London');
        }

        $status = strtolower(trim((string) $order->status));
        if (str_contains($status, 'deliver') && $order->updated_at) {
            return Carbon::parse($order->updated_at, 'Europe/London');
        }

        return null;
    }

    private function formatMoney(float|int|null $value, string $currency = 'GBP'): string
    {
        $amount = (float) ($value ?? 0);
        return number_format($amount, 2) . ' ' . strtoupper($currency);
    }

    private function moderateUpload(OpenAiModerationService $moderationService, UploadedFile $file, array $context): ?JsonResponse
    {
        $imageDataUrl = $this->uploadedImageToDataUrl($file);
        if (!$imageDataUrl) {
            return response()->json([
                'message' => 'One uploaded image could not be processed. Please try another file.',
            ], 422);
        }

        try {
            $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'Order return evidence upload');
        } catch (\Throwable $exception) {
            Log::error('Return evidence moderation failed', [
                'error' => $exception->getMessage(),
                ...$context,
            ]);

            return response()->json([
                'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage('[return-evidence-upload-blocked]', $moderation, $context);

            return response()->json([
                'message' => "An uploaded image was blocked by content checks ({$reason}). Please upload a different image.",
                'warning' => true,
            ], 422);
        }

        return null;
    }

    private function uploadedImageToDataUrl(UploadedFile $file): ?string
    {
        $binary = @file_get_contents($file->getRealPath());
        if ($binary === false) {
            return null;
        }

        $mime = strtolower(trim((string) ($file->getMimeType() ?: 'image/jpeg')));
        if (!str_starts_with($mime, 'image/')) {
            return null;
        }

        return 'data:' . $mime . ';base64,' . base64_encode($binary);
    }
}
