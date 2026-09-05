<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShippingController;
use App\Http\Controllers\DeliverySlotController;
use App\Http\Controllers\DeliveryOptionController;
use App\Http\Controllers\ShippingRateController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\ChatController;

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
// Discounts
// -----------------------------
Route::post('/discount/validate', [CouponController::class, 'apply']);

// -----------------------------
// Shipping
// -----------------------------
Route::post('/shipping/rates', [ShippingController::class, 'rates']);
Route::get('/shipping-rates', [ShippingRateController::class, 'index']);
Route::get('/delivery-options', [DeliveryOptionController::class, 'index']);
Route::post('/delivery-options', [DeliveryOptionController::class, 'index']);

Route::get('/delivery-slots', [DeliverySlotController::class, 'index']);
Route::post('/reserve-slot', [DeliverySlotController::class, 'reserve']);
Route::post('/confirm-order', [DeliverySlotController::class, 'confirm']);
Route::post('/cancel-reservation', [DeliverySlotController::class, 'cancel']);

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
    Route::post('/profile/update', [ProfileController::class, 'update'])->name('api.profile.update');
});

// -----------------------------
// Livechat (user)
// -----------------------------
Route::get('/chat', [ChatController::class, 'index']);
Route::post('/chat/send', [ChatController::class, 'send']);

// -- Email
Route::post('/send-quote', [QuoteController::class, 'sendQuote']);

// -- Quotes

Route::post('/quote-request', [QuoteRequestController::class, 'store']);

Route::post('/instant-quote', [InstantQuoteController::class, 'store']);
