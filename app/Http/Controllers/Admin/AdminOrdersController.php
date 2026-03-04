<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\AdminActivityLogService;
use App\Services\AdminSummaryService;
use App\Services\ShippoLabelService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrdersController extends Controller
{
    private const STATUS_OPTIONS = [
        ['value' => 'paid', 'label' => 'Order placed'],
        ['value' => 'in_production', 'label' => 'In production'],
        ['value' => 'packed', 'label' => 'Packed'],
        ['value' => 'dispatched', 'label' => 'Dispatched'],
        ['value' => 'delivered', 'label' => 'Delivered'],
        ['value' => 'cancelled', 'label' => 'Cancelled'],
    ];

    public function __construct(
        private readonly AdminSummaryService $adminSummaryService,
        private readonly AdminActivityLogService $activityLogService,
        private readonly ShippoLabelService $shippoLabelService,
    ) {
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Orders', [
            'summary' => $this->adminSummaryService->getSummary(),
        ]);
    }

    public function data(): JsonResponse
    {
        $orders = Order::query()
            ->with(['user:id,name,username,email,avatar'])
            ->withCount('items')
            ->latest('created_at')
            ->get()
            ->map(fn (Order $order) => $this->mapOrderSummary($order))
            ->values();

        return response()->json([
            'orders' => $orders,
            'new_orders_count' => $this->countNewOrders($orders),
            'status_options' => self::STATUS_OPTIONS,
            'summary' => $this->adminSummaryService->getSummary(),
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load([
            'user:id,name,username,email,avatar',
            'items.product.images',
        ]);

        return response()->json([
            'order' => $this->mapOrderDetail($order),
        ]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $allowedStatuses = array_values(array_unique([
            ...collect(self::STATUS_OPTIONS)->pluck('value')->all(),
            'processing',
            'out_for_delivery',
            'order_placed',
        ]));

        $validated = $request->validate([
            'status' => ['required', 'string', 'max:80', 'in:' . implode(',', $allowedStatuses)],
            'tracking_number' => ['nullable', 'string', 'max:120'],
        ]);

        $nextStatus = strtolower(trim((string) $validated['status']));
        $trackingNumber = trim((string) ($validated['tracking_number'] ?? ''));

        if (
            $nextStatus === 'dispatched'
            && $trackingNumber === ''
            && trim((string) ($order->shippo_tracking_number ?? '')) === ''
        ) {
            return response()->json([
                'message' => 'Tracking number is required before dispatching this order.',
            ], 422);
        }

        if ($nextStatus === 'dispatched' && strtoupper((string) $order->delivery_type) === 'TIMED') {
            $requiredShipDate = $order->calculated_ship_date ?: $order->selected_delivery_date;
            if ($requiredShipDate) {
                $today = Carbon::now('Europe/London')->toDateString();
                $shipDate = Carbon::parse($requiredShipDate, 'Europe/London')->toDateString();

                if ($today < $shipDate) {
                    return response()->json([
                        'message' => "This timed delivery cannot be dispatched before {$shipDate}.",
                    ], 422);
                }
            }
        }

        $before = $order->only(['status', 'shippo_tracking_number', 'delivered_at']);
        $updateData = ['status' => $nextStatus];

        if ($trackingNumber !== '') {
            $updateData['shippo_tracking_number'] = $trackingNumber;
        }

        if ($nextStatus === 'delivered' && !$order->delivered_at) {
            $updateData['delivered_at'] = now();
        }

        $order->update($updateData);

        $changes = $this->activityLogService->extractChanges(
            $before,
            $order->only(['status', 'shippo_tracking_number', 'delivered_at']),
            [
                'status' => 'Order status',
                'shippo_tracking_number' => 'Tracking number',
                'delivered_at' => 'Delivered at',
            ]
        );

        $this->activityLogService->logFromRequest(
            $request,
            'order_status_updated',
            'Order status updated',
            "Updated order #{$order->order_number}. " . $this->activityLogService->summarizeChanges($changes),
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($order, "Order #{$order->order_number}"),
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'changes' => $changes,
                ],
            ]
        );

        $order->load([
            'user:id,name,username,email,avatar',
            'items.product.images',
        ]);

        return response()->json([
            'success' => true,
            'order' => $this->mapOrderDetail($order),
        ]);
    }

    public function archive(Request $request, Order $order): JsonResponse
    {
        $status = strtolower(trim((string) $order->status));
        if (!str_contains($status, 'deliver')) {
            return response()->json([
                'message' => 'Only delivered orders can be archived.',
            ], 422);
        }

        if ($order->archived_at) {
            return response()->json([
                'success' => true,
                'archived_at' => optional($order->archived_at)->toIso8601String(),
            ]);
        }

        $order->archived_at = now();
        $order->save();

        $this->activityLogService->logFromRequest(
            $request,
            'order_archived',
            'Order archived',
            "Archived order #{$order->order_number}",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($order, "Order #{$order->order_number}"),
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'archived_at' => optional($order->archived_at)->toIso8601String(),
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'archived_at' => optional($order->archived_at)->toIso8601String(),
        ]);
    }

    public function messageCustomer(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'subject' => ['nullable', 'string', 'max:180'],
        ]);

        $message = trim((string) $validated['message']);
        $subject = trim((string) ($validated['subject'] ?? ''));
        $subject = $subject !== '' ? $subject : "Update about your order #{$order->order_number}";
        $adminName = $request->user()?->name ?: $request->user()?->username ?: 'BearLane Support';

        $sentToInbox = false;
        $sentEmail = false;

        if ($order->user_id) {
            $chat = Chat::query()->firstOrCreate(
                ['user_id' => $order->user_id, 'title' => 'Admin Notices'],
                ['is_closed' => false, 'admin_joined' => true]
            );

            if ($chat->is_closed) {
                $chat->update([
                    'is_closed' => false,
                    'deleted_by' => null,
                ]);
            }

            Message::query()->create([
                'chat_id' => $chat->id,
                'user_id' => $request->user()?->id,
                'sender_type' => 'admin',
                'content' => "[Order #{$order->order_number}] {$message}",
            ]);

            $sentToInbox = true;
        }

        if ($order->email) {
            try {
                Mail::send('emails.admin-message', [
                    'heading' => $subject,
                    'type' => 'message',
                    'userName' => trim(($order->first_name ?: '') . ' ' . ($order->last_name ?: '')) ?: 'there',
                    'messageBody' => $message,
                    'logoUrl' => asset('images/BLText.png'),
                ], function ($mail) use ($order, $subject) {
                    $mail->to($order->email)->subject($subject);
                });
                $sentEmail = true;
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $this->activityLogService->logFromRequest(
            $request,
            'order_customer_message_sent',
            'Order customer message sent',
            "Sent clarification request for order #{$order->order_number}",
            [
                'icon' => 'mail',
                ...$this->activityLogService->modelContext($order, "Order #{$order->order_number}"),
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'admin_name' => $adminName,
                    'sent_to_inbox' => $sentToInbox,
                    'sent_email' => $sentEmail,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'sent_to_inbox' => $sentToInbox,
            'sent_email' => $sentEmail,
        ]);
    }

    public function generateLabel(Request $request, Order $order): JsonResponse
    {
        if ($order->shippo_label_url) {
            return response()->json([
                'success' => true,
                'order' => $this->mapOrderDetail($order->load(['user:id,name,username,email,avatar', 'items.product.images'])),
            ]);
        }

        if (!$order->calculated_ship_date) {
            $order->calculated_ship_date = $order->selected_delivery_date ?: now('Europe/London')->addDay()->toDateString();
            $order->save();
        }

        try {
            $before = $order->only([
                'shippo_transaction_id',
                'shippo_label_url',
                'shippo_tracking_number',
                'shippo_selected_rate_id',
                'shippo_selected_service',
            ]);

            $labelData = $this->shippoLabelService->purchaseLabelForOrder(
                $order,
                $order->shipping_rate
            );
            $order->fill($labelData);
            $order->save();

            $changes = $this->activityLogService->extractChanges(
                $before,
                $order->only([
                    'shippo_transaction_id',
                    'shippo_label_url',
                    'shippo_tracking_number',
                    'shippo_selected_rate_id',
                    'shippo_selected_service',
                ]),
                [
                    'shippo_transaction_id' => 'Shippo transaction',
                    'shippo_label_url' => 'Label URL',
                    'shippo_tracking_number' => 'Tracking number',
                    'shippo_selected_rate_id' => 'Shippo rate',
                    'shippo_selected_service' => 'Shippo service',
                ]
            );

            $this->activityLogService->logFromRequest(
                $request,
                'order_delivery_label_generated',
                'Order delivery label generated',
                "Generated label for order #{$order->order_number}. " . $this->activityLogService->summarizeChanges($changes),
                [
                    'icon' => 'package',
                    ...$this->activityLogService->modelContext($order, "Order #{$order->order_number}"),
                    'metadata' => [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'changes' => $changes,
                    ],
                ]
            );

            return response()->json([
                'success' => true,
                'order' => $this->mapOrderDetail($order->load(['user:id,name,username,email,avatar', 'items.product.images'])),
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'Unable to generate label right now.',
            ], 422);
        }
    }

    private function mapOrderSummary(Order $order): array
    {
        $customerName = trim((string) (($order->first_name ?: '') . ' ' . ($order->last_name ?: '')));
        if ($customerName === '') {
            $customerName = $order->user?->name ?: $order->user?->username ?: 'Guest';
        }

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'total' => (float) ($order->total ?? 0),
            'created_at' => optional($order->created_at)?->toIso8601String(),
            'customer_name' => $customerName,
            'customer_email' => $order->email ?: $order->user?->email,
            'user' => $order->user ? [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'username' => $order->user->username,
                'email' => $order->user->email,
                'avatar' => $order->user->avatar_url,
            ] : null,
            'items_count' => isset($order->items_count) ? (int) $order->items_count : (int) $order->items()->count(),
            'shippo_label_url' => $order->shippo_label_url,
            'shippo_tracking_number' => $order->shippo_tracking_number,
            'tracking_url' => $this->buildTrackingUrl($order),
            'is_new' => $this->isNewOrderStatus($order->status),
            'archived_at' => optional($order->archived_at)->toIso8601String(),
        ];
    }

    private function mapOrderDetail(Order $order): array
    {
        $summary = $this->mapOrderSummary($order);

        return [
            ...$summary,
            'subtotal' => (float) ($order->subtotal ?? 0),
            'discount_amount' => (float) ($order->discount_amount ?? 0),
            'vat' => (float) ($order->vat ?? 0),
            'shipping' => (float) ($order->shipping ?? 0),
            'payment_intent_id' => $order->payment_intent_id,
            'delivery_type' => $order->delivery_type,
            'delivery_price' => $order->delivery_price,
            'shipping_rate' => $order->shipping_rate,
            'gift_packaging' => (bool) $order->gift_packaging,
            'gift_packaging_cost' => (float) ($order->gift_packaging_cost ?? 0),
            'gift_message' => $order->gift_message,
            'delivered_at' => optional($order->delivered_at)?->toIso8601String(),
            'selected_delivery_date' => optional($order->selected_delivery_date)?->toDateString(),
            'calculated_ship_date' => optional($order->calculated_ship_date)?->toDateString(),
            'shippo_selected_service' => $order->shippo_selected_service,
            'shippo_selected_rate_id' => $order->shippo_selected_rate_id,
            'tracking_url' => $this->buildTrackingUrl($order),
            'invoice_url' => $order->invoice_path ? asset('storage/' . $order->invoice_path) : null,
            'first_name' => $order->first_name,
            'last_name' => $order->last_name,
            'email' => $order->email,
            'phone' => $order->phone,
            'address_line1' => $order->address_line1,
            'address_line2' => $order->address_line2,
            'city' => $order->city,
            'postcode' => $order->postcode,
            'country' => $order->country,
            'items' => $order->items->map(fn (OrderItem $item) => $this->mapOrderItem($item))->values(),
        ];
    }

    private function mapOrderItem(OrderItem $item): array
    {
        $payload = is_array($item->design_payload) ? $item->design_payload : [];
        $previewSnapshot = data_get($payload, 'preview_snapshot');
        $previewByView = data_get($payload, 'preview_by_view');
        $length = is_numeric($item->product?->length) ? (float) $item->product?->length : null;
        $width = is_numeric($item->product?->width) ? (float) $item->product?->width : null;
        $height = is_numeric($item->product?->height) ? (float) $item->product?->height : null;
        $parcelSize = $this->inferParcelSize($length, $width, $height);

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'product_name' => $item->product_name,
            'size' => $item->size,
            'colour' => $item->colour,
            'parcel_size_key' => $parcelSize['key'] ?? null,
            'parcel_size_label' => $parcelSize['label'] ?? null,
            'parcel_size_instructions' => $parcelSize['description'] ?? null,
            'product_length' => $length,
            'product_width' => $width,
            'product_height' => $height,
            'image_url' => $item->image_url,
            'quantity' => (int) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'line_total' => (float) $item->line_total,
            'product_images' => $item->product?->images?->map(fn ($image) => $image->url)->filter()->values() ?? [],
            'preview_snapshot' => is_array($previewSnapshot) ? $previewSnapshot : null,
            'preview_by_view' => is_array($previewByView) ? $previewByView : [],
            'layer_assets' => $this->extractLayerAssets(collect([
                ...(is_array($previewSnapshot) ? [$previewSnapshot] : []),
                ...($this->normalizeSnapshots($previewByView)),
            ])),
            'design_payload' => $payload ?: null,
        ];
    }

    private function normalizeSnapshots(mixed $previewByView): array
    {
        if (!is_array($previewByView)) {
            return [];
        }

        return collect($previewByView)
            ->filter(fn ($value) => is_array($value))
            ->values()
            ->all();
    }

    private function extractLayerAssets(Collection $snapshots): array
    {
        $assets = [];

        foreach ($snapshots as $snapshot) {
            if (!is_array($snapshot)) {
                continue;
            }

            $layers = $snapshot['layers'] ?? null;
            if (!is_array($layers)) {
                continue;
            }

            foreach ($layers as $layer) {
                if (!is_array($layer)) {
                    continue;
                }
                $url = $layer['url'] ?? null;
                if (!is_string($url) || trim($url) === '') {
                    continue;
                }

                $assets[] = [
                    'uid' => (string) ($layer['uid'] ?? ''),
                    'type' => (string) ($layer['type'] ?? 'image'),
                    'url' => trim($url),
                    'position' => $layer['position'] ?? null,
                    'size' => $layer['size'] ?? null,
                    'rotation' => $layer['rotation'] ?? 0,
                ];
            }
        }

        return collect($assets)
            ->unique(fn (array $asset) => ($asset['uid'] ?: $asset['url']) . '|' . $asset['url'])
            ->values()
            ->all();
    }

    private function isNewOrderStatus(?string $status): bool
    {
        $normalized = strtolower(trim((string) $status));
        if ($normalized === '') {
            return true;
        }

        if (
            str_contains($normalized, 'deliver')
            || str_contains($normalized, 'dispatch')
            || str_contains($normalized, 'cancel')
            || str_contains($normalized, 'refund')
        ) {
            return false;
        }

        return
            str_contains($normalized, 'paid')
            || str_contains($normalized, 'pending')
            || str_contains($normalized, 'process')
            || str_contains($normalized, 'new')
            || str_contains($normalized, 'order placed')
            || str_contains($normalized, 'order_placed')
            || str_contains($normalized, 'production')
            || str_contains($normalized, 'packed');
    }

    private function buildTrackingUrl(Order $order): ?string
    {
        $tracking = trim((string) ($order->shippo_tracking_number ?? ''));
        if ($tracking === '') {
            return null;
        }

        return 'https://parcelsapp.com/en/tracking/' . urlencode($tracking);
    }

    private function inferParcelSize(?float $length, ?float $width, ?float $height): ?array
    {
        if ($length === null || $width === null || $height === null) {
            return null;
        }

        $l = max($length, $width, $height);
        $w = max(min($length, $width), min(max($length, $width), $height));
        $d = min($length, $width, $height);

        $presets = [
            'very_small' => [
                'label' => 'Very Small',
                'l' => 35.0,
                'w' => 23.0,
                'd' => 3.0,
                'description' => 'Fits through a letterbox. Great for t-shirts, thin clothing, documents.',
            ],
            'small' => [
                'label' => 'Small',
                'l' => 45.0,
                'w' => 35.0,
                'd' => 16.0,
                'description' => 'Good for shoes, hoodies, small boxed items.',
            ],
            'medium' => [
                'label' => 'Medium',
                'l' => 61.0,
                'w' => 46.0,
                'd' => 46.0,
                'description' => 'Good for multiple clothing items and bulkier goods.',
            ],
            'large' => [
                'label' => 'Large',
                'l' => 120.0,
                'w' => 60.0,
                'd' => 60.0,
                'description' => 'Good for large multi-item orders.',
            ],
        ];

        foreach ($presets as $key => $preset) {
            if ($l <= $preset['l'] && $w <= $preset['w'] && $d <= $preset['d']) {
                return [
                    'key' => $key,
                    'label' => $preset['label'],
                    'description' => $preset['description'],
                ];
            }
        }

        return [
            'key' => 'large',
            'label' => 'Large',
            'description' => $presets['large']['description'],
        ];
    }

    private function countNewOrders(Collection $orders): int
    {
        return $orders->filter(fn (array $order) => !($order['archived_at'] ?? null) && (bool) ($order['is_new'] ?? false))->count();
    }
}
