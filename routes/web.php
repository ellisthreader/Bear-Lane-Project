<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\UserPaymentMethod;
use App\Models\Product;
use App\Models\Category;
use App\Models\SavedDesign;
use App\Models\Order;
use App\Models\UserWishlistItem;
use App\Models\Chat;
use App\Models\Message;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\LiveChatController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderReturnController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\AdminOrdersController;
use App\Http\Controllers\Admin\AdminOrderReturnsController;
use App\Http\Controllers\Admin\AdminStatisticsController;
use App\Http\Controllers\Admin\SupportAdminController;
use App\Http\Controllers\Admin\SupportChatController;
use App\Http\Controllers\DesignController;
use App\Http\Controllers\SavedDesignController;
use App\Http\Controllers\ProductSearchController;
use App\Http\Controllers\FaqRequestController;
use App\Http\Controllers\SupportContentController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\SavedCheckoutController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\WishlistController;
use App\Services\AdminActivityLogService;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;


/*
|--------------------------------------------------------------------------
| MENU API
|--------------------------------------------------------------------------
*/
Route::get('/menu/categories', function () {
    $mainCategories = ['women', 'men', 'kids', 'sale'];
    $response = [];
    $buildTree = function (Category $node) use (&$buildTree) {
        $children = Category::where('parent_id', $node->id)
            ->orderBy('name')
            ->get();

        return [
            'id' => $node->id,
            'name' => $node->name,
            'slug' => $node->slug,
            'children' => $children->map(fn (Category $child) => $buildTree($child))->values(),
        ];
    };

    foreach ($mainCategories as $main) {
        $root = Category::where('slug', $main)->first();

        if (!$root) {
            $response[$main] = [
                'topLevel'      => [['title' => ucfirst($main)]],
                'links'         => [],
                'subcategories' => [],
                'tree'          => null,
            ];
            continue;
        }

        $levelOne = Category::where('parent_id', $root->id)->get();

        $sub = [];
        foreach ($levelOne as $cat) {
            $sub[strtolower($cat->slug)] =
                Category::where('parent_id', $cat->id)
                    ->pluck('name')->toArray();
        }

        $response[$main] = [
            'topLevel'      => [['title' => ucfirst($main)]],
            'links'         => $levelOne->map(fn($c) => [
                'key'  => strtolower($c->slug),
                'name' => $c->name,
            ]),
            'subcategories' => $sub,
            'tree'          => $buildTree($root),
        ];
    }

    return response()->json($response);
});

/*
|--------------------------------------------------------------------------
| PUBLIC PAGES
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    $mensTShirtSlugs = [
        'men/t-shirt',
        'men/tshirts',
        'men-t-shirt',
        'men-tshirts',
        'men-clothing-t-shirts',
    ];

    $products = Product::query()
        ->with('images')
        ->withAvg('approvedReviews as average_rating', 'rating')
        ->withCount('approvedReviews as reviews_count')
        ->where(function ($query) use ($mensTShirtSlugs) {
            $query
                ->whereHas('categories', function ($categoryQuery) use ($mensTShirtSlugs) {
                    $categoryQuery->whereIn('slug', $mensTShirtSlugs);
                })
                ->orWhereHas('category', function ($categoryQuery) use ($mensTShirtSlugs) {
                    $categoryQuery->whereIn('slug', $mensTShirtSlugs);
                });
        })
        ->orderByDesc('is_trending')
        ->latest()
        ->get();

    return Inertia::render('Welcome/Welcome', [
        'products'    => $products,
        'canLogin'    => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
})->name('home');

Route::get('/projects', fn() => Inertia::render('Projects/Projects'))->name('projects');
Route::get('/courses', fn() => redirect('/'))->name('courses');
Route::get('/checkout', fn() => Inertia::render('CheckoutPage/CheckoutPage'))->name('checkout');

/*
|--------------------------------------------------------------------------
| PRODUCT ROUTES
|--------------------------------------------------------------------------
*/
Route::get('/products/{type}', [ProductController::class, 'index'])->name('products.index');
Route::get('/product/{slug}', [ProductController::class, 'show'])->name('product.show');

/*
|--------------------------------------------------------------------------
| CATEGORY ROUTES
|--------------------------------------------------------------------------
*/
Route::get('/category/kids/{gender}/{category}/{age}/{sub?}', [CategoryController::class, 'kids'])
    ->name('category.kids.show');

Route::get('/category/{heading}/{category}/{subcategory}', [CategoryController::class, 'showMulti'])
    ->name('category.multi.show');

Route::get('/category/{slug}', [CategoryController::class, 'show'])
     ->where('slug', '.*')
     ->name('category.show');

/*
|--------------------------------------------------------------------------
| CATEGORY SEARCH
|--------------------------------------------------------------------------
*/
Route::get('/search-categories', [ProductSearchController::class, 'searchCategories'])
     ->name('search.categories');

/*
|--------------------------------------------------------------------------
| ORDER CONFIRMATION
|--------------------------------------------------------------------------
*/
Route::get('/order-confirmed/{orderNumber}', [CheckoutController::class, 'orderConfirmed'])
    ->name('order.confirmed');

Route::get('/order-confirmed', fn() => redirect('/'))->name('order.confirmed.redirect');

