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
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\DeliverySlotService;
use App\Services\DeliveryOptionService;
use App\Services\ShippoLabelService;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly DeliverySlotService $deliverySlotService,
        private readonly DeliveryOptionService $deliveryOptionService,
        private readonly ShippoLabelService $shippoLabelService,
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
            'discount_code' => 'nullable|string',
            'payment_type' => 'nullable|string|in:CARD,KLARNA,PAYPAL,APPLE_PAY,GOOGLE_PAY',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $data = $request->all();
            $items = $data['items'] ?? [];
            $paymentType = strtoupper((string) ($data['payment_type'] ?? 'CARD'));
            $shippingMethod = (string) data_get($data, 'shipping.method', 'STANDARD');
            $deliveryType = str_starts_with($shippingMethod, 'TIMED:') ? 'TIMED' : strtoupper($shippingMethod);
            $shippingPrice = $this->deliveryOptionService->resolvePrice($deliveryType, auth()->user());
            $shipping_cents = (int) round($shippingPrice * 100);

            $subtotal_cents = 0;
            foreach ($items as $it) {
                $price = isset($it['unit_price_cents'])
                    ? intval($it['unit_price_cents'])
                    : intval(round(($it['unit_price'] ?? 0) * 100));
                $qty = intval($it['quantity'] ?? 1);
                $subtotal_cents += $price * $qty;
            }

            $discount_cents = 0;
            $discount_code = $data['discount_code'] ?? null;

            if ($discount_code) {
                $coupon = Coupon::where('code', $discount_code)->where('active', 1)->first();
                if ($coupon) {
                    $discount_cents = $coupon->type === 'percent'
                        ? intval(round($subtotal_cents * ($coupon->value / 100)))
                        : intval(round($coupon->value * 100));
                }
            }

            $discounted_subtotal_cents = max($subtotal_cents - $discount_cents, 0);
            $vat_cents = intval(round($discounted_subtotal_cents * 0.2));
            $total_cents = $discounted_subtotal_cents + $vat_cents + $shipping_cents;

            $paymentMethodTypes = match ($paymentType) {
                'KLARNA' => ['klarna'],
                'PAYPAL' => ['paypal'],
                // Apple Pay / Google Pay are wallet rails over card.
                'APPLE_PAY', 'GOOGLE_PAY', 'CARD' => ['card'],
                default => ['card'],
            };

            Stripe::setApiKey(env('STRIPE_SECRET'));

            $paymentIntent = PaymentIntent::create([
                'amount' => $total_cents,
                'currency' => 'gbp',
                'payment_method_types' => $paymentMethodTypes,
                'metadata' => [
                    'email' => $data['email'] ?? '',
                    'discount_code' => $discount_code ?? '',
                    'user_id' => optional(auth()->user())->id,
                    'payment_type' => $paymentType,
                ],
            ]);

            return response()->json([
                'client_secret' => $paymentIntent->client_secret,
                'subtotal' => $subtotal_cents / 100,
                'discount' => $discount_cents / 100,
                'vat' => $vat_cents / 100,
                'shipping' => $shipping_cents / 100,
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
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 400);
        }

        DB::beginTransaction();

        try {
            $data = $request->all();
            $deliveryType = strtoupper((string) data_get($data, 'options.delivery_type', 'STANDARD'));
            $deliveryPrice = $this->deliveryOptionService->resolvePrice($deliveryType, auth()->user());

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
                'shipping_rate' => $data['options']['shipping_rate'] ?? null,
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

                $filename = $itemPayload['image'] ?? null;

                if ($filename && !Str::startsWith($filename, ['http://', 'https://'])) {
                    $filename = url($filename);
                }

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'image_url' => $filename,
                    'quantity' => intval($itemPayload['quantity'] ?? 1),
                    'unit_price' => floatval($itemPayload['price'] ?? $product->price ?? 0),
                    'line_total' => floatval(($itemPayload['price'] ?? $product->price ?? 0) * intval($itemPayload['quantity'] ?? 1)),
                ]);
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
    public function showOrder($orderNumber)
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

        $order = Order::with('items.product')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found']);
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

        $orders = Order::with('items.product')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $formatted = $orders->map(function ($order) {
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

            return $orderArr;
        });

        return response()->json(['success' => true, 'orders' => $formatted]);
    }
}
