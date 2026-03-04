<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Events\Registered;
use App\Models\User;
use App\Models\Order;
use App\Models\UserAddress;
use App\Models\UserPaymentMethod;
use App\Services\Stripe\StripeWalletService;
use Illuminate\Support\Facades\Schema;

class AuthController extends Controller
{
private function claimGuestCheckoutData(User $user): void
{
    $normalizedEmail = strtolower(trim((string) $user->email));
    if ($normalizedEmail === '') {
        return;
    }

    $claimedCount = Order::whereNull('user_id')
        ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
        ->update(['user_id' => $user->id]);

    $latestOrder = Order::where('user_id', $user->id)
        ->orderByDesc('created_at')
        ->first();

    if ($latestOrder) {
        $updates = [];

        if (empty($user->name)) {
            $fullName = trim((string) (($latestOrder->first_name ?? '') . ' ' . ($latestOrder->last_name ?? '')));
            if ($fullName !== '') {
                $updates['name'] = $fullName;
            }
        }

        if (empty($user->phone) && !empty($latestOrder->phone)) {
            $updates['phone'] = $latestOrder->phone;
        }

        if (!empty($updates)) {
            $user->fill($updates);
            $user->save();
        }
    }

    if ($claimedCount > 0) {
        Log::info('Guest checkout data claimed for user', [
            'user_id' => $user->id,
            'email' => $user->email,
            'orders_claimed' => $claimedCount,
        ]);
    }

    $this->syncSavedAddressesFromOrders($user);
    $this->syncSavedPaymentMethodsFromOrders($user);
}

private function syncSavedAddressesFromOrders(User $user): void
{
    if (!Schema::hasTable('user_addresses')) {
        return;
    }

    $orders = Order::where('user_id', $user->id)
        ->whereNotNull('first_name')
        ->whereNotNull('last_name')
        ->whereNotNull('address_line1')
        ->whereNotNull('city')
        ->whereNotNull('postcode')
        ->whereNotNull('country')
        ->orderByDesc('created_at')
        ->get();

    if ($orders->isEmpty()) {
        return;
    }

    $existing = UserAddress::where('user_id', $user->id)->get();
    $existingByKey = [];

    foreach ($existing as $entry) {
        $existingByKey[$this->addressKey([
            'first_name' => $entry->first_name,
            'last_name' => $entry->last_name,
            'address_line1' => $entry->address_line1,
            'city' => $entry->city,
            'postcode' => $entry->postcode,
            'country' => $entry->country,
        ])] = $entry;
    }

    $createdOrUpdatedIds = [];
    $seenKeys = [];

    foreach ($orders as $order) {
        $payload = [
            'first_name' => (string) $order->first_name,
            'last_name' => (string) $order->last_name,
            'phone' => $order->phone,
            'country' => (string) $order->country,
            'address_line1' => (string) $order->address_line1,
            'address_line2' => $order->address_line2,
            'city' => (string) $order->city,
            'county' => null,
            'postcode' => (string) $order->postcode,
        ];

        $key = $this->addressKey($payload);
        if (isset($seenKeys[$key])) {
            continue;
        }
        $seenKeys[$key] = true;

        if (isset($existingByKey[$key])) {
            $existingByKey[$key]->update([
                'phone' => $payload['phone'],
                'address_line2' => $payload['address_line2'],
                'county' => $payload['county'],
            ]);
            $createdOrUpdatedIds[] = $existingByKey[$key]->id;
            continue;
        }

        $created = UserAddress::create([
            'user_id' => $user->id,
            'label' => 'Checkout address',
            ...$payload,
            'is_default' => false,
        ]);
        $createdOrUpdatedIds[] = $created->id;
        $existingByKey[$key] = $created;
    }

    if (count($createdOrUpdatedIds) === 0) {
        return;
    }

    UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
    UserAddress::where('id', $createdOrUpdatedIds[0])->update(['is_default' => true]);
}

private function addressKey(array $payload): string
{
    return implode('|', [
        strtolower(trim((string) ($payload['first_name'] ?? ''))),
        strtolower(trim((string) ($payload['last_name'] ?? ''))),
        strtolower(trim((string) ($payload['address_line1'] ?? ''))),
        strtolower(trim((string) ($payload['city'] ?? ''))),
        strtolower(trim((string) ($payload['postcode'] ?? ''))),
        strtolower(trim((string) ($payload['country'] ?? ''))),
    ]);
}

private function syncSavedPaymentMethodsFromOrders(User $user): void
{
    if (!Schema::hasTable('user_payment_methods')) {
        return;
    }

    /** @var StripeWalletService $walletService */
    $walletService = app(StripeWalletService::class);
    $originalDefaultId = UserPaymentMethod::where('user_id', $user->id)
        ->where('is_active', true)
        ->where('is_default', true)
        ->value('id');

    $orders = Order::where('user_id', $user->id)
        ->whereNotNull('payment_intent_id')
        ->orderBy('created_at')
        ->get(['payment_intent_id', 'first_name', 'last_name']);

    $seenIntents = [];

    foreach ($orders as $order) {
        $paymentIntentId = trim((string) ($order->payment_intent_id ?? ''));
        if ($paymentIntentId === '' || isset($seenIntents[$paymentIntentId])) {
            continue;
        }
        $seenIntents[$paymentIntentId] = true;

        $cardholderName = trim((string) (($order->first_name ?? '') . ' ' . ($order->last_name ?? '')));

        try {
            $walletService->persistPaymentMethodFromIntent(
                $user,
                $paymentIntentId,
                null,
                $cardholderName
            );
        } catch (\Throwable $e) {
            Log::warning('Unable to sync guest payment method from order intent', [
                'user_id' => $user->id,
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    if ($originalDefaultId) {
        $stillExists = UserPaymentMethod::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('id', $originalDefaultId)
            ->exists();

        if ($stillExists) {
            UserPaymentMethod::where('user_id', $user->id)->update(['is_default' => false]);
            UserPaymentMethod::where('id', $originalDefaultId)->update(['is_default' => true]);
        }
    }
}

private function resolveRedirectPath(?string $redirect, string $fallback = '/profile'): string
{
    $target = trim((string) $redirect);
    if ($target === '' || !str_starts_with($target, '/')) {
        return $fallback;
    }
    return $target;
}

// -----------------------
// REGISTER
// -----------------------
public function register(Request $request)
{
    $request->validate([
        'username' => ['required', 'string', 'max:255', 'unique:users,username'],
        'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ], [
        'username.unique' => 'Username already exists',
        'password.confirmed' => 'Passwords do not match',
    ]);

    $user = User::create([
        'username' => $request->username,
        'email'    => $request->email,
        'password' => Hash::make($request->password),
    ]);

    Auth::login($user);
    $this->claimGuestCheckoutData($user);

    try {
        // Fire registered event (important for email verification)
        event(new Registered($user));

        // Explicitly send verification email (safe even with event)
        $user->sendEmailVerificationNotification();
    } catch (\Throwable $e) {
        Log::error('Signup verification email failed', [
            'user_id' => $user->id,
            'email' => $user->email,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => true,
            'redirect' => route('verification.notice'),
            'warning' => 'Account created, but we could not send the verification email right now.',
        ]);
    }

    return response()->json([
        'success' => true,
        'redirect' => route('verification.notice'),
    ]);
}


    // -----------------------
    // LOGIN
    // -----------------------
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            'redirect' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        // Block OAuth users from password login
        if ($user && $user->is_oauth) {
            $provider = ucfirst($user->oauth_provider ?? 'Google');

            return back()->withErrors([
                'email' => "This email is linked to {$provider} login. Please use the {$provider} button."
            ])->onlyInput('email');
        }

        if (Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {

            $request->session()->regenerate();
            $this->claimGuestCheckoutData(Auth::user());
            $redirectPath = $this->resolveRedirectPath($request->input('redirect'));

            if (Auth::user()->is_admin) {
                return redirect('/admin/dashboard');
            }

            return redirect()->intended($redirectPath);
        }

        return back()->withErrors([
            'email' => 'Incorrect email or password.'
        ])->onlyInput('email');
    }

    // -----------------------
    // LOGOUT
    // -----------------------
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    // -----------------------
    // CHECK EMAIL (for frontend step logic)
    // -----------------------
    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        $exists = (bool) $user;
        $oauth = $user && $user->is_oauth
            ? ($user->oauth_provider ?? 'Google')
            : null;

        $suggestions = [];

        if ($exists) {
            $prefix = explode('@', $request->email)[0];
            for ($i = 1; $i <= 3; $i++) {
                $suggestions[] = $prefix . $i;
            }
        }

        return response()->json([
            'exists' => $exists,
            'oauth' => $oauth,
            'suggestions' => $suggestions,
        ]);
    }

    // -----------------------
    // FORGOT PASSWORD
    // -----------------------
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $request->email)->first();

        if ($user && $user->is_oauth) {
            $provider = ucfirst($user->oauth_provider ?? 'Google');

            return back()->withErrors([
                'email' => "This email is linked to {$provider} login."
            ]);
        }

        \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', 'Reset link sent successfully.')
            : back()->withErrors(['email' => __($status)]);
    }

    // -----------------------
    // RESET PASSWORD
    // -----------------------
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user && $user->is_oauth) {
            return back()->withErrors([
                'email' => 'This account uses OAuth login.'
            ]);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', 'Password reset successful.')
            : back()->withErrors(['email' => 'Invalid or expired link.']);
    }
}