/*
|--------------------------------------------------------------------------
| USER ORDERS
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/user-orders', [CheckoutController::class, 'userOrders'])->name('orders.list');
    Route::get('/orders/{orderNumber}', [CheckoutController::class, 'showOrder'])->name('orders.show');
    Route::get('/orders/{order}/returns/shipping-options', [OrderReturnController::class, 'shippingOptions'])->whereNumber('order')->name('orders.returns.shipping-options');
    Route::post('/orders/{order}/returns', [OrderReturnController::class, 'store'])->whereNumber('order')->name('orders.returns.store');
    Route::patch('/orders/{order}/returns/{returnRequest}/mark-sent', [OrderReturnController::class, 'markSent'])
        ->whereNumber('order')
        ->whereNumber('returnRequest')
        ->name('orders.returns.mark-sent');
    Route::post('/orders/{order}/returns/{returnRequest}/more-evidence', [OrderReturnController::class, 'submitMoreEvidence'])
        ->whereNumber('order')
        ->whereNumber('returnRequest')
        ->name('orders.returns.more-evidence');
    Route::get('/orders/{order}/returns/{returnRequest}/refund-statement', [OrderReturnController::class, 'refundStatement'])
        ->whereNumber('order')
        ->whereNumber('returnRequest')
        ->name('orders.returns.refund-statement');
    Route::post('/orders/{order}/items/{orderItem}/reviews', [ProductReviewController::class, 'store'])
        ->whereNumber('order')
        ->whereNumber('orderItem')
        ->name('orders.items.reviews.store');
});

Route::get('/order-latest', [CheckoutController::class, 'latestOrder'])->name('order.latest');

/*
|--------------------------------------------------------------------------
| STRIPE
|--------------------------------------------------------------------------
*/
Route::post('/create-payment-intent', [CheckoutController::class, 'createPaymentIntent']);
Route::post('/checkout/store-order', [CheckoutController::class, 'storeOrder'])->name('checkout.store');
Route::get('/checkout/complete', [WalletController::class, 'checkoutComplete'])->name('checkout.complete');

/*
|--------------------------------------------------------------------------
| AUTH ROUTES
|--------------------------------------------------------------------------
*/
Route::get('/login', fn() => Inertia::render('Auth/Login'))->name('login');
Route::get('/register', fn() => Inertia::render('Auth/Login'))->name('register');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/reset-password/{token}', fn(Request $request, $token) =>
    Inertia::render('Auth/ResetPassword', [
        'token' => $token,
        'email' => $request->email,
    ])
)->name('password.reset');

Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');

/*
|--------------------------------------------------------------------------
| USER PROFILE
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    // Profile page
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
    // Legacy edit profile URL now redirects to account profile view.
    Route::get('/profile/edit', fn () => redirect('/profile'))->name('profile.edit');
    // Update profile
    Route::post('/profile/update', [ProfileController::class, 'update'])->name('profile.update');
    // Update avatar only
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    // Generate avatar
    Route::post('/profile/generate-avatar', [ProfileController::class, 'generateRandomAvatar'])->name('profile.generate-avatar');
    // Delete account
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Saved checkout data in profile
    Route::get('/profile/saved-checkout', [SavedCheckoutController::class, 'index'])->name('profile.saved-checkout');
    Route::get('/profile/address-book', [SavedCheckoutController::class, 'addressBookPage'])->name('profile.address-book');
    Route::get('/profile/payment-methods', [SavedCheckoutController::class, 'paymentMethodsPage'])->name('profile.payment-methods');
    Route::post('/profile/addresses', [SavedCheckoutController::class, 'storeAddress'])->name('profile.addresses.store');
    Route::patch('/profile/addresses/{addressId}', [SavedCheckoutController::class, 'updateAddress'])->name('profile.addresses.update');
    Route::patch('/profile/addresses/{addressId}/default', [SavedCheckoutController::class, 'setDefaultAddress'])->name('profile.addresses.default');
    Route::delete('/profile/addresses/{addressId}', [SavedCheckoutController::class, 'deleteAddress'])->name('profile.addresses.delete');
    Route::post('/profile/payment-methods/setup-intent', [SavedCheckoutController::class, 'createPaymentMethodSetupIntent'])->name('profile.payment-methods.setup-intent');
    Route::post('/profile/payment-methods', [SavedCheckoutController::class, 'storePaymentMethod'])->name('profile.payment-methods.store');
    Route::patch('/profile/payment-methods/{paymentMethodId}/default', [SavedCheckoutController::class, 'setDefaultPaymentMethod'])->name('profile.payment-methods.default');
    Route::delete('/profile/payment-methods/{paymentMethodId}', [SavedCheckoutController::class, 'deletePaymentMethod'])->name('profile.payment-methods.delete');
    Route::get('/profile/wallets/connect/{provider}', [WalletController::class, 'connect'])->name('profile.wallets.connect');
    Route::delete('/profile/wallets/{paymentMethodId}', [WalletController::class, 'disconnect'])->name('profile.wallets.disconnect');

});

Route::middleware(['auth'])->group(function () {
    Route::post('/product/{slug}/notify-restock', [ProductController::class, 'subscribeRestock'])
        ->name('product.notify-restock');

    Route::get('/notifications/admin-notices', function (Request $request) {
        $user = $request->user();

        $chat = Chat::query()
            ->where('user_id', $user->id)
            ->where('title', 'Admin Notices')
            ->first();

        if (!$chat) {
            return response()->json(['notifications' => []]);
        }

        $notifications = Message::query()
            ->where('chat_id', $chat->id)
            ->where('sender_type', 'admin')
            ->latest('created_at')
            ->get()
            ->map(function (Message $message) {
                $content = (string) $message->content;
                $isWarning = str_starts_with($content, '[WARNING]');

                return [
                    'id' => $message->id,
                    'type' => $isWarning ? 'warning' : 'message',
                    'title' => $isWarning ? 'Warning' : 'Admin message',
                    'content' => $isWarning ? trim(str_replace('[WARNING]', '', $content)) : $content,
                    'created_at' => optional($message->created_at)?->toIso8601String(),
                ];
            })
            ->values();

        return response()->json(['notifications' => $notifications]);
    })->name('notifications.admin-notices');

    Route::delete('/notifications/admin-notices/{notificationId}', function (Request $request, int $notificationId) {
        $user = $request->user();

        $chat = Chat::query()
            ->where('user_id', $user->id)
            ->where('title', 'Admin Notices')
            ->first();

        if (!$chat) {
            return response()->json(['success' => true]);
        }

        Message::query()
            ->where('id', $notificationId)
            ->where('chat_id', $chat->id)
            ->where('sender_type', 'admin')
            ->delete();

        return response()->json(['success' => true]);
    })->whereNumber('notificationId')->name('notifications.admin-notices.delete');

    Route::delete('/notifications/admin-notices', function (Request $request) {
        $user = $request->user();

        $chat = Chat::query()
            ->where('user_id', $user->id)
            ->where('title', 'Admin Notices')
            ->first();

        if (!$chat) {
            return response()->json(['success' => true]);
        }

        Message::query()
            ->where('chat_id', $chat->id)
            ->where('sender_type', 'admin')
            ->delete();

        return response()->json(['success' => true]);
    })->name('notifications.admin-notices.clear');

    // Checkout page uses saved data even if email is not verified yet.
    Route::get('/checkout/saved-details', [SavedCheckoutController::class, 'index'])->name('checkout.saved-details');
    Route::get('/wishlist-items', [WishlistController::class, 'index'])->name('wishlist.index');
    Route::post('/wishlist-items', [WishlistController::class, 'store'])->name('wishlist.store');
    Route::delete('/wishlist-items', [WishlistController::class, 'destroy'])->name('wishlist.delete');
});

/*
|--------------------------------------------------------------------------
| EMAIL VERIFICATION
|--------------------------------------------------------------------------
*/

