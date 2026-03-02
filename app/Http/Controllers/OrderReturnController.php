<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnRequest;
use App\Services\ShippoRateService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function store(Request $request, Order $order): JsonResponse
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
            'reason_code' => ['required', 'string', Rule::in(array_keys(self::REASONS))],
            'reason_text' => ['nullable', 'string', 'max:2000'],
            'proofs' => ['required', 'array', 'min:1', 'max:6'],
            'proofs.*' => ['required', 'file', 'image', 'max:10240'],
            'selected_rate_object_id' => ['required', 'string', 'max:120'],
            'selected_rate_service' => ['required', 'string', 'max:180'],
            'selected_rate_amount' => ['required', 'numeric', 'min:0'],
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

        $proofPaths = [];
        foreach ($request->file('proofs', []) as $proofFile) {
            $proofPaths[] = $proofFile->store("returns/{$order->order_number}", 'public');
        }

        $requestRecord = ReturnRequest::create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'selected_items' => $selectedItems->map(fn ($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'size' => $item->size,
                'colour' => $item->colour,
                'quantity' => (int) $item->quantity,
                'line_total' => (float) $item->line_total,
                'image_url' => $item->image_url,
            ])->values()->all(),
            'reason_code' => $validated['reason_code'],
            'reason_category' => self::REASONS[$validated['reason_code']],
            'reason_text' => trim((string) ($validated['reason_text'] ?? '')) ?: null,
            'proof_paths' => $proofPaths,
            'status' => 'pending',
            'requested_at' => now(),
            'delivery_date' => $deliveryDate->toDateString(),
            'eligibility_expires_at' => $deliveryDate->copy()->addDays(30)->toDateString(),
            'is_within_window' => true,
            'return_shipping_rate_id' => trim((string) $validated['selected_rate_object_id']),
            'return_shipping_service' => trim((string) $validated['selected_rate_service']),
            'return_shipping_amount' => (float) $validated['selected_rate_amount'],
            'return_shipping_currency' => strtoupper((string) ($validated['selected_rate_currency'] ?? 'GBP')),
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
}
