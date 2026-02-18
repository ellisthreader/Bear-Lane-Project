<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Product;
use App\Models\Category;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\LiveChatController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\DesignController;
use App\Http\Controllers\ProductSearchController;
use App\Http\Controllers\Auth\OAuthController;

/*
|--------------------------------------------------------------------------
| MENU API
|--------------------------------------------------------------------------
*/
Route::get('/menu/categories', function () {
    $mainCategories = ['women', 'men', 'kids', 'sale'];
    $response = [];

    foreach ($mainCategories as $main) {
        $root = Category::where('slug', $main)->first();

        if (!$root) {
            $response[$main] = [
                'topLevel'      => [['title' => ucfirst($main)]],
                'links'         => [],
                'subcategories' => [],
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
    $products = Product::where('is_trending', true)->get();
    return Inertia::render('Welcome/Welcome', [
        'products'    => $products,
        'canLogin'    => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
})->name('home');

Route::get('/projects', fn() => Inertia::render('Projects/Projects'))->name('projects');
Route::get('/courses', fn() => Inertia::render('Courses/Index'))->name('courses');
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
     ->where('slug', '[A-Za-z0-9-]+')
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
});

Route::get('/order-latest', [CheckoutController::class, 'latestOrder'])->name('order.latest');

/*
|--------------------------------------------------------------------------
| STRIPE
|--------------------------------------------------------------------------
*/
Route::post('/create-payment-intent', [CheckoutController::class, 'createPaymentIntent']);
Route::post('/checkout/store-order', [CheckoutController::class, 'storeOrder'])->name('checkout.store');

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
Route::middleware('auth')->group(function () {
    // Profile page
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index'); 
    // Edit profile page
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    // Update profile
    Route::post('/profile/update', [ProfileController::class, 'update'])->name('profile.update');
    // Generate avatar
    Route::post('/profile/generate-avatar', [ProfileController::class, 'generateRandomAvatar'])->name('profile.generate-avatar');
    // Delete account
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| EMAIL VERIFICATION
|--------------------------------------------------------------------------
*/
Route::get('/email/verify', fn() => Inertia::render('Auth/VerifyEmail'))
    ->middleware('auth')
    ->name('verification.notice');

Route::get('/email/verify/{id}/{hash}', fn() =>
    redirect()->route('profile.edit')->with('verified', 1)
)->middleware(['auth', 'signed'])
 ->name('verification.verify');

Route::post('/email/verification-notification', fn(Request $request) =>
    $request->user()->update(['last_verification_sent_at' => now()])
)->middleware('auth')->name('verification.send');

/*
|--------------------------------------------------------------------------
| HELP / FAQ
|--------------------------------------------------------------------------
*/
Route::get('/help', fn() => Inertia::render('Help/HelpCentre'))->name('help');
Route::get('/help/orders', fn() => Inertia::render('Help/OrdersShipping'))->name('help.orders');
Route::get('/help/returns', fn() => Inertia::render('Help/ReturnsRefunds'))->name('help.returns');
Route::get('/help/account', fn() => Inertia::render('Help/AccountManagement'))->name('help.account');
Route::get('/help/payments', fn() => Inertia::render('Help/PaymentsBilling'))->name('help.payments');
Route::get('/help/technical', fn() => Inertia::render('Help/TechnicalSupport'))->name('help.technical');
Route::get('/help/privacy', fn() => Inertia::render('Help/PrivacySecurity'))->name('help.privacy');
Route::get('/support', fn() => Inertia::render('Help/Support'))->name('support');
Route::get('/faq', fn() => Inertia::render('Help/FAQ'))->name('faq');
Route::get('/help/livechat', fn() => Inertia::render('Help/Livechat'))->name('help.livechat');

Route::get('/livechat/messages', [LiveChatController::class, 'fetchMessages'])->name('livechat.messages');
Route::post('/livechat/message', [LiveChatController::class, 'sendMessage'])->name('livechat.send');
Route::delete('/livechat/{chat}', [LiveChatController::class, 'deleteChat'])->name('livechat.delete');

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
Route::middleware(['auth'])->prefix('admin')->group(function () {
    Route::get('/dashboard', fn() => inertia('Admin/AdminDashboard'))->name('admin.dashboard');
    Route::get('/statistics', fn() => inertia('Admin/Statistics'))->name('admin.statistics');
    Route::get('/products', [AdminProductController::class, 'index'])->name('admin.products');
    Route::post('/categories', [AdminProductController::class, 'storeCategory']);
    Route::delete('/categories/{category}', [AdminProductController::class, 'deleteCategory']);
    Route::get('/users', fn() => inertia('Admin/Users'))->name('admin.users');
    Route::get('/livechats', fn() => inertia('Admin/LiveChats'))->name('admin.livechats');
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

Route::get('/auth/apple', [OAuthController::class, 'redirectToApple'])->name('auth.apple');
Route::get('/auth/apple/callback', [OAuthController::class, 'handleAppleCallback']);

Route::post('/check-email', [AuthController::class, 'checkEmail']);