// Show verification notice page
Route::get('/email/verify', function () {
    return Inertia::render('Auth/VerifyEmail');
})->middleware('auth')->name('verification.notice');


// Handle verification link (THIS ACTUALLY VERIFIES)
Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {

    $request->fulfill(); // <-- THIS sets email_verified_at

    return redirect()->route('profile')
        ->with('verified', 1);

})->middleware(['auth', 'signed', 'throttle:6,1'])
  ->name('verification.verify');


// Resend verification email (THIS ACTUALLY SENDS EMAIL)
Route::post('/email/verification-notification', function (Request $request) {

    if ($request->user()->hasVerifiedEmail()) {
        return back();
    }

    $request->user()->sendEmailVerificationNotification();

    return back()->with('status', 'Verification link sent!');

})->middleware(['auth', 'throttle:6,1'])
  ->name('verification.send');

Route::get('/email/verification-status', function (Request $request) {
    return response()->json([
        'verified' => (bool) optional($request->user())->hasVerifiedEmail(),
    ]);
})->middleware('auth')->name('verification.status');

/*
|--------------------------------------------------------------------------
| HELP / FAQ
|--------------------------------------------------------------------------
*/
Route::get('/help', [SupportContentController::class, 'helpCentre'])->name('help');
Route::get('/help/search', [SupportContentController::class, 'search'])->name('help.search');
Route::get('/help/orders', fn() => Inertia::render('Help/OrdersShipping'))->name('help.orders');
Route::get('/help/returns', fn() => Inertia::render('Help/ReturnsRefunds'))->name('help.returns');
Route::get('/help/account', fn() => Inertia::render('Help/AccountManagement'))->name('help.account');
Route::get('/help/payments', fn() => Inertia::render('Help/PaymentsBilling'))->name('help.payments');
Route::get('/help/technical', fn() => Inertia::render('Help/TechnicalSupport'))->name('help.technical');
Route::get('/help/privacy', fn() => Inertia::render('Help/PrivacySecurity'))->name('help.privacy');
Route::get('/help/articles/{slug}', [SupportContentController::class, 'article'])->name('help.article');
Route::get('/support', fn() => Inertia::render('Help/Support'))->name('support');
Route::get('/faq', [SupportContentController::class, 'faq'])->name('faq');
Route::get('/help/livechat', fn() => Inertia::render('Help/Livechat'))->name('help.livechat');
Route::middleware('auth')->post('/help/faq-requests', [FaqRequestController::class, 'store'])->name('help.faq-requests.store');

Route::get('/livechat/messages', [LiveChatController::class, 'fetchMessages'])->name('livechat.messages');
Route::post('/livechat/message', [LiveChatController::class, 'sendMessage'])->name('livechat.send');
Route::post('/livechat/upload', [LiveChatController::class, 'uploadAttachment'])->name('livechat.upload');
Route::delete('/livechat/{chat}', [LiveChatController::class, 'deleteChat'])->name('livechat.delete');
Route::post('/livechat/{chat}/transcript', [LiveChatController::class, 'emailTranscript'])->name('livechat.transcript');

/*
|--------------------------------------------------------------------------
| CHAT API
|--------------------------------------------------------------------------
*/
Route::get('/api/chat', [ChatController::class, 'index'])->name('chat.index');

/*
|--------------------------------------------------------------------------
| INVOICE
|--------------------------------------------------------------------------
*/
Route::get('/invoice/{orderId}', [InvoiceController::class, 'download'])->name('invoice.download');

/*
|--------------------------------------------------------------------------
| CHECKERS
|--------------------------------------------------------------------------
*/
Route::get('/check-username', fn(Request $request) => response()->json([
    'exists' => User::where('username', $request->username)->exists(),
]))->name('check.username');

Route::get('/check-email', fn(Request $request) => response()->json([
    'exists' => User::where('email', $request->email)->exists(),
]))->name('check.email');

