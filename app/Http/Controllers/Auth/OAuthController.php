<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Order;
use App\Models\UserAddress;
use App\Models\UserPaymentMethod;
use App\Services\Stripe\StripeWalletService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Auth\Events\Registered;

class OAuthController extends Controller
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
            Log::info("Guest checkout data claimed for OAuth user", [
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
                Log::warning('Unable to sync guest payment method from order intent (oauth)', [
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

    private function oauthSuccessRedirect(Request $request): string
    {
        $target = $this->resolveRedirectPath($request->session()->pull('oauth_redirect', '/profile'));
        return $target;
    }

    private function completeOAuthLogin(Request $request, User $user, bool $created): RedirectResponse
    {
        Auth::login($user);
        $request->session()->regenerate();

        if (!$user->hasVerifiedEmail()) {
            if ($created) {
                event(new Registered($user));
                $user->sendEmailVerificationNotification();
            }

            // Force all newly signed-up OAuth users through verification flow first.
            $request->session()->forget('oauth_redirect');

            return redirect()->route('verification.notice');
        }

        return redirect($this->oauthSuccessRedirect($request));
    }

    // -------------------
    // Google
    // -------------------
    public function redirectToGoogle(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Google OAuth");
        return Socialite::driver('google')
            ->redirectUrl((string) config('services.google.redirect'))
            ->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        Log::info("Google OAuth callback triggered");

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
            Log::info("Google user data received", [
                'id' => $googleUser->getId(),
                'has_email' => filled($googleUser->getEmail()),
            ]);

            ['user' => $user, 'created' => $created] = $this->findOrCreateOAuthUser($googleUser, 'google');

            Log::info("User logged in via Google OAuth", [
                'id' => $user->id,
                'is_oauth' => $user->is_oauth,
            ]);

            return $this->completeOAuthLogin($request, $user, $created);
        } catch (\Exception $e) {
            Log::error("Google OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Google.']);
        }
    }

    // -------------------
    // Apple
    // -------------------
    public function redirectToApple(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Apple OAuth");
        return Socialite::driver('apple')
            ->redirectUrl((string) config('services.apple.redirect'))
            ->redirect();
    }

    public function handleAppleCallback(Request $request)
    {
        Log::info("Apple OAuth callback triggered");

        try {
            $appleUser = Socialite::driver('apple')->stateless()->user();
            Log::info("Apple user data received", [
                'id' => $appleUser->getId(),
                'has_email' => filled($appleUser->getEmail()),
            ]);

            ['user' => $user, 'created' => $created] = $this->findOrCreateOAuthUser($appleUser, 'apple');

            Log::info("User logged in via Apple OAuth", [
                'id' => $user->id,
                'is_oauth' => $user->is_oauth,
            ]);

            return $this->completeOAuthLogin($request, $user, $created);
        } catch (\Exception $e) {
            Log::error("Apple OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Apple.']);
        }
    }

    // -------------------
    // Facebook
    // -------------------
    public function redirectToFacebook(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Facebook OAuth");
        return Socialite::driver('facebook')
            ->redirectUrl((string) config('services.facebook.redirect'))
            ->redirect();
    }

    public function handleFacebookCallback(Request $request)
    {
        Log::info("Facebook OAuth callback triggered");

        try {
            $facebookUser = Socialite::driver('facebook')->stateless()->user();
            Log::info("Facebook user data received", [
                'id' => $facebookUser->getId(),
                'has_email' => filled($facebookUser->getEmail()),
            ]);

            ['user' => $user, 'created' => $created] = $this->findOrCreateOAuthUser($facebookUser, 'facebook');
            Log::info("User logged in via Facebook OAuth", [
                'id' => $user->id,
                'is_oauth' => $user->is_oauth,
            ]);

            return $this->completeOAuthLogin($request, $user, $created);
        } catch (\Exception $e) {
            Log::error("Facebook OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Facebook.']);
        }
    }

    // -------------------
    // Helper: Find or create user via OAuth
    // -------------------
    private function findOrCreateOAuthUser($oauthUser, string $provider): array
    {
        Log::info("findOrCreateOAuthUser called", [
            'provider' => $provider,
            'has_email' => filled($oauthUser->getEmail()),
        ]);

        $user = User::where('email', $oauthUser->getEmail())->first();

        if ($user) {
            $provider = strtolower(trim($provider));
            if (!$user->is_oauth || ($user->oauth_provider ?? null) !== $provider) {
                $user->is_oauth = true;
                $user->oauth_provider = $provider;
                $user->save();
                Log::info("Existing user marked as OAuth", [
                    'id' => $user->id,
                    'is_oauth' => $user->is_oauth,
                    'oauth_provider' => $user->oauth_provider,
                ]);
            }
            $this->claimGuestCheckoutData($user);
            return ['user' => $user, 'created' => false];
        }

        // Generate unique username from email
        $baseUsername = Str::slug(explode('@', $oauthUser->getEmail())[0]);
        $username = $baseUsername;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Create new OAuth user
        $user = User::create([
            'username' => $username,
            'email'    => $oauthUser->getEmail(),
            'password' => bcrypt(Str::random(16)), // random password
            'is_oauth' => true,
            'oauth_provider' => strtolower(trim($provider)),
        ]);

        Log::info("New OAuth user created", [
            'id' => $user->id,
            'is_oauth' => $user->is_oauth,
            'oauth_provider' => $user->oauth_provider,
        ]);

        $this->claimGuestCheckoutData($user);
        return ['user' => $user, 'created' => true];
    }
}
