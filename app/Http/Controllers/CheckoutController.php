<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\UserAddress;
use App\Models\UserPaymentMethod;
use App\Models\User;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\DeliverySlotService;
use App\Services\DeliveryOptionService;
use App\Services\ShippoLabelService;
use App\Services\Stripe\StripeWalletService;
use App\Mail\OrderConfirmedMail;
use Stripe\Exception\CardException;
use Carbon\Carbon;
use App\Models\ReturnRequest;

class CheckoutController extends Controller
{
    private const RETURN_REASON_LABELS = [
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
        private readonly DeliverySlotService $deliverySlotService,
        private readonly DeliveryOptionService $deliveryOptionService,
        private readonly ShippoLabelService $shippoLabelService,
        private readonly StripeWalletService $walletService,
    )
    {
    }

    /**
     * Create a Stripe PaymentIntent
     */
    public function createPaymentIntent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'email' => 'required|email',
            'shipping.method' => 'nullable|string',
            'shipping.gift_packaging_cost' => 'nullable|numeric|min:0',
            'discount_code' => 'nullable|string',
            'payment_type' => 'nullable|string|in:CARD,KLARNA,PAYPAL,APPLE_PAY,GOOGLE_PAY',
            'selected_saved_payment_method_id' => 'nullable|integer|exists:user_payment_methods,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $data = $request->all();
            $items = $data['items'] ?? [];
            $paymentType = strtoupper((string) ($data['payment_type'] ?? 'CARD'));
            $authUser = auth()->user();
            $selectedSavedPaymentMethodId = data_get($data, 'selected_saved_payment_method_id');
            $selectedSavedPaymentMethod = null;

            if ($selectedSavedPaymentMethodId && $authUser) {
                $selectedSavedPaymentMethod = UserPaymentMethod::where('user_id', $authUser->id)
                    ->where('id', (int) $selectedSavedPaymentMethodId)
                    ->where('is_active', true)
                    ->first();

                if (!$selectedSavedPaymentMethod) {
                    return response()->json(['error' => 'Selected saved payment method not found.'], 403);
                }
            }
            if ($selectedSavedPaymentMethod && $paymentType === 'CARD' && ($selectedSavedPaymentMethod->provider_type ?? 'card') !== 'card') {
                return response()->json(['error' => 'Selected saved payment method is not a card.'], 403);
            }
            if ($selectedSavedPaymentMethod && in_array($paymentType, ['PAYPAL', 'KLARNA'], true)) {
                $expectedProvider = strtolower($paymentType);
                if (($selectedSavedPaymentMethod->provider_type ?? '') !== $expectedProvider) {
                    return response()->json(['error' => "Selected payment method is not a saved {$expectedProvider} method."], 403);
                }
            }
            $shippingMethod = (string) data_get($data, 'shipping.method', 'STANDARD');
            $deliveryType = str_starts_with($shippingMethod, 'TIMED:') ? 'TIMED' : strtoupper($shippingMethod);
            $providedShippingCents = data_get($data, 'shipping.cost');
            if (is_numeric($providedShippingCents)) {
                $shipping_cents = max(0, (int) round((float) $providedShippingCents));
            } else {
                $shippingPrice = $this->deliveryOptionService->resolvePrice($deliveryType, auth()->user());
                $shipping_cents = (int) round($shippingPrice * 100);
            }
            $gift_packaging_cents = max(0, (int) round((float) data_get($data, 'shipping.gift_packaging_cost', 0)));

            $subtotal_cents = 0;
            foreach ($items as $it) {
                $price = isset($it['unit_price_cents'])
                    ? intval($it['unit_price_cents'])
                    : intval(round(($it['unit_price'] ?? 0) * 100));
                $qty = intval($it['quantity'] ?? 1);
                $subtotal_cents += $price * $qty;
            }

            $discount_cents = 0;
            $discount_code = isset($data['discount_code']) ? strtoupper(trim((string) $data['discount_code'])) : null;

            if ($discount_code) {
                $coupon = Coupon::whereRaw('UPPER(code) = ?', [$discount_code])->where('active', 1)->first();
                if ($coupon) {
                    $couponType = strtolower((string) $coupon->type);
                    if ($couponType === 'percent') {
                        $discount_cents = intval(round($subtotal_cents * ($coupon->value / 100)));
                    } elseif ($couponType === 'shipping') {
                        $discount_cents = $shipping_cents;
                    } else {
                        $discount_cents = intval(round($coupon->value * 100));
                    }
                }
            }

