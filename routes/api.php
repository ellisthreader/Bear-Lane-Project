<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShippingController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\Admin\AdminChatController;
use App\Models\Order;

use Illuminate\Support\Facades\Mail;
use App\Mail\QuoteMail;
use App\Http\Controllers\QuoteController;

use App\Http\Controllers\Quote\QuoteRequestController;
use App\Http\Controllers\Quote\InstantQuoteController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider within the "api"
| middleware group. CSRF protection is NOT applied here, which is ideal
| for SPA / React requests.
|
*/

// -----------------------------
// Checkout / Payments
// -----------------------------
Route::post('/create-payment-intent', [CheckoutController::class, 'createPaymentIntent']);
Route::post('/store-order', [CheckoutController::class, 'storeOrder']);

// -----------------------------
// Retrieve latest order (for OrderConfirmed page)
// -----------------------------
Route::get('/order-latest', function (Request $request) {
    $email = $request->query('email');

    if (!$email) {
        return response()->json([
            'success' => false,
            'message' => 'Email parameter is required.',
        ], 400);
    }

    $order = Order::with('items')
        ->where('email', $email)
        ->latest()
        ->first();

    if (!$order) {
        return response()->json([
            'success' => false,
            'message' => 'No order found for that email.',
        ], 404);
    }

    return response()->json([
        'success' => true,
        'order' => [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'email' => $order->email,
            'items' => $order->items->map(function ($item) {
                return [
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                ];
            }),
            'totals' => [
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) ($order->discount_amount ?? 0),
                'vat' => (float) $order->vat,
                'shipping' => (float) $order->shipping,
                'total' => (float) $order->total,
            ],
            'created_at' => $order->created_at->toDateTimeString(),
        ],
    ]);
});

// -----------------------------
// Discounts
// -----------------------------
Route::post('/discount/validate', [CouponController::class, 'apply']);

// -----------------------------
// Shipping
// -----------------------------
Route::post('/shipping/rates', [ShippingController::class, 'rates']);

// -----------------------------
// Authentication
// -----------------------------
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// -----------------------------
// Protected routes (require auth via Sanctum)
// -----------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/profile/update', [ProfileController::class, 'update'])->name('profile.update');
});

// -----------------------------
// Livechat (user)
// -----------------------------
Route::get('/chat', [ChatController::class, 'index']);
Route::post('/chat/send', [ChatController::class, 'send']);

// -----------------------------
// Admin livechat (active chats)
// -----------------------------
// For now, just require auth:sanctum.
// You can later add 'admin' middleware if you have an admin role
Route::middleware(['auth:sanctum', 'admin'])->get('/admin/active-chats', [AdminChatController::class, 'activeChats']);



// -- Email
Route::post('/send-quote', [QuoteController::class, 'sendQuote']);

// -- Quotes

Route::post('/quote-request', [QuoteRequestController::class, 'store']);

Route::post('/instant-quote', [InstantQuoteController::class, 'store']);