Route::get('/company', fn() => Inertia::render('Company'));

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'admin', 'admin.activity'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [SupportAdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/statistics', [AdminStatisticsController::class, 'index'])->name('admin.statistics');
    Route::get('/statistics/data', [AdminStatisticsController::class, 'data'])->name('admin.statistics.data');
    Route::get('/statistics/{metric}', [AdminStatisticsController::class, 'showMetric'])
        ->where('metric', 'total_revenue|total_users|total_orders|net_profit|best_selling_products|reviews')
        ->name('admin.statistics.metric');
    Route::get('/statistics/{metric}/data', [AdminStatisticsController::class, 'metricData'])
        ->where('metric', 'total_revenue|total_users|total_orders|net_profit|best_selling_products|reviews')
        ->name('admin.statistics.metric.data');
    Route::get('/support', [SupportAdminController::class, 'index'])->name('admin.support');
    Route::get('/support/data', [SupportAdminController::class, 'data'])->name('admin.support.data');
    Route::post('/support/articles', [SupportAdminController::class, 'storeArticle'])->name('admin.support.articles.store');
    Route::patch('/support/articles/{article}', [SupportAdminController::class, 'updateArticle'])->name('admin.support.articles.update');
    Route::delete('/support/articles/{article}', [SupportAdminController::class, 'destroyArticle'])->name('admin.support.articles.delete');
    Route::patch('/support/faqs/{faqRequest}', [SupportAdminController::class, 'answerFaq'])->name('admin.support.faqs.answer');
    Route::delete('/support/faqs/{faqRequest}', [SupportAdminController::class, 'destroyFaq'])->name('admin.support.faqs.delete');
    Route::get('/support/chats/{chat}/messages', [SupportChatController::class, 'messages'])->name('admin.support.chats.messages');
    Route::post('/support/chats/{chat}/join', [SupportChatController::class, 'join'])->name('admin.support.chats.join');
    Route::post('/support/chats/{chat}/messages', [SupportChatController::class, 'sendMessage'])->name('admin.support.chats.send');
    Route::patch('/support/chats/{chat}/rename', [SupportChatController::class, 'rename'])->name('admin.support.chats.rename');
    Route::patch('/support/chats/{chat}/close', [SupportChatController::class, 'close'])->name('admin.support.chats.close');
    Route::patch('/support/chats/{chat}/archive', [SupportChatController::class, 'archive'])->name('admin.support.chats.archive');
    Route::delete('/support/chats/{chat}', [SupportChatController::class, 'destroy'])->name('admin.support.chats.delete');
    Route::get('/livechats', fn() => redirect('/admin/support'))->name('admin.livechats');
    Route::get('/products', [AdminProductController::class, 'index'])->name('admin.products');
    Route::post('/products', [AdminProductController::class, 'storeProduct']);
    Route::patch('/products/{product}', [AdminProductController::class, 'updateProduct']);
    Route::delete('/products/{product}', [AdminProductController::class, 'deleteProduct']);
    Route::get('/products/create-layout', [AdminProductController::class, 'createLayout'])->name('admin.products.create-layout');
    Route::post('/products/create-layout', [AdminProductController::class, 'storeProductFromLayout'])->name('admin.products.store-layout');
    Route::post('/products/upload-image', [AdminProductController::class, 'uploadImage'])->name('admin.products.upload-image');
    Route::post('/categories', [AdminProductController::class, 'storeCategory']);
    Route::patch('/categories/{category}', [AdminProductController::class, 'updateCategory']);
    Route::delete('/categories/{category}', [AdminProductController::class, 'deleteCategory']);
    Route::post('/categories/{category}/products', [AdminProductController::class, 'attachProduct']);
    Route::delete('/categories/{category}/products/{product}', [AdminProductController::class, 'detachProduct']);
    Route::get('/orders', [AdminOrdersController::class, 'index'])->name('admin.orders');
    Route::get('/orders/data', [AdminOrdersController::class, 'data'])->name('admin.orders.data');
    Route::get('/orders/{order}/data', [AdminOrdersController::class, 'show'])->whereNumber('order')->name('admin.orders.show');
    Route::patch('/orders/{order}/status', [AdminOrdersController::class, 'updateStatus'])->whereNumber('order')->name('admin.orders.status');
    Route::match(['patch', 'post', 'get'], '/orders/{order}/archive', [AdminOrdersController::class, 'archive'])->whereNumber('order')->name('admin.orders.archive');
    Route::post('/orders/{order}/message', [AdminOrdersController::class, 'messageCustomer'])->whereNumber('order')->name('admin.orders.message');
    Route::post('/orders/{order}/label', [AdminOrdersController::class, 'generateLabel'])->whereNumber('order')->name('admin.orders.label');
    Route::get('/orders/returns/data', [AdminOrderReturnsController::class, 'data'])->name('admin.orders.returns.data');
    Route::get('/orders/returns/{returnRequest}/data', [AdminOrderReturnsController::class, 'show'])->whereNumber('returnRequest')->name('admin.orders.returns.show');
    Route::get('/orders/returns/{returnRequest}/shipping-options', [AdminOrderReturnsController::class, 'shippingOptions'])->whereNumber('returnRequest')->name('admin.orders.returns.shipping-options');
    Route::patch('/orders/returns/{returnRequest}/status', [AdminOrderReturnsController::class, 'updateStatus'])->whereNumber('returnRequest')->name('admin.orders.returns.status');
    Route::post('/orders/returns/{returnRequest}/label', [AdminOrderReturnsController::class, 'generateLabel'])->whereNumber('returnRequest')->name('admin.orders.returns.label');
    Route::get('/orders/returns/{returnRequest}/refund-statement', [AdminOrderReturnsController::class, 'downloadRefundStatement'])->whereNumber('returnRequest')->name('admin.orders.returns.refund-statement');
    Route::get('/users', function () {
        $users = User::query()
            ->select(['id', 'name', 'username', 'email'])
            ->orderBy('username')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
            ])
            ->values();

        return inertia('Admin/Users', ['users' => $users]);
    })->name('admin.users');

    Route::get('/users/{userId}', function (int $userId) {
        $user = User::query()->findOrFail($userId);
        $addresses = UserAddress::query()
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->latest('updated_at')
            ->get()
            ->map(fn (UserAddress $address) => [
                'id' => $address->id,
                'label' => $address->label,
                'first_name' => $address->first_name,
                'last_name' => $address->last_name,
                'phone' => $address->phone,
                'country' => $address->country,
                'address_line1' => $address->address_line1,
                'address_line2' => $address->address_line2,
                'city' => $address->city,
                'county' => $address->county,
                'postcode' => $address->postcode,
                'is_default' => (bool) $address->is_default,
            ])
            ->values();

        $paymentMethods = UserPaymentMethod::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->latest('updated_at')
            ->get()
            ->map(fn (UserPaymentMethod $method) => [
                'id' => $method->id,
                'provider_type' => $method->provider_type ?: 'card',
                'brand' => $method->brand,
                'last4' => $method->last4,
                'exp_month' => $method->exp_month,
                'exp_year' => $method->exp_year,
                'cardholder_name' => $method->cardholder_name,
                'is_default' => (bool) $method->is_default,
                'is_active' => (bool) $method->is_active,
            ])
            ->values();

        $savedDesigns = SavedDesign::query()
            ->where('user_id', $user->id)
            ->with(['product:id,name,slug', 'product.images'])
            ->latest('updated_at')
            ->get()
            ->map(fn (SavedDesign $design) => [
                'id' => $design->id,
                'name' => $design->name,
                'product_id' => $design->product_id,
                'product_name' => optional($design->product)->name,
                'product_slug' => optional($design->product)->slug,
                'product_image' => $design->product?->images?->first()?->url,
                'created_at' => optional($design->created_at)?->toIso8601String(),
                'updated_at' => optional($design->updated_at)?->toIso8601String(),
            ])
            ->values();

        $orders = Order::query()
            ->where('user_id', $user->id)
            ->with(['items:id,order_id,product_id,product_name,size,colour,image_url,quantity,unit_price,line_total'])
            ->latest('created_at')
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total' => $order->total,
                'subtotal' => $order->subtotal,
                'shipping' => $order->shipping,
                'vat' => $order->vat,
                'discount_amount' => $order->discount_amount,
                'payment_intent_id' => $order->payment_intent_id,
                'created_at' => optional($order->created_at)?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'size' => $item->size,
                    'colour' => $item->colour,
                    'image_url' => $item->image_url,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ])->values(),
            ])
            ->values();

        $wishlistItems = UserWishlistItem::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->get()
            ->map(fn (UserWishlistItem $item) => [
                'id' => $item->id,
                'item_key' => $item->item_key,
                'product_id' => $item->product_id,
                'product_slug' => $item->product_slug,
                'name' => $item->name,
                'brand' => $item->brand,
                'price' => $item->price,
                'image' => $item->image,
                'created_at' => optional($item->created_at)?->toIso8601String(),
                'updated_at' => optional($item->updated_at)?->toIso8601String(),
            ])
            ->values();

        $countryRaw = trim((string) data_get($addresses->first(), 'country', ''));
        $countryUpper = strtoupper($countryRaw);
        $countryCode = null;
        if ($countryUpper !== '') {
            if (preg_match('/^[A-Z]{2}$/', $countryUpper) === 1) {
                $countryCode = $countryUpper;
            } else {
                $countryLookup = [
                    'UNITED KINGDOM' => 'GB',
                    'UK' => 'GB',
                    'GREAT BRITAIN' => 'GB',
                    'UNITED STATES' => 'US',
                    'UNITED STATES OF AMERICA' => 'US',
                    'USA' => 'US',
                    'CANADA' => 'CA',
                    'IRELAND' => 'IE',
                    'FRANCE' => 'FR',
                    'GERMANY' => 'DE',
                    'ITALY' => 'IT',
                    'SPAIN' => 'ES',
                    'PORTUGAL' => 'PT',
                    'NETHERLANDS' => 'NL',
                ];
                $countryCode = $countryLookup[$countryUpper] ?? null;
            }
        }

        $rawAttributes = collect($user->getAttributes())
            ->map(function ($value) {
                if ($value === null) return null;
                if (is_bool($value)) return $value;
                if (is_numeric($value)) return $value + 0;
                return (string) $value;
            })
            ->toArray();

        return inertia('Admin/UserDetails', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'is_admin' => (bool) $user->is_admin,
                'is_oauth' => (bool) ($user->is_oauth ?? false),
                'oauth_provider' => $user->oauth_provider,
                'country_code' => $countryCode,
                'country' => $countryRaw !== '' ? $countryRaw : null,
                'created_at' => optional($user->created_at)?->toIso8601String(),
            ],
            'addresses' => $addresses,
            'payment_methods' => $paymentMethods,
            'saved_designs' => $savedDesigns,
            'orders' => $orders,
            'wishlist_items' => $wishlistItems,
            'raw_attributes' => $rawAttributes,
        ]);
    })->whereNumber('userId')->name('admin.users.show');

    Route::patch('/users/{userId}/profile', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $before = $user->only(['username', 'name', 'phone', 'email']);

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($user->id)],
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->update([
            'username' => $validated['username'],
            'name' => $validated['name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'],
        ]);

        $changes = $activityLogger->extractChanges(
            $before,
            $user->only(['username', 'name', 'phone', 'email']),
            [
                'username' => 'Username',
                'name' => 'Name',
                'phone' => 'Phone',
                'email' => 'Email',
            ]
        );

        $activityLogger->logFromRequest(
            $request,
            'user_profile_updated',
            'User profile updated',
            "Updated profile for '{$user->name}'. " . $activityLogger->summarizeChanges($changes),
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($user, $user->name ?: $user->username ?: "User #{$user->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'target_user_email' => $user->email,
                    'changes' => $changes,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->name('admin.users.profile.update');

    Route::post('/users/{userId}/profile-avatar', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);

        $request->validate([
            'profile_photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            $path = $request->file('profile_photo')->store('avatars', 'public');
            $user->update(['avatar' => $path]);

            $activityLogger->logFromRequest(
                $request,
                'user_avatar_updated',
                'User avatar updated',
                "Updated avatar for '{$user->name}'",
                [
                    'icon' => 'user',
                    ...$activityLogger->modelContext($user, $user->name ?: $user->username ?: "User #{$user->id}"),
                    'metadata' => [
                        'target_user_id' => $user->id,
                    ],
                ]
            );
        }

        return response()->json([
            'success' => true,
            'avatar_url' => $user->fresh()->avatar_url,
        ]);
    })->whereNumber('userId')->name('admin.users.profile.avatar');

    Route::post('/users/{userId}/profile-avatar/reset', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);

        if ($user->avatar && !str_starts_with($user->avatar, 'http') && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->update([
            'avatar' => asset('images/DefaultPicture.png'),
        ]);

        $activityLogger->logFromRequest(
            $request,
            'user_avatar_reset',
            'User avatar reset',
            "Reset avatar for '{$user->name}'",
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($user, $user->name ?: $user->username ?: "User #{$user->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'avatar_url' => $user->fresh()->avatar_url,
        ]);
    })->whereNumber('userId')->name('admin.users.profile.avatar.reset');

    Route::post('/users/{userId}/send-password-reset', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $result = Password::sendResetLink(['email' => $user->email]);

        if ($result !== Password::RESET_LINK_SENT) {
            return response()->json(['success' => false, 'message' => __($result)], 422);
        }

        $activityLogger->logFromRequest(
            $request,
            'user_password_reset_email_sent',
            'Password reset email sent',
            "Sent password reset email to '{$user->email}'",
            [
                'icon' => 'mail',
                ...$activityLogger->modelContext($user, $user->name ?: $user->username ?: "User #{$user->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'target_user_email' => $user->email,
                ],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Password reset email sent.']);
    })->whereNumber('userId')->name('admin.users.password-reset');

    Route::delete('/users/{userId}', function (Request $request, int $userId) {
        $target = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);

        if ((int) $target->id === (int) $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own admin account.'], 422);
        }

        $targetLabel = $target->name ?: $target->username ?: "User #{$target->id}";
        $context = $activityLogger->modelContext($target, $targetLabel);
        $target->delete();

        $activityLogger->logFromRequest(
            $request,
            'user_deleted_by_admin',
            'Account deleted by admin',
            "Deleted account '{$targetLabel}'",
            [
                'icon' => 'user',
                ...$context,
                'metadata' => [
                    'target_user_id' => $target->id,
                    'target_user_email' => $target->email,
                ],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Account deleted.']);
    })->whereNumber('userId')->name('admin.users.delete');

    Route::post('/users/{userId}/send-email', function (Request $request, int $userId) {
        $target = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        if (empty($target->email)) {
            return response()->json(['success' => false, 'message' => 'This user has no email address.'], 422);
        }

        try {
            Mail::send('emails.admin-message', [
                'heading' => (string) $validated['subject'],
                'messageBody' => (string) $validated['message'],
                'type' => 'message',
                'userName' => (string) ($target->name ?: $target->username ?: 'there'),
                'logoUrl' => asset('images/BLText.png'),
            ], function ($mail) use ($target, $validated) {
                $mail->to($target->email)->subject((string) $validated['subject']);
            });
        } catch (Throwable $exception) {
            Log::error('Admin email send failed.', [
                'route' => 'admin.users.send-email',
                'target_user_id' => $target->id,
                'target_user_email' => $target->email,
                'subject' => (string) $validated['subject'],
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Email could not be sent right now. Please check mail settings and worker status.',
            ], 500);
        }

        $activityLogger->logFromRequest(
            $request,
            'admin_email_sent_to_user',
            'Admin email sent',
            "Sent email '{$validated['subject']}' to '{$target->email}'",
            [
                'icon' => 'mail',
                ...$activityLogger->modelContext($target, $target->name ?: $target->username ?: "User #{$target->id}"),
                'metadata' => [
                    'target_user_id' => $target->id,
                    'target_user_email' => $target->email,
                    'subject' => (string) $validated['subject'],
                ],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Email sent.']);
    })->whereNumber('userId')->name('admin.users.send-email');

    Route::post('/users/{userId}/website-message', function (Request $request, int $userId) {
        $target = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $chat = Chat::query()->firstOrCreate(
            ['user_id' => $target->id, 'title' => 'Admin Notices'],
            ['is_closed' => false, 'admin_joined' => true]
        );

        Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $request->user()->id,
            'sender_type' => 'admin',
            'content' => (string) $validated['message'],
        ]);

        $activityLogger->logFromRequest(
            $request,
            'admin_website_message_sent',
            'Website message sent',
            "Sent website inbox message to '{$target->email}'",
            [
                'icon' => 'mail',
                ...$activityLogger->modelContext($target, $target->name ?: $target->username ?: "User #{$target->id}"),
                'metadata' => [
                    'target_user_id' => $target->id,
                    'chat_id' => $chat->id,
                ],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Website message sent.']);
    })->whereNumber('userId')->name('admin.users.website-message');

    Route::post('/users/{userId}/issue-warning', function (Request $request, int $userId) {
        $target = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $warningText = '[WARNING] ' . (string) $validated['message'];

        $chat = Chat::query()->firstOrCreate(
            ['user_id' => $target->id, 'title' => 'Admin Notices'],
            ['is_closed' => false, 'admin_joined' => true]
        );

        Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $request->user()->id,
            'sender_type' => 'admin',
            'content' => $warningText,
        ]);

        if (empty($target->email)) {
            return response()->json(['success' => false, 'message' => 'This user has no email address.'], 422);
        }

        try {
            Mail::send('emails.admin-message', [
                'heading' => 'Important account warning',
                'messageBody' => (string) $validated['message'],
                'type' => 'warning',
                'userName' => (string) ($target->name ?: $target->username ?: 'there'),
                'logoUrl' => asset('images/BLText.png'),
            ], function ($mail) use ($target) {
                $mail->to($target->email)->subject('Important account warning');
            });
        } catch (Throwable $exception) {
            Log::error('Admin warning email send failed.', [
                'route' => 'admin.users.warning',
                'target_user_id' => $target->id,
                'target_user_email' => $target->email,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Warning email could not be sent right now. Please check mail settings and worker status.',
            ], 500);
        }

        $activityLogger->logFromRequest(
            $request,
            'admin_warning_sent_to_user',
            'Warning issued to user',
            "Issued warning to '{$target->email}'",
            [
                'icon' => 'alert',
                ...$activityLogger->modelContext($target, $target->name ?: $target->username ?: "User #{$target->id}"),
                'metadata' => [
                    'target_user_id' => $target->id,
                    'target_user_email' => $target->email,
                    'chat_id' => $chat->id,
                ],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Warning issued.']);
    })->whereNumber('userId')->name('admin.users.warning');

    Route::patch('/users/{userId}/addresses/{addressId}', function (Request $request, int $userId, int $addressId) {
        $user = User::query()->findOrFail($userId);
        $address = UserAddress::query()->where('user_id', $user->id)->findOrFail($addressId);
        $activityLogger = app(AdminActivityLogService::class);
        $before = $address->only([
            'label',
            'first_name',
            'last_name',
            'phone',
            'country',
            'address_line1',
            'address_line2',
            'city',
            'county',
            'postcode',
        ]);

        $validated = $request->validate([
            'label' => 'nullable|string|max:60',
            'first_name' => 'required|string|max:120',
            'last_name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30',
            'country' => 'required|string|max:120',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'required|string|max:120',
            'county' => 'nullable|string|max:120',
            'postcode' => 'required|string|max:30',
        ]);

        $address->update($validated);

        $changes = $activityLogger->extractChanges(
            $before,
            $address->only([
                'label',
                'first_name',
                'last_name',
                'phone',
                'country',
                'address_line1',
                'address_line2',
                'city',
                'county',
                'postcode',
            ]),
            [
                'label' => 'Label',
                'first_name' => 'First name',
                'last_name' => 'Last name',
                'phone' => 'Phone',
                'country' => 'Country',
                'address_line1' => 'Address line 1',
                'address_line2' => 'Address line 2',
                'city' => 'City',
                'county' => 'County',
                'postcode' => 'Postcode',
            ]
        );

        $activityLogger->logFromRequest(
            $request,
            'user_address_updated',
            'User address updated',
            "Updated address for '{$user->name}'. " . $activityLogger->summarizeChanges($changes),
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($address, "Address #{$address->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'changes' => $changes,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->whereNumber('addressId')->name('admin.users.addresses.update');

    Route::post('/users/{userId}/addresses', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);

        $validated = $request->validate([
            'label' => 'nullable|string|max:60',
            'first_name' => 'required|string|max:120',
            'last_name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30',
            'country' => 'required|string|max:120',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'required|string|max:120',
            'county' => 'nullable|string|max:120',
            'postcode' => 'required|string|max:30',
            'is_default' => 'sometimes|boolean',
        ]);

        $isDefault = (bool) ($validated['is_default'] ?? false);
        if ($isDefault) {
            UserAddress::query()->where('user_id', $user->id)->update(['is_default' => false]);
        } else {
            $isDefault = !UserAddress::query()->where('user_id', $user->id)->exists();
        }

        $address = UserAddress::query()->create([
            'user_id' => $user->id,
            'label' => $validated['label'] ?? null,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'phone' => $validated['phone'] ?? null,
            'country' => $validated['country'],
            'address_line1' => $validated['address_line1'],
            'address_line2' => $validated['address_line2'] ?? null,
            'city' => $validated['city'],
            'county' => $validated['county'] ?? null,
            'postcode' => $validated['postcode'],
            'is_default' => $isDefault,
        ]);

        $activityLogger->logFromRequest(
            $request,
            'user_address_added',
            'User address added',
            "Added new address for '{$user->email}'",
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($address, "Address #{$address->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'address_id' => $address->id,
                    'is_default' => (bool) $address->is_default,
                ],
            ]
        );

        return response()->json(['success' => true, 'address_id' => $address->id]);
    })->whereNumber('userId')->name('admin.users.addresses.store');

    Route::delete('/users/{userId}/addresses/{addressId}', function (Request $request, int $userId, int $addressId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $address = UserAddress::query()
            ->where('user_id', $user->id)
            ->findOrFail($addressId);

        $wasDefault = (bool) $address->is_default;
        $addressLabel = trim((string) (($address->label ?: '') ?: "Address #{$address->id}"));
        $context = $activityLogger->modelContext($address, $addressLabel);
        $address->delete();

        if ($wasDefault) {
            $next = UserAddress::query()
                ->where('user_id', $user->id)
                ->latest('updated_at')
                ->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        $activityLogger->logFromRequest(
            $request,
            'user_address_deleted',
            'User address removed',
            "Removed address '{$addressLabel}' for '{$user->email}'",
            [
                'icon' => 'user',
                ...$context,
                'metadata' => [
                    'target_user_id' => $user->id,
                    'address_id' => $addressId,
                    'was_default' => $wasDefault,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->whereNumber('addressId')->name('admin.users.addresses.delete');

    Route::post('/users/{userId}/payment-methods', function (Request $request, int $userId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);

        $validated = $request->validate([
            'provider_type' => ['required', 'string', Rule::in(['card', 'paypal', 'klarna'])],
            'brand' => 'nullable|string|max:80',
            'last4' => 'nullable|string|max:4',
            'exp_month' => 'nullable|integer|min:1|max:12',
            'exp_year' => 'nullable|integer|min:' . ((int) date('Y')) . '|max:' . (((int) date('Y')) + 25),
            'cardholder_name' => 'nullable|string|max:120',
            'is_default' => 'sometimes|boolean',
        ]);

        $providerType = strtolower((string) $validated['provider_type']);
        if ($providerType === 'card' && empty($validated['last4'])) {
            return response()->json(['message' => 'Last 4 digits are required for card payment methods.'], 422);
        }

        $isDefault = (bool) ($validated['is_default'] ?? false);
        if ($isDefault) {
            UserPaymentMethod::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->update(['is_default' => false]);
        } else {
            $isDefault = !UserPaymentMethod::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->exists();
        }

        $method = UserPaymentMethod::query()->create([
            'user_id' => $user->id,
            'stripe_payment_method_id' => 'admin_manual_' . $user->id . '_' . str_replace('-', '', (string) \Illuminate\Support\Str::uuid()),
            'provider_type' => $providerType,
            'brand' => $validated['brand'] ?? null,
            'last4' => $validated['last4'] ?? null,
            'exp_month' => $validated['exp_month'] ?? null,
            'exp_year' => $validated['exp_year'] ?? null,
            'cardholder_name' => $validated['cardholder_name'] ?? null,
            'is_default' => $isDefault,
            'is_active' => true,
        ]);

        $activityLogger->logFromRequest(
            $request,
            'user_payment_method_added',
            'User payment method added',
            "Added {$providerType} payment method for '{$user->email}'",
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($method, "Payment method #{$method->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'payment_method_id' => $method->id,
                    'provider_type' => $providerType,
                    'last4' => $method->last4,
                    'is_default' => (bool) $method->is_default,
                ],
            ]
        );

        return response()->json(['success' => true, 'payment_method_id' => $method->id]);
    })->whereNumber('userId')->name('admin.users.payment-methods.store');

    Route::delete('/users/{userId}/payment-methods/{paymentMethodId}', function (Request $request, int $userId, int $paymentMethodId) {
        $user = User::query()->findOrFail($userId);
        $activityLogger = app(AdminActivityLogService::class);
        $method = UserPaymentMethod::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->findOrFail($paymentMethodId);

        $wasDefault = (bool) $method->is_default;
        $method->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        if ($wasDefault) {
            $next = UserPaymentMethod::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->latest('updated_at')
                ->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        $activityLogger->logFromRequest(
            $request,
            'user_payment_method_deleted',
            'User payment method removed',
            "Removed payment method ending " . ($method->last4 ?: 'unknown') . " for '{$user->email}'",
            [
                'icon' => 'user',
                ...$activityLogger->modelContext($method, "Payment method #{$method->id}"),
                'metadata' => [
                    'target_user_id' => $user->id,
                    'payment_method_id' => $method->id,
                    'last4' => $method->last4,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->whereNumber('paymentMethodId')->name('admin.users.payment-methods.delete');

    Route::delete('/users/{userId}/designs/{designId}', function (Request $request, int $userId, int $designId) {
        $user = User::query()->findOrFail($userId);
        $design = SavedDesign::query()->where('user_id', $user->id)->findOrFail($designId);
        $activityLogger = app(AdminActivityLogService::class);
        $designLabel = $design->name ?: "Design #{$design->id}";
        $context = $activityLogger->modelContext($design, $designLabel);
        $design->delete();

        $activityLogger->logFromRequest(
            $request,
            'user_design_deleted',
            'User saved design deleted',
            "Deleted saved design '{$designLabel}' for '{$user->email}'",
            [
                'icon' => 'user',
                ...$context,
                'metadata' => [
                    'target_user_id' => $user->id,
                    'design_id' => $design->id,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->whereNumber('designId')->name('admin.users.designs.delete');

    Route::delete('/users/{userId}/wishlist/{wishlistItemId}', function (Request $request, int $userId, int $wishlistItemId) {
        $user = User::query()->findOrFail($userId);
        $item = UserWishlistItem::query()->where('user_id', $user->id)->findOrFail($wishlistItemId);
        $activityLogger = app(AdminActivityLogService::class);
        $itemLabel = $item->name ?: "Wishlist item #{$item->id}";
        $context = $activityLogger->modelContext($item, $itemLabel);
        $item->delete();

        $activityLogger->logFromRequest(
            $request,
            'user_wishlist_item_deleted',
            'User wishlist item deleted',
            "Deleted wishlist item '{$itemLabel}' for '{$user->email}'",
            [
                'icon' => 'user',
                ...$context,
                'metadata' => [
                    'target_user_id' => $user->id,
                    'wishlist_item_id' => $item->id,
                ],
            ]
        );

        return response()->json(['success' => true]);
    })->whereNumber('userId')->whereNumber('wishlistItemId')->name('admin.users.wishlist.delete');

});

/*
|--------------------------------------------------------------------------
| DESIGN PAGE
|--------------------------------------------------------------------------
*/
Route::get('/design/{slug}', [DesignController::class, 'show'])->name('design.show');

/*
|--------------------------------------------------------------------------
| CHANGE PRODUCT MODAL
|--------------------------------------------------------------------------
*/
Route::get('/design/change-product/{product}', [DesignController::class, 'changeProduct'])
     ->name('design.changeProduct');

Route::middleware('auth')->group(function () {
    Route::post('/design/saved', [SavedDesignController::class, 'store'])->name('design.saved.store');
    Route::patch('/design/saved/{savedDesign}/rename', [SavedDesignController::class, 'rename'])->name('design.saved.rename');
    Route::delete('/design/saved/{savedDesign}', [SavedDesignController::class, 'destroy'])->name('design.saved.destroy');
});

/*
|--------------------------------------------------------------------------
| CATEGORY PRODUCTS PAGE
|--------------------------------------------------------------------------
*/
Route::get('/category-products/{slug}', [ProductController::class, 'categoryProducts'])
     ->name('category.products');

// -- Sign in with google / apple (OAuth)
Route::get('/auth/google', [OAuthController::class, 'redirectToGoogle'])->name('auth.google');
Route::get('/auth/google/callback', [OAuthController::class, 'handleGoogleCallback']);

Route::get('/auth/facebook', [OAuthController::class, 'redirectToFacebook'])->name('auth.facebook');
Route::get('/auth/facebook/callback', [OAuthController::class, 'handleFacebookCallback']);

Route::get('/auth/apple', [OAuthController::class, 'redirectToApple'])->name('auth.apple');
Route::get('/auth/apple/callback', [OAuthController::class, 'handleAppleCallback']);


Route::post('/check-email', [AuthController::class, 'checkEmail']);

Route::post('/oauth/send-code', [EmailVerificationController::class, 'sendCode']);
Route::post('/oauth/verify-code', [EmailVerificationController::class, 'verifyCode']);
Route::post('/oauth/resend-code', [EmailVerificationController::class, 'resendCode']);