            $subtotal_discount_cents = min($discount_cents, $subtotal_cents);
            $shipping_discount_cents = 0;
            if ($discount_cents > $subtotal_cents) {
                $shipping_discount_cents = min($discount_cents - $subtotal_cents, $shipping_cents);
            }

            $discounted_subtotal_cents = max($subtotal_cents - $subtotal_discount_cents, 0);
            $final_shipping_cents = max($shipping_cents - $shipping_discount_cents, 0);
            $discount_cents = $subtotal_discount_cents + $shipping_discount_cents;
            $vat_cents = intval(round($discounted_subtotal_cents * 0.2));
            $total_cents = $discounted_subtotal_cents + $vat_cents + $final_shipping_cents + $gift_packaging_cents;

            $paymentMethodTypes = match ($paymentType) {
                'KLARNA' => ['klarna'],
                'PAYPAL' => ['paypal'],
                // Apple Pay / Google Pay are wallet rails over card.
                'APPLE_PAY', 'GOOGLE_PAY', 'CARD' => ['card'],
                default => ['card'],
            };

            Stripe::setApiKey(env('STRIPE_SECRET'));

            $paymentIntentPayload = [
                'amount' => $total_cents,
                'currency' => 'gbp',
                'payment_method_types' => $paymentMethodTypes,
                'metadata' => [
                    'email' => $data['email'] ?? '',
                    'discount_code' => $discount_code ?? '',
                    'user_id' => optional(auth()->user())->id,
                    'payment_type' => $paymentType,
                ],
            ];

            if ($authUser && in_array($paymentType, ['CARD', 'PAYPAL', 'KLARNA'], true)) {
                $customerId = $this->walletService->ensureStripeCustomer($authUser);

                if ($selectedSavedPaymentMethod && !$customerId) {
                    return response()->json([
                        'error' => 'Saved payment methods are not available until checkout migrations are applied.',
                    ], 400);
                }

                if ($customerId) {
                    $paymentIntentPayload['customer'] = $customerId;

                    if ($selectedSavedPaymentMethod) {
                        $paymentIntentPayload['payment_method'] = $selectedSavedPaymentMethod->stripe_payment_method_id;
                        $paymentIntentPayload['confirm'] = true;
                        $paymentIntentPayload['off_session'] = true;
                    } else {
                        $paymentIntentPayload['setup_future_usage'] = 'off_session';
                    }
                }
            }

            try {
                $paymentIntent = PaymentIntent::create($paymentIntentPayload);
            } catch (CardException $e) {
                $errorIntent = $e->getError()?->payment_intent;
                $intentStatus = is_object($errorIntent) ? data_get($errorIntent, 'status') : null;
                $clientSecret = is_object($errorIntent) ? data_get($errorIntent, 'client_secret') : null;
                $intentId = is_object($errorIntent) ? data_get($errorIntent, 'id') : null;

                if ($intentStatus === 'requires_action' && $clientSecret && $intentId) {
                    return response()->json([
                        'requires_action' => true,
                        'client_secret' => $clientSecret,
                        'payment_intent_id' => $intentId,
                        'status' => $intentStatus,
                    ]);
                }

                throw $e;
            }

