<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReturnRequest;
use App\Services\AdminActivityLogService;
use App\Services\ShippoLabelService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderReturnsController extends Controller
{
    private const REASON_LABELS = [
        'item_arrived_damaged' => 'Item arrived damaged',
        'item_faulty_defective' => 'Item is faulty / defective',
        'incorrect_item_received' => 'Incorrect item received',
        'missing_parts_incomplete' => 'Missing parts / incomplete',
        'wrong_size_received' => 'Wrong size received',
        'wrong_variant_received' => 'Wrong variant received',
        'ordered_multiple_by_mistake' => 'Ordered multiple by mistake',
        'other' => 'Other',
    ];

    public function __construct(
        private readonly ShippoLabelService $shippoLabelService,
        private readonly AdminActivityLogService $activityLogService,
    ) {
    }

    public function data(): JsonResponse
    {
        $requests = ReturnRequest::query()
            ->with(['order.user:id,name,username,email,avatar'])
            ->latest('requested_at')
            ->latest('created_at')
            ->get();

        $mapped = $requests->map(fn (ReturnRequest $returnRequest) => $this->mapSummary($returnRequest))->values();

        return response()->json([
            'return_requests' => $mapped,
            'pending_count' => $mapped->where('status', 'pending')->count(),
        ]);
    }

    public function show(ReturnRequest $returnRequest): JsonResponse
    {
        $returnRequest->load(['order.user:id,name,username,email,avatar']);

        return response()->json([
            'return_request' => $this->mapDetail($returnRequest),
        ]);
    }

    public function updateStatus(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,request_more_info,issue_refund,mark_received,override'],
            'note' => ['nullable', 'string', 'max:4000'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'return_tracking_number' => ['nullable', 'string', 'max:120'],
        ]);

        $action = $validated['action'];
        $note = trim((string) ($validated['note'] ?? ''));
        $trackingNumber = trim((string) ($validated['return_tracking_number'] ?? ''));
        $now = now();

        if ($trackingNumber !== '') {
            $returnRequest->shippo_tracking_number = $trackingNumber;
        }

        $hasTrackingNumber = trim((string) ($returnRequest->shippo_tracking_number ?? '')) !== '';

        if ($action === 'mark_received' && !$hasTrackingNumber) {
            return response()->json([
                'message' => 'Enter the customer return tracking number before confirming arrival.',
            ], 422);
        }

        if (in_array($action, ['request_more_info', 'issue_refund', 'reject'], true) && $returnRequest->status !== 'received') {
            return response()->json([
                'message' => 'Confirm the returned item has arrived before taking this action.',
            ], 422);
        }

        if ($note !== '') {
            $returnRequest->admin_note = $note;
        }

        if ($action === 'override') {
            $returnRequest->admin_override = true;
        } elseif ($action === 'approve') {
            $returnRequest->status = 'approved';
            $returnRequest->reviewed_at = $now;
            $returnRequest->approved_at = $now;
        } elseif ($action === 'reject') {
            $returnRequest->status = 'rejected';
            $returnRequest->reviewed_at = $now;
            $returnRequest->rejected_at = $now;
        } elseif ($action === 'request_more_info') {
            $returnRequest->status = 'more_info_requested';
            $returnRequest->reviewed_at = $now;
            $returnRequest->more_info_requested_at = $now;
        } elseif ($action === 'mark_received') {
            $returnRequest->status = 'received';
            $returnRequest->received_at = $now;
        } elseif ($action === 'issue_refund') {
            $returnRequest->status = 'refunded';
            $returnRequest->refunded_at = $now;
            if (isset($validated['refund_amount'])) {
                $returnRequest->refund_amount = (float) $validated['refund_amount'];
            }
        }

        $returnRequest->save();
        $returnRequest->load(['order.user:id,name,username,email,avatar']);

        $this->activityLogService->logFromRequest(
            $request,
            'order_return_updated',
            'Order return updated',
            "Updated return request #{$returnRequest->id} for order #{$returnRequest->order?->order_number}",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($returnRequest->order, "Order #{$returnRequest->order?->order_number}"),
                'metadata' => [
                    'return_request_id' => $returnRequest->id,
                    'order_id' => $returnRequest->order_id,
                    'action' => $action,
                    'status' => $returnRequest->status,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'return_request' => $this->mapDetail($returnRequest),
        ]);
    }

    public function generateLabel(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $returnRequest->loadMissing(['order.user']);

        if (!in_array((string) $returnRequest->status, ['approved', 'received', 'refunded'], true)) {
            return response()->json([
                'message' => 'Approve this return request before generating a return label.',
            ], 422);
        }

        if ($returnRequest->shippo_label_url) {
            return response()->json([
                'success' => true,
                'return_request' => $this->mapDetail($returnRequest),
            ]);
        }

        try {
            $labelData = $this->shippoLabelService->purchaseReturnLabelForOrder(
                $returnRequest->order,
                $returnRequest->order?->shipping_rate
            );

            $returnRequest->fill([
                'shippo_transaction_id' => $labelData['shippo_transaction_id'] ?? null,
                'shippo_label_url' => $labelData['shippo_label_url'] ?? null,
                'shippo_tracking_number' => $labelData['shippo_tracking_number'] ?? null,
            ]);
            $returnRequest->save();
            $returnRequest->refresh()->load(['order.user:id,name,username,email,avatar']);

            return response()->json([
                'success' => true,
                'return_request' => $this->mapDetail($returnRequest),
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'Unable to generate return label right now.',
            ], 422);
        }
    }

    private function mapSummary(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        $deliveryDate = $returnRequest->delivery_date ? Carbon::parse($returnRequest->delivery_date, 'Europe/London') : null;
        $expiryDate = $returnRequest->eligibility_expires_at
            ? Carbon::parse($returnRequest->eligibility_expires_at, 'Europe/London')
            : ($deliveryDate ? $deliveryDate->copy()->addDays(30) : null);
        $daysLeft = $expiryDate ? Carbon::now('Europe/London')->startOfDay()->diffInDays($expiryDate->startOfDay(), false) : null;

        return [
            'id' => $returnRequest->id,
            'order_id' => $returnRequest->order_id,
            'order_number' => $order?->order_number,
            'status' => $returnRequest->status,
            'requested_at' => optional($returnRequest->requested_at)->toIso8601String(),
            'customer_name' => trim((string) (($order?->first_name ?: '') . ' ' . ($order?->last_name ?: ''))) ?: ($order?->user?->name ?: 'Guest'),
            'customer_email' => $order?->email ?: $order?->user?->email,
            'reason_code' => $returnRequest->reason_code,
            'reason_label' => self::REASON_LABELS[$returnRequest->reason_code] ?? $returnRequest->reason_code,
            'reason_category' => $returnRequest->reason_category,
            'delivery_date' => optional($returnRequest->delivery_date)->toDateString(),
            'eligibility_expires_at' => optional($returnRequest->eligibility_expires_at)->toDateString(),
            'days_left' => $daysLeft,
            'is_within_window' => (bool) $returnRequest->is_within_window,
            'admin_override' => (bool) $returnRequest->admin_override,
            'selected_items_count' => count((array) $returnRequest->selected_items),
            'return_shipping_service' => $returnRequest->return_shipping_service,
            'return_shipping_amount' => $returnRequest->return_shipping_amount,
            'return_shipping_currency' => $returnRequest->return_shipping_currency,
        ];
    }

    private function mapDetail(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        $summary = $this->mapSummary($returnRequest);
        $proofUrls = collect((array) $returnRequest->proof_paths)
            ->map(function ($path) {
                $value = trim((string) $path);
                if ($value === '') return null;
                if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) return $value;
                return asset('storage/' . ltrim($value, '/'));
            })
            ->filter()
            ->values()
            ->all();

        $history = ReturnRequest::query()
            ->where('order_id', $returnRequest->order_id)
            ->where('id', '!=', $returnRequest->id)
            ->latest('requested_at')
            ->get()
            ->map(fn (ReturnRequest $request) => [
                'id' => $request->id,
                'status' => $request->status,
                'requested_at' => optional($request->requested_at)->toIso8601String(),
                'reason_label' => self::REASON_LABELS[$request->reason_code] ?? $request->reason_code,
            ])
            ->values()
            ->all();

        return [
            ...$summary,
            'reason_text' => $returnRequest->reason_text,
            'admin_note' => $returnRequest->admin_note,
            'proof_urls' => $proofUrls,
            'selected_items' => array_values((array) $returnRequest->selected_items),
            'refund_amount' => $returnRequest->refund_amount,
            'shippo_label_url' => $returnRequest->shippo_label_url,
            'shippo_tracking_number' => $returnRequest->shippo_tracking_number,
            'return_shipping_rate_id' => $returnRequest->return_shipping_rate_id,
            'return_shipping_service' => $returnRequest->return_shipping_service,
            'return_shipping_amount' => $returnRequest->return_shipping_amount,
            'return_shipping_currency' => $returnRequest->return_shipping_currency,
            'order' => [
                'id' => $order?->id,
                'order_number' => $order?->order_number,
                'status' => $order?->status,
                'created_at' => optional($order?->created_at)->toIso8601String(),
                'total' => (float) ($order?->total ?? 0),
                'shipping' => (float) ($order?->shipping ?? 0),
                'first_name' => $order?->first_name,
                'last_name' => $order?->last_name,
                'email' => $order?->email ?: $order?->user?->email,
                'phone' => $order?->phone,
                'address_line1' => $order?->address_line1,
                'address_line2' => $order?->address_line2,
                'city' => $order?->city,
                'postcode' => $order?->postcode,
                'country' => $order?->country,
            ],
            'history' => $history,
        ];
    }
}
