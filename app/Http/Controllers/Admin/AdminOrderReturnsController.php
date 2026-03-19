<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Models\ReturnRequest;
use App\Services\Stripe\StripeConfiguration;
use App\Services\AdminNotificationService;
use App\Services\AdminActivityLogService;
use App\Services\ShippoLabelService;
use App\Services\ShippoRateService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Stripe;

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
        private readonly ShippoRateService $shippoRateService,
        private readonly AdminActivityLogService $activityLogService,
        private readonly AdminNotificationService $adminNotificationService,
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

    public function shippingOptions(ReturnRequest $returnRequest): JsonResponse
    {
        $returnRequest->loadMissing(['order.user']);

        $order = $returnRequest->order;
        if (!$order) {
            return response()->json(['message' => 'Order could not be found for this return request.'], 404);
        }

        $fromAddress = [
            'name' => trim(((string) ($order->first_name ?? '')) . ' ' . ((string) ($order->last_name ?? ''))) ?: 'Customer',
            'street1' => (string) ($order->address_line1 ?? 'Address pending'),
            'street2' => (string) ($order->address_line2 ?? ''),
            'city' => (string) ($order->city ?? 'London'),
            'zip' => (string) ($order->postcode ?? ''),
            'country' => strtoupper((string) ($order->country ?: 'GB')),
            'phone' => (string) ($order->phone ?? ''),
            'email' => (string) ($order->email ?? $order->user?->email ?? ''),
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

            return response()->json([
                'rates' => $mapped->all(),
                'selected_rate_id' => $returnRequest->return_shipping_rate_id ?: ($mapped->first()['object_id'] ?? null),
                'return_address' => $toAddress,
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'Unable to load return shipping options right now.',
            ], 422);
        }
    }

    public function updateStatus(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,request_more_info,issue_refund,mark_received,override,exchange_products,message_user,archive'],
            'note' => ['nullable', 'string', 'max:4000'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'return_tracking_number' => ['nullable', 'string', 'max:120'],
        ]);

        $returnRequest->loadMissing(['order.user']);

        $action = $validated['action'];
        $note = trim((string) ($validated['note'] ?? ''));
        $trackingNumber = trim((string) ($validated['return_tracking_number'] ?? ''));
        $now = now();

        if ($trackingNumber !== '') {
            $returnRequest->shippo_tracking_number = $trackingNumber;
        }

        if (in_array($action, ['reject', 'message_user'], true) && $note === '') {
            return response()->json([
                'message' => $action === 'reject'
                    ? 'A decline note is required when rejecting a return.'
                    : 'Please add a message before sending an update to the customer.',
            ], 422);
        }

        if ($action === 'issue_refund' && (string) $returnRequest->status === 'refunded') {
            return response()->json([
                'message' => 'This return has already been refunded.',
            ], 422);
        }

        $hasTrackingNumber = trim((string) ($returnRequest->shippo_tracking_number ?? '')) !== '';
        $trackingDelivered = $this->trackingShowsDelivered($returnRequest);

        if ($action === 'mark_received' && !$hasTrackingNumber && !$trackingDelivered) {
            return response()->json([
                'message' => 'Enter the customer return tracking number (or wait for delivered tracking) before confirming arrival.',
            ], 422);
        }

        if (in_array($action, ['issue_refund', 'exchange_products'], true)
            && !$this->canCompleteFinalAction($returnRequest, $trackingDelivered)
        ) {
            return response()->json([
                'message' => 'Confirm the returned item has arrived (or wait until tracking shows delivered) before taking this action.',
            ], 422);
        }

        if (in_array($action, ['issue_refund', 'exchange_products'], true)
            && $returnRequest->status !== 'received'
            && $trackingDelivered
        ) {
            $returnRequest->status = 'received';
            $returnRequest->received_at = $now;
        }

        if ($note !== '') {
            $returnRequest->admin_note = $note;
        }

        $customerSubject = null;
        $customerMessage = null;
        $profileUrl = url('/profile');

        if ($action === 'archive') {
            if (!in_array((string) $returnRequest->status, ['refunded', 'rejected', 'exchange_offered'], true)) {
                return response()->json([
                    'message' => 'Only completed returns can be archived.',
                ], 422);
            }

            $returnRequest->archived_at = now();
        } elseif ($action === 'override') {
            $returnRequest->admin_override = true;
        } elseif ($action === 'approve') {
            $returnRequest->status = 'approved';
            $returnRequest->reviewed_at = $now;
            $returnRequest->approved_at = $now;
            $customerSubject = "Return approved for order #{$returnRequest->order?->order_number}";
            $customerMessage = "Your return request #{$returnRequest->id} has been approved. We'll generate your return label next and send it through as soon as it is ready.";
        } elseif ($action === 'reject') {
            $returnRequest->status = 'rejected';
            $returnRequest->reviewed_at = $now;
            $returnRequest->rejected_at = $now;
            $customerSubject = "Return declined for order #{$returnRequest->order?->order_number}";
            $customerMessage = "Your return request #{$returnRequest->id} was declined.\n\nReason: {$note}";
        } elseif ($action === 'request_more_info') {
            $returnRequest->status = 'more_info_requested';
            $returnRequest->reviewed_at = $now;
            $returnRequest->more_info_requested_at = $now;
            $customerSubject = "More information needed for return #{$returnRequest->id}";
            $customerMessage = $note !== ''
                ? "We need more information to continue with your return request.\n\n{$note}\n\nUpload extra evidence from your return card here: {$profileUrl}"
                : "We need more information to continue with your return request. Upload extra evidence from your return card here: {$profileUrl}";
        } elseif ($action === 'mark_received') {
            $returnRequest->status = 'received';
            $returnRequest->received_at = $now;
            $customerSubject = "Return received for order #{$returnRequest->order?->order_number}";
            $customerMessage = "We have received your returned parcel and will now finalise your return outcome.";
        } elseif ($action === 'issue_refund') {
            if (!isset($validated['refund_amount']) || (float) $validated['refund_amount'] <= 0) {
                return response()->json([
                    'message' => 'Enter a valid refund amount before issuing a refund.',
                ], 422);
            }

            try {
                $stripeRefund = $this->createStripeRefund($returnRequest, (float) $validated['refund_amount']);
                $existingNote = trim((string) ($returnRequest->admin_note ?? ''));
                $referenceLine = "Stripe refund reference: {$stripeRefund['id']}";
                if ($existingNote === '') {
                    $returnRequest->admin_note = $referenceLine;
                } elseif (!str_contains($existingNote, $referenceLine)) {
                    $returnRequest->admin_note = $existingNote . "\n" . $referenceLine;
                }
                $returnRequest->stripe_refund_id = $stripeRefund['id'];
                $returnRequest->stripe_refund_currency = $stripeRefund['currency'];
                $returnRequest->stripe_payment_amount = $stripeRefund['payment_amount'];
                $returnRequest->stripe_fee_amount = $stripeRefund['fees'];
                $returnRequest->stripe_net_amount = $stripeRefund['net'];
            } catch (\Throwable $exception) {
                return response()->json([
                    'message' => $exception->getMessage() ?: 'Stripe refund failed. Please try again.',
                ], 422);
            }

            $returnRequest->status = 'refunded';
            $returnRequest->refunded_at = $now;
            if (isset($validated['refund_amount'])) {
                $returnRequest->refund_amount = (float) $validated['refund_amount'];
            }
            $refundAmount = isset($validated['refund_amount'])
                ? number_format((float) $validated['refund_amount'], 2)
                : null;
            $customerSubject = "Refund issued for order #{$returnRequest->order?->order_number}";
            $currency = strtoupper((string) ($returnRequest->stripe_refund_currency ?: 'GBP'));
            $customerMessage = "Your return has been completed and a refund has been issued.\n\n"
                . "Payment amount: {$this->formatMoney($returnRequest->stripe_payment_amount, $currency)}\n"
                . "Fees: - {$this->formatMoney($returnRequest->stripe_fee_amount, $currency)}\n"
                . "Refunded amount: - {$this->formatMoney((float) ($validated['refund_amount'] ?? 0), $currency)}\n"
                . "Net amount: {$this->formatMoney($returnRequest->stripe_net_amount, $currency)}\n"
                . "Stripe reference: {$returnRequest->stripe_refund_id}\n\n"
                . "It may take a few business days for the refund to appear in your bank account depending on your card issuer.";
        } elseif ($action === 'exchange_products') {
            $returnRequest->status = 'exchange_offered';
            $returnRequest->exchange_offered_at = $now;
            $returnRequest->reviewed_at = $now;
            $customerSubject = "Exchange arranged for order #{$returnRequest->order?->order_number}";
            $customerMessage = $note !== ''
                ? "Your return has been approved for an exchange.\n\n{$note}"
                : 'Your return has been approved for an exchange. Our team will contact you with next steps.';
        } elseif ($action === 'message_user') {
            $customerSubject = "Update on return #{$returnRequest->id} for order #{$returnRequest->order?->order_number}";
            $customerMessage = $note;
        }

        $returnRequest->save();
        $returnRequest->load(['order.user:id,name,username,email,avatar']);

        if ($customerSubject && $customerMessage) {
            $this->notifyCustomer($request, $returnRequest, $customerSubject, $customerMessage);
        }

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

        $orderNumber = (string) ($returnRequest->order?->order_number ?: $returnRequest->order_id);
        $this->adminNotificationService->sendAdminEventEmail(
            'return_status_changed',
            "Return Status Updated #{$returnRequest->id}",
            'Return request status changed',
            "Return request: #{$returnRequest->id}\nOrder: #{$orderNumber}\nAction: {$action}\nCurrent status: {$returnRequest->status}",
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'return_request' => $this->mapDetail($returnRequest),
        ]);
    }

    private function createStripeRefund(ReturnRequest $returnRequest, float $refundAmount): array
    {
        $order = $returnRequest->order;
        if (!$order) {
            throw new \RuntimeException('Order not found for this return request.');
        }

        $paymentIntentId = trim((string) ($order->payment_intent_id ?? ''));
        if ($paymentIntentId === '') {
            throw new \RuntimeException('This order has no Stripe payment intent, so refund cannot be issued automatically.');
        }

        $amountPence = (int) round($refundAmount * 100);
        if ($amountPence < 1) {
            throw new \RuntimeException('Refund amount must be greater than £0.00.');
        }

        StripeConfiguration::configure();

        $paymentIntent = PaymentIntent::retrieve([
            'id' => $paymentIntentId,
            'expand' => ['latest_charge.balance_transaction'],
        ]);
        $paymentAmountPence = (int) ($paymentIntent->amount_received ?: $paymentIntent->amount ?: 0);
        $charge = $paymentIntent->latest_charge;
        $feePence = 0;
        if ($charge && isset($charge->balance_transaction) && is_object($charge->balance_transaction)) {
            $feePence = (int) ($charge->balance_transaction->fee ?? 0);
        }
        $currency = strtoupper((string) ($paymentIntent->currency ?? 'GBP'));

        $refund = Refund::create([
            'payment_intent' => $paymentIntentId,
            'amount' => $amountPence,
            'reason' => 'requested_by_customer',
            'metadata' => [
                'return_request_id' => (string) $returnRequest->id,
                'order_id' => (string) $order->id,
                'order_number' => (string) ($order->order_number ?? ''),
            ],
        ]);

        return [
            'id' => (string) ($refund->id ?? ''),
            'amount' => (int) ($refund->amount ?? $amountPence),
            'currency' => $currency,
            'payment_amount' => round($paymentAmountPence / 100, 2),
            'fees' => round($feePence / 100, 2),
            'net' => round(($paymentAmountPence - $feePence - $amountPence) / 100, 2),
        ];
    }

    public function downloadRefundStatement(ReturnRequest $returnRequest)
    {
        $returnRequest->loadMissing(['order']);

        if ((string) $returnRequest->status !== 'refunded' || !$returnRequest->stripe_refund_id) {
            $pendingContent = implode("\n", [
                'Bear Lane Refund Statement',
                "Date: " . now('Europe/London')->format('d M Y H:i'),
                "Order number: " . (string) ($returnRequest->order?->order_number ?? 'N/A'),
                "Return request: #" . $returnRequest->id,
                "Current status: " . strtoupper((string) ($returnRequest->status ?? 'pending')),
                '',
                'Refund statement is not available yet because refund has not been completed.',
                '',
            ]);

            $pendingFileName = 'refund-statement-pending-' . Str::slug((string) ($returnRequest->order?->order_number ?? ('return-' . $returnRequest->id))) . '.txt';

            return response($pendingContent, 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$pendingFileName}\"",
            ]);
        }

        $currency = strtoupper((string) ($returnRequest->stripe_refund_currency ?: 'GBP'));
        $content = implode("\n", [
            'Bear Lane Refund Statement',
            "Date: " . now('Europe/London')->format('d M Y H:i'),
            "Order number: " . (string) ($returnRequest->order?->order_number ?? 'N/A'),
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

        $fileName = 'refund-statement-' . Str::slug((string) ($returnRequest->order?->order_number ?? ('return-' . $returnRequest->id))) . '.txt';

        return response($content, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }

    public function generateLabel(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $validated = $request->validate([
            'selected_rate_object_id' => ['nullable', 'string', 'max:120'],
            'selected_rate_service' => ['nullable', 'string', 'max:180'],
            'selected_rate_amount' => ['nullable', 'numeric', 'min:0'],
            'selected_rate_currency' => ['nullable', 'string', 'max:12'],
        ]);

        $returnRequest->loadMissing(['order.user']);

        if (!in_array((string) $returnRequest->status, ['approved', 'in_transit', 'received', 'refunded', 'exchange_offered'], true)) {
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

        $selectedRateObjectId = trim((string) ($validated['selected_rate_object_id'] ?? ''));

        if ($selectedRateObjectId !== '') {
            $returnRequest->return_shipping_rate_id = $selectedRateObjectId;
            $returnRequest->return_shipping_service = trim((string) ($validated['selected_rate_service'] ?? $returnRequest->return_shipping_service)) ?: null;
            if (isset($validated['selected_rate_amount'])) {
                $returnRequest->return_shipping_amount = (float) $validated['selected_rate_amount'];
                $returnRequest->return_shipping_currency = strtoupper((string) ($validated['selected_rate_currency'] ?? 'GBP'));
            }
        }

        try {
            $labelData = null;

            if (trim((string) ($returnRequest->return_shipping_rate_id ?? '')) !== '') {
                $transaction = $this->shippoRateService->createTransaction((string) $returnRequest->return_shipping_rate_id);
                $status = (string) ($transaction['status'] ?? '');

                if (!in_array($status, ['SUCCESS', 'QUEUED'], true)) {
                    $messages = $transaction['messages'] ?? [];
                    $firstMessage = is_array($messages) && isset($messages[0]['text'])
                        ? (string) $messages[0]['text']
                        : null;
                    throw new \RuntimeException($firstMessage ?: 'Shippo return label generation failed.');
                }

                $labelData = [
                    'shippo_transaction_id' => $transaction['object_id'] ?? null,
                    'shippo_label_url' => $transaction['label_url'] ?? null,
                    'shippo_tracking_number' => $transaction['tracking_number'] ?? null,
                ];
            } else {
                $labelData = $this->shippoLabelService->purchaseReturnLabelForOrder(
                    $returnRequest->order,
                    $returnRequest->return_shipping_service ?: null
                );

                $returnRequest->return_shipping_rate_id = $labelData['shippo_selected_rate_id'] ?? $returnRequest->return_shipping_rate_id;
                $returnRequest->return_shipping_service = $labelData['shippo_selected_service'] ?? $returnRequest->return_shipping_service;
            }

            $returnRequest->fill([
                'shippo_transaction_id' => $labelData['shippo_transaction_id'] ?? null,
                'shippo_label_url' => $labelData['shippo_label_url'] ?? null,
                'shippo_tracking_number' => $labelData['shippo_tracking_number'] ?? null,
            ]);
            $returnRequest->save();
            $returnRequest->refresh()->load(['order.user:id,name,username,email,avatar']);

            $labelUrl = (string) ($returnRequest->shippo_label_url ?? '');
            $trackingNumber = (string) ($returnRequest->shippo_tracking_number ?? '');
            $this->notifyCustomer(
                $request,
                $returnRequest,
                "Return label ready for order #{$returnRequest->order?->order_number}",
                "Your return label is ready.\n\nDownload label: {$labelUrl}\nTracking number: {$trackingNumber}\n\nPlease attach the label to your package and drop it off with the selected courier."
            );

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

    private function canCompleteFinalAction(ReturnRequest $returnRequest, bool $trackingDelivered): bool
    {
        if ((string) $returnRequest->status === 'received') {
            return true;
        }

        return $trackingDelivered;
    }

    private function trackingShowsDelivered(ReturnRequest $returnRequest): bool
    {
        $transactionId = trim((string) ($returnRequest->shippo_transaction_id ?? ''));
        if ($transactionId === '') {
            return false;
        }

        try {
            $transaction = $this->shippoRateService->getTransaction($transactionId);
            $trackingStatus = strtolower(trim((string) (
                data_get($transaction, 'tracking_status.status')
                ?: data_get($transaction, 'tracking_status.object_state')
                ?: ''
            )));

            return $trackingStatus !== '' && str_contains($trackingStatus, 'deliver');
        } catch (\Throwable) {
            return false;
        }
    }

    private function notifyCustomer(Request $request, ReturnRequest $returnRequest, string $subject, string $message): void
    {
        $order = $returnRequest->order;
        $user = $order?->user;

        if ($user) {
            $chat = Chat::query()->firstOrCreate(
                ['user_id' => $user->id, 'title' => 'Admin Notices'],
                ['is_closed' => false, 'admin_joined' => true]
            );

            if ($chat->is_closed) {
                $chat->update(['is_closed' => false, 'deleted_by' => null]);
            }

            Message::query()->create([
                'chat_id' => $chat->id,
                'user_id' => $request->user()?->id,
                'sender_type' => 'admin',
                'content' => "[Return #{$returnRequest->id}] {$message}",
            ]);
        }

        $email = trim((string) ($order?->email ?: $user?->email ?: ''));
        if ($email === '') {
            return;
        }

        try {
            Mail::send('emails.admin-message', [
                'heading' => $subject,
                'type' => 'message',
                'userName' => trim((string) (($order?->first_name ?: '') . ' ' . ($order?->last_name ?: ''))) ?: ($user?->name ?: 'there'),
                'messageBody' => $message,
                'logoUrl' => asset('images/BLText.png'),
            ], function ($mail) use ($email, $subject) {
                $mail->to($email)->subject($subject);
            });
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function mapSummary(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        $selectedItemsValue = collect((array) $returnRequest->selected_items)
            ->sum(fn ($item) => (float) data_get($item, 'line_total', 0));
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
            'selected_items_value' => $selectedItemsValue,
            'additional_info_submitted_at' => optional($returnRequest->additional_info_submitted_at)->toIso8601String(),
            'return_shipping_service' => $returnRequest->return_shipping_service,
            'return_shipping_amount' => $returnRequest->return_shipping_amount,
            'return_shipping_currency' => $returnRequest->return_shipping_currency,
            'stripe_refund_id' => $returnRequest->stripe_refund_id,
            'stripe_refund_currency' => $returnRequest->stripe_refund_currency,
            'stripe_payment_amount' => $returnRequest->stripe_payment_amount,
            'stripe_fee_amount' => $returnRequest->stripe_fee_amount,
            'stripe_net_amount' => $returnRequest->stripe_net_amount,
            'archived_at' => optional($returnRequest->archived_at)->toIso8601String(),
            'customer_shipped_at' => optional($returnRequest->customer_shipped_at)->toIso8601String(),
            'exchange_offered_at' => optional($returnRequest->exchange_offered_at)->toIso8601String(),
        ];
    }

    private function mapDetail(ReturnRequest $returnRequest): array
    {
        $order = $returnRequest->order;
        $summary = $this->mapSummary($returnRequest);
        $proofUrls = collect((array) $returnRequest->proof_paths)
            ->map(function ($path, $index) use ($returnRequest) {
                $value = trim((string) $path);
                if ($value === '') return null;
                if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) return $value;
                return URL::temporarySignedRoute(
                    'media.returns.proof',
                    now()->addMinutes(20),
                    [
                        'returnRequest' => $returnRequest->id,
                        'index' => (int) $index,
                    ]
                );
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
            'stripe_refund_id' => $returnRequest->stripe_refund_id,
            'stripe_refund_currency' => $returnRequest->stripe_refund_currency,
            'stripe_payment_amount' => $returnRequest->stripe_payment_amount,
            'stripe_fee_amount' => $returnRequest->stripe_fee_amount,
            'stripe_net_amount' => $returnRequest->stripe_net_amount,
            'additional_info_submitted_at' => optional($returnRequest->additional_info_submitted_at)->toIso8601String(),
            'archived_at' => optional($returnRequest->archived_at)->toIso8601String(),
            'customer_shipped_at' => optional($returnRequest->customer_shipped_at)->toIso8601String(),
            'received_at' => optional($returnRequest->received_at)->toIso8601String(),
            'refunded_at' => optional($returnRequest->refunded_at)->toIso8601String(),
            'exchange_offered_at' => optional($returnRequest->exchange_offered_at)->toIso8601String(),
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

    private function formatMoney(float|int|null $value, string $currency = 'GBP'): string
    {
        $amount = (float) ($value ?? 0);
        return number_format($amount, 2) . ' ' . strtoupper($currency);
    }
}