            return response()->json([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'status' => $paymentIntent->status,
                'subtotal' => $subtotal_cents / 100,
                'discount' => $discount_cents / 100,
                'vat' => $vat_cents / 100,
                'shipping' => $final_shipping_cents / 100,
                'gift_packaging' => $gift_packaging_cents / 100,
                'total' => $total_cents / 100,
            ]);
        } catch (\Throwable $e) {
            Log::error("[Checkout] PaymentIntent error", ['msg' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Store order after successful payment
     */
    public function storeOrder(Request $request)
    {
        Log::info('[storeOrder] Incoming request', ['request' => $request->all()]);

        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'items' => 'required|array|min:1',
            'totals.total' => 'required|numeric',
            'delivery.firstName' => 'required|string',
            'delivery.lastName' => 'required|string',
            'delivery.line1' => 'nullable|string',
            'delivery.city' => 'nullable|string',
            'delivery.postcode' => 'nullable|string',
            'delivery.country' => 'nullable|string',
            'payment_intent_id' => 'nullable|string',
            'discount_code' => 'nullable|string',
            'options.reservation_id' => 'nullable|integer|exists:reservations,id',
            'options.delivery_type' => 'nullable|string|in:STANDARD,NEXT_DAY,TIMED',
            'options.delivery_price' => 'nullable|numeric|min:0',
            'options.shipping_rate' => 'nullable|string|max:120',
            'options.gift_packaging' => 'nullable|boolean',
            'options.gift_packaging_cost' => 'nullable|numeric|min:0',
            'options.gift_message' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 400);
        }

        DB::beginTransaction();

        try {
            $data = $request->all();
            $deliveryType = strtoupper((string) data_get($data, 'options.delivery_type', 'STANDARD'));
            $deliveryPriceInput = data_get($data, 'options.delivery_price');
            $deliveryPrice = is_numeric($deliveryPriceInput)
                ? max(0, (float) $deliveryPriceInput)
                : $this->deliveryOptionService->resolvePrice($deliveryType, auth()->user());
            $resolvedShippingService = $this->deliveryOptionService->resolveSelectedServiceName(
                $deliveryType,
                auth()->user(),
                data_get($data, 'delivery.postcode'),
                data_get($data, 'delivery.country'),
                data_get($data, 'delivery.city'),
                data_get($data, 'delivery.line1'),
            );
            $requestedShippingRate = trim((string) data_get($data, 'options.shipping_rate', ''));
            $shippingRate = $resolvedShippingService ?: ($requestedShippingRate !== '' ? $requestedShippingRate : null);

            // Create order
            $order = Order::create([
                'user_id' => optional(auth()->user())->id,
                'order_number' => 'ORD-' . strtoupper(Str::random(8)),
                'email' => $data['email'],
                'subtotal' => $data['totals']['subtotal'] ?? 0,
                'discount_code' => $data['discount_code'] ?? null,
                'discount_amount' => $data['totals']['discount'] ?? 0,
                'vat' => $data['totals']['vat'] ?? 0,
                'shipping' => $data['totals']['shipping'] ?? 0,
                'total' => $data['totals']['total'] ?? 0,
                'payment_intent_id' => $data['payment_intent_id'] ?? null,
                'status' => 'paid',
                'first_name' => $data['delivery']['firstName'],
                'last_name' => $data['delivery']['lastName'],
                'phone' => $data['delivery']['phone'] ?? null,
                'address_line1' => $data['delivery']['line1'] ?? null,
                'address_line2' => $data['delivery']['line2'] ?? null,
                'city' => $data['delivery']['city'] ?? null,
                'postcode' => $data['delivery']['postcode'] ?? null,
                'country' => $data['delivery']['country'] ?? null,
                'delivery_type' => $deliveryType,
                'delivery_price' => $deliveryPrice,
                'shipping_rate' => $shippingRate,
                'gift_packaging' => (bool) data_get($data, 'options.gift_packaging', false),
                'gift_packaging_cost' => max(0, (float) data_get($data, 'options.gift_packaging_cost', 0)),
                'gift_message' => data_get($data, 'options.gift_message'),
            ]);

            if (!empty($data['options']['reservation_id'])) {
                $confirmedShippingRate = $deliveryType === 'TIMED'
                    ? null
                    : ($data['options']['shipping_rate'] ?? null);

                $this->deliverySlotService->confirmReservation(
                    (int) $data['options']['reservation_id'],
                    (int) $order->id,
                    $confirmedShippingRate,
                );
                $order->refresh();
            }

            if ($deliveryType === 'TIMED') {
                $labelData = $this->shippoLabelService->purchaseTimedLabelForOrder(
                    $order,
                    $order->shipping_rate
                );

                $order->fill($labelData);
                $order->save();
            }

            $authUser = auth()->user();
            if ($authUser) {
                $this->persistSavedAddressForUser($authUser, [
                    'first_name' => $data['delivery']['firstName'] ?? null,
                    'last_name' => $data['delivery']['lastName'] ?? null,
                    'phone' => $data['delivery']['phone'] ?? null,
                    'country' => $data['delivery']['country'] ?? null,
                    'address_line1' => $data['delivery']['line1'] ?? null,
                    'address_line2' => $data['delivery']['line2'] ?? null,
                    'city' => $data['delivery']['city'] ?? null,
                    'county' => $data['delivery']['county'] ?? null,
                    'postcode' => $data['delivery']['postcode'] ?? null,
                ]);

                $paymentType = strtoupper((string) data_get($data, 'options.payment_type', ''));
                if (in_array($paymentType, ['CARD', 'PAYPAL', 'KLARNA'], true)) {
                    $this->walletService->persistPaymentMethodFromIntent(
                        $authUser,
                        (string) ($data['payment_intent_id'] ?? ''),
                        strtolower($paymentType),
                        (string) data_get($data, 'options.cardholder_name', '')
                    );
                }
            }

            $supportsDesignPayload = Schema::hasColumn('order_items', 'design_payload');

            // Save items
            foreach ($data['items'] as $itemPayload) {
                $product = null;

                if (isset($itemPayload['id']) && is_numeric($itemPayload['id'])) {
                    $product = Product::find(intval($itemPayload['id']));
                }

                if (!$product && isset($itemPayload['id'])) {
                    $product = Product::where('slug', $itemPayload['id'])->first();
                }

                if (!$product && isset($itemPayload['slug'])) {
                    $product = Product::where('slug', $itemPayload['slug'])->first();
                }

                if (!$product && !empty($itemPayload['title'])) {
                    $product = Product::where('name', $itemPayload['title'])->first();
                }

                if (!$product) {
                    throw new \Exception("Product not found for: " . json_encode($itemPayload));
                }

                $filename = $this->normalizeOrderItemImageUrl(
                    $itemPayload['image'] ?? null,
                    $product
                );

                $unitPrice = floatval($itemPayload['unit_price'] ?? $itemPayload['price'] ?? $product->price ?? 0);
                $quantity = intval($itemPayload['quantity'] ?? 1);
                $lineTotal = isset($itemPayload['line_total']) && is_numeric($itemPayload['line_total'])
                    ? floatval($itemPayload['line_total'])
                    : $unitPrice * $quantity;
                $designPayload = [
                    'preview_snapshot' => data_get($itemPayload, 'preview_snapshot'),
                    'preview_by_view' => data_get($itemPayload, 'preview_by_view'),
                ];
                $hasDesignPayload = data_get($designPayload, 'preview_snapshot') || data_get($designPayload, 'preview_by_view');

                $orderItemData = [
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'size' => isset($itemPayload['size']) ? (string) $itemPayload['size'] : null,
                    'colour' => isset($itemPayload['colour']) ? (string) $itemPayload['colour'] : null,
                    'image_url' => $filename,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];

                if ($supportsDesignPayload) {
                    $orderItemData['design_payload'] = $hasDesignPayload ? $designPayload : null;
                }

                OrderItem::create($orderItemData);
            }

            /**
             * Generate invoice PDF & save it
             */
            try {
                $order->load('items.product');

                $pdf = Pdf::loadView('invoices.invoice', ['order' => $order]);

                $filePath = 'invoices/invoice_' . $order->order_number . '.pdf';

                Storage::disk('public')->put($filePath, $pdf->output());

                $order->invoice_path = $filePath;
                $order->save();
            } catch (\Throwable $pdfEx) {
                Log::warning("[storeOrder] invoice generation failed: " . $pdfEx->getMessage());
            }

            DB::commit();

            try {
                $order->loadMissing('items.product');
                Mail::to($order->email)->send(new OrderConfirmedMail($order));
            } catch (\Throwable $mailEx) {
                Log::warning('[storeOrder] order confirmation email failed', [
                    'order_number' => $order->order_number,
                    'email' => $order->email,
                    'error' => $mailEx->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'order_number' => $order->order_number,
                'invoice_url' => $order->invoice_path ? asset('storage/' . $order->invoice_path) : null,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('[storeOrder] Error storing order', [
                'msg' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Order confirmation page
     */
    public function orderConfirmed($orderNumber)
    {
        $order = Order::with('items.product')->where('order_number', $orderNumber)->first();

        if (!$order) {
            return Inertia::render('Errors/NotFound', ['message' => 'Order not found.']);
        }

        $items = $order->items->map(function ($item) {
            $prod = $item->product;

            $image = $item->image_url;

            if (!$image || !Str::startsWith($image, ['http://', 'https://'])) {
                $image = asset('images/' . ($image ?: 'placeholder.jpg'));
            }

            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'product_brand' => $prod->brand ?? null,
                'product_name' => $prod->name ?? $item->product_name,
                'size' => $item->size,
                'colour' => $item->colour,
                'image_url' => $image,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        })->toArray();

        $orderArr = $order->toArray();
        $orderArr['items'] = $items;
        $orderArr['invoice_url'] = $order->invoice_path ? asset('storage/' . $order->invoice_path) : null;
        $orderArr['tracking_url'] = $this->buildTrackingUrl($order->shippo_tracking_number);
        $orderArr['payment_type'] = 'CARD';

        if (!empty($order->payment_intent_id)) {
            try {
                Stripe::setApiKey(env('STRIPE_SECRET'));
                $paymentIntent = PaymentIntent::retrieve($order->payment_intent_id);
                $metadataType = strtoupper((string) data_get($paymentIntent, 'metadata.payment_type', ''));
                if (!empty($metadataType)) {
                    $orderArr['payment_type'] = $metadataType;
                }
            } catch (\Throwable $e) {
                Log::warning('[orderConfirmed] Unable to resolve payment intent metadata', [
                    'order_number' => $order->order_number,
                    'payment_intent_id' => $order->payment_intent_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return Inertia::render('OrderConfirmed', ['order' => $orderArr]);
    }

    /**
     * Show order details
     */
    public function showOrder(Request $request, $orderNumber)
    {
        $order = Order::with([
            'items.product',
            'items.review',
            'returnRequests' => fn ($query) => $query->latest('requested_at')->latest('created_at'),
        ])->where('order_number', $orderNumber)->first();

        if (!$order) {
            return Inertia::render('Errors/NotFound', ['message' => 'Order not found.']);
        }

        $viewer = $request->user();
        $canView = $viewer && ((int) $viewer->id === (int) $order->user_id || (bool) ($viewer->is_admin ?? false));
        if (!$canView) {
            abort(403, 'You are not authorized to view this order.');
        }

        $items = $this->mapOrderItemsForUser($order);

        $orderArr = $order->toArray();
        $orderArr['items'] = $items;
        $orderArr['invoice_url'] = $order->invoice_path ? asset('storage/' . $order->invoice_path) : null;
        $orderArr['tracking_url'] = $this->buildTrackingUrl($order->shippo_tracking_number);
        $orderArr['delivered_at'] = optional($order->delivered_at)?->toIso8601String();
        $orderArr['return_eligibility'] = $this->buildReturnEligibility($order);
        $orderArr['return_requests'] = $this->mapReturnRequestsForUser($order->returnRequests);

        return Inertia::render('Orders/OrderDetails', ['order' => $orderArr]);
    }

    /**
     * Latest order
     */
    public function latestOrder(Request $request)
    {
        $userId = optional(auth()->user())->id;

        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'User not logged in']);
        }

        $order = Order::with([
                'items.product',
                'items.review',
                'returnRequests' => fn ($query) => $query->latest('requested_at')->latest('created_at'),
            ])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found']);
        }

        $items = $this->mapOrderItemsForUser($order);

        $orderArr = $order->toArray();
        $orderArr['items'] = $items;
        $orderArr['invoice_url'] = $order->invoice_path ? asset('storage/' . $order->invoice_path) : null;
        $orderArr['tracking_url'] = $this->buildTrackingUrl($order->shippo_tracking_number);
        $orderArr['delivered_at'] = optional($order->delivered_at)?->toIso8601String();
        $orderArr['return_eligibility'] = $this->buildReturnEligibility($order);
        $orderArr['return_requests'] = $this->mapReturnRequestsForUser($order->returnRequests);

        return response()->json(['success' => true, 'order' => $orderArr]);
    }

    /**
     * User orders list
     */
    public function userOrders(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $orders = Order::with([
                'items.product',
                'items.review',
                'returnRequests' => fn ($query) => $query->latest('requested_at')->latest('created_at'),
            ])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $formatted = $orders->map(function ($order) {
            $items = $this->mapOrderItemsForUser($order);

            $orderArr = $order->toArray();
            $orderArr['items'] = $items;
            $orderArr['invoice_url'] = $order->invoice_path ? asset('storage/' . $order->invoice_path) : null;
            $orderArr['tracking_url'] = $this->buildTrackingUrl($order->shippo_tracking_number);
            $orderArr['delivered_at'] = optional($order->delivered_at)?->toIso8601String();
            $orderArr['return_eligibility'] = $this->buildReturnEligibility($order);
            $orderArr['return_requests'] = $this->mapReturnRequestsForUser($order->returnRequests);

            return $orderArr;
        });

        return response()->json(['success' => true, 'orders' => $formatted]);
    }

    private function persistSavedAddressForUser(User $user, array $delivery): void
    {
        $required = ['first_name', 'last_name', 'country', 'address_line1', 'city', 'postcode'];
        foreach ($required as $key) {
            if (empty($delivery[$key])) {
                return;
            }
        }

        $existing = UserAddress::where('user_id', $user->id)
            ->whereRaw('LOWER(first_name) = ?', [strtolower((string) $delivery['first_name'])])
            ->whereRaw('LOWER(last_name) = ?', [strtolower((string) $delivery['last_name'])])
            ->whereRaw('LOWER(address_line1) = ?', [strtolower((string) $delivery['address_line1'])])
            ->whereRaw('LOWER(city) = ?', [strtolower((string) $delivery['city'])])
            ->whereRaw('LOWER(postcode) = ?', [strtolower((string) $delivery['postcode'])])
            ->whereRaw('LOWER(country) = ?', [strtolower((string) $delivery['country'])])
            ->first();

        UserAddress::where('user_id', $user->id)->update(['is_default' => false]);

        if ($existing) {
            $existing->update([
                'phone' => $delivery['phone'] ?? null,
                'address_line2' => $delivery['address_line2'] ?? null,
                'county' => $delivery['county'] ?? null,
                'is_default' => true,
            ]);
            return;
        }

        UserAddress::create([
            'user_id' => $user->id,
            'label' => 'Checkout address',
            'first_name' => $delivery['first_name'],
            'last_name' => $delivery['last_name'],
            'phone' => $delivery['phone'] ?? null,
            'country' => $delivery['country'],
            'address_line1' => $delivery['address_line1'],
            'address_line2' => $delivery['address_line2'] ?? null,
            'city' => $delivery['city'],
            'county' => $delivery['county'] ?? null,
            'postcode' => $delivery['postcode'],
            'is_default' => true,
        ]);
    }

    private function mapOrderItemsForUser(Order $order): array
    {
        return $order->items->map(function ($item) {
            $prod = $item->product;
            $image = $item->image_url;
            $review = $item->review;

            if (!$image || !Str::startsWith($image, ['http://', 'https://'])) {
                $image = asset('images/' . ($image ?: 'placeholder.jpg'));
            }

            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'product_slug' => $prod->slug ?? null,
                'product_brand' => $prod->brand ?? null,
                'product_name' => $prod->name ?? $item->product_name,
                'size' => $item->size,
                'colour' => $item->colour,
                'image_url' => $image,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'review' => $review ? [
                    'id' => $review->id,
                    'rating' => (float) ($review->rating ?? 0),
                    'message' => (string) ($review->message ?? ''),
                    'created_at' => optional($review->created_at)->toIso8601String(),
                    'images_count' => (int) ($review->images_count ?? 0),
                ] : null,
            ];
        })->toArray();
    }

    private function buildTrackingUrl(?string $trackingNumber): ?string
    {
        $tracking = trim((string) $trackingNumber);
        if ($tracking === '') {
            return null;
        }

        return 'https://parcelsapp.com/en/tracking/' . urlencode($tracking);
    }

    private function buildReturnEligibility(Order $order): array
    {
        $deliveryDate = $this->resolveOrderDeliveryDate($order);
        if (!$deliveryDate) {
            return [
                'delivered' => false,
                'can_request' => false,
                'message' => 'Returns are available once this order has been delivered.',
                'delivery_date' => null,
                'eligibility_expires_at' => null,
                'days_left' => null,
            ];
        }

        $windowEnd = $deliveryDate->copy()->addDays(30)->endOfDay();
        $now = Carbon::now('Europe/London');
        $isWithinWindow = $now->lessThanOrEqualTo($windowEnd);
        $daysLeft = max(0, $now->startOfDay()->diffInDays($windowEnd->copy()->startOfDay(), false));

        return [
            'delivered' => true,
            'can_request' => $isWithinWindow,
            'message' => $isWithinWindow ? null : 'This order is outside of our 30-day return window.',
            'delivery_date' => $deliveryDate->toDateString(),
            'eligibility_expires_at' => $windowEnd->toDateString(),
            'days_left' => $isWithinWindow ? $daysLeft : 0,
        ];
    }

    private function resolveOrderDeliveryDate(Order $order): ?Carbon
    {
        if ($order->delivered_at) {
            return Carbon::parse($order->delivered_at, 'Europe/London');
        }

        $status = strtolower(trim((string) $order->status));
        if (str_contains($status, 'deliver')) {
            return Carbon::parse($order->updated_at ?: $order->created_at ?: now(), 'Europe/London');
        }

        return null;
    }

    private function mapReturnRequestsForUser($requests): array
    {
        return collect($requests)
            ->map(fn (ReturnRequest $request) => [
                'id' => $request->id,
                'status' => $request->status,
                'reason_code' => $request->reason_code,
                'reason_label' => self::RETURN_REASON_LABELS[$request->reason_code] ?? $request->reason_code,
                'requested_at' => optional($request->requested_at)->toIso8601String(),
                'reviewed_at' => optional($request->reviewed_at)->toIso8601String(),
                'approved_at' => optional($request->approved_at)->toIso8601String(),
                'rejected_at' => optional($request->rejected_at)->toIso8601String(),
                'more_info_requested_at' => optional($request->more_info_requested_at)->toIso8601String(),
                'received_at' => optional($request->received_at)->toIso8601String(),
                'customer_shipped_at' => optional($request->customer_shipped_at)->toIso8601String(),
                'refunded_at' => optional($request->refunded_at)->toIso8601String(),
                'exchange_offered_at' => optional($request->exchange_offered_at)->toIso8601String(),
                'admin_note' => $request->admin_note,
                'admin_override' => (bool) $request->admin_override,
                'shippo_label_url' => $request->shippo_label_url,
                'shippo_tracking_number' => $request->shippo_tracking_number,
                'return_shipping_service' => $request->return_shipping_service,
                'return_shipping_amount' => $request->return_shipping_amount,
                'return_shipping_currency' => $request->return_shipping_currency,
                'refund_amount' => $request->refund_amount,
                'stripe_refund_id' => $request->stripe_refund_id,
                'stripe_refund_currency' => $request->stripe_refund_currency,
                'stripe_payment_amount' => $request->stripe_payment_amount,
                'stripe_fee_amount' => $request->stripe_fee_amount,
                'stripe_net_amount' => $request->stripe_net_amount,
                'additional_info_submitted_at' => optional($request->additional_info_submitted_at)->toIso8601String(),
                'archived_at' => optional($request->archived_at)->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function normalizeOrderItemImageUrl(mixed $rawImage, Product $product): ?string
    {
        $fallback = $this->resolveProductFallbackImageUrl($product);

        if (!is_string($rawImage) || trim($rawImage) === '') {
            return $fallback;
        }

        $rawImage = trim($rawImage);

        if (Str::startsWith($rawImage, 'data:image/')) {
            return $this->storeDataUriImage($rawImage) ?? $fallback;
        }

        if (Str::startsWith($rawImage, ['http://', 'https://'])) {
            return $rawImage;
        }

        return url($rawImage);
    }

    private function resolveProductFallbackImageUrl(Product $product): ?string
    {
        $image = $product->images()->first();
        if (!$image) {
            return null;
        }

        return $image->url ?? (isset($image->path) ? asset($image->path) : null);
    }

    private function storeDataUriImage(string $dataUri): ?string
    {
        if (!preg_match('/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s', $dataUri, $matches)) {
            return null;
        }

        $extension = strtolower($matches[1]);
        $extension = $extension === 'jpeg' ? 'jpg' : $extension;

        if (!in_array($extension, ['jpg', 'png', 'webp', 'gif'], true)) {
            return null;
        }

        $binary = base64_decode($matches[2], true);
        if ($binary === false) {
            return null;
        }

        $relativePath = 'order-previews/' . (string) Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($relativePath, $binary);

        return asset('storage/' . $relativePath);
    }

    // Card / wallet persistence is handled by StripeWalletService.
}
