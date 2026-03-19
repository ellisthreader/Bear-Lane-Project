<?php

namespace App\Http\Controllers;

use App\Models\UserAddress;
use App\Models\UserPaymentMethod;
use App\Models\User;
use App\Models\Order;
use App\Services\Stripe\StripeConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\PaymentMethod;
use Stripe\SetupIntent;
use Stripe\Customer;

class SavedCheckoutController extends Controller
{
    public function addressBookPage(Request $request): Response
    {
        return Inertia::render('Profile/AddressBookPage', [
            'auth' => [
                'user' => $this->mapUserForFrontend($request->user()),
            ],
        ]);
    }

    public function paymentMethodsPage(Request $request): Response
    {
        return Inertia::render('Profile/PaymentMethodsPage', [
            'auth' => [
                'user' => $this->mapUserForFrontend($request->user()),
            ],
        ]);
    }

    private function mapUserForFrontend(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'is_admin' => (bool) ($user->is_admin ?? false),
            'avatar_url' => $user->avatar_url ?? $user->avatar ?? '/images/default-avatar.png',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $addresses = UserAddress::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->latest('updated_at')
            ->get();

        if ($addresses->isEmpty()) {
            $latestOrderAddress = Order::where('user_id', $user->id)
                ->whereNotNull('first_name')
                ->whereNotNull('last_name')
                ->whereNotNull('address_line1')
                ->whereNotNull('city')
                ->whereNotNull('postcode')
                ->whereNotNull('country')
                ->latest('created_at')
                ->first();

            if ($latestOrderAddress) {
                $addresses = collect([
                    new UserAddress([
                        'id' => -1,
                        'label' => 'Last delivery address',
                        'first_name' => (string) $latestOrderAddress->first_name,
                        'last_name' => (string) $latestOrderAddress->last_name,
                        'phone' => $latestOrderAddress->phone,
                        'country' => (string) $latestOrderAddress->country,
                        'address_line1' => (string) $latestOrderAddress->address_line1,
                        'address_line2' => $latestOrderAddress->address_line2,
                        'city' => (string) $latestOrderAddress->city,
                        'county' => null,
                        'postcode' => (string) $latestOrderAddress->postcode,
                        'is_default' => true,
                    ]),
                ]);
            }
        }

        $paymentMethods = UserPaymentMethod::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->latest('updated_at')
            ->get();

        return response()->json([
            'addresses' => $addresses->map(fn (UserAddress $address) => $this->mapAddress($address))->values(),
            'payment_methods' => $paymentMethods->map(fn (UserPaymentMethod $method) => $this->mapPaymentMethod($method))->values(),
            'defaults' => [
                'address_id' => optional($addresses->firstWhere('is_default', true))->id,
                'payment_method_id' => optional($paymentMethods->firstWhere('is_default', true))->id,
            ],
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
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
            'is_default' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $forceDefault = (bool) ($validated['is_default'] ?? false);
        $hasExisting = UserAddress::where('user_id', $user->id)->exists();

        if ($forceDefault || !$hasExisting) {
            UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
            $validated['is_default'] = true;
        } else {
            $validated['is_default'] = false;
        }

        $address = UserAddress::create([
            ...$validated,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'address' => $this->mapAddress($address),
        ]);
    }

    public function updateAddress(Request $request, int $addressId): JsonResponse
    {
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

        $user = $request->user();
        $address = UserAddress::where('user_id', $user->id)->findOrFail($addressId);
        $address->update($validated);

        return response()->json([
            'success' => true,
            'address' => $this->mapAddress($address->fresh()),
        ]);
    }

    public function deleteAddress(Request $request, int $addressId): JsonResponse
    {
        $user = $request->user();
        $address = UserAddress::where('user_id', $user->id)->findOrFail($addressId);
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $next = UserAddress::where('user_id', $user->id)->latest('updated_at')->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json(['success' => true]);
    }

    public function setDefaultAddress(Request $request, int $addressId): JsonResponse
    {
        $user = $request->user();
        $address = UserAddress::where('user_id', $user->id)->findOrFail($addressId);

        UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'address' => $this->mapAddress($address->fresh()),
        ]);
    }

    public function createPaymentMethodSetupIntent(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            StripeConfiguration::configure();
            $customerId = $this->ensureStripeCustomer($user);
            if (!$customerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to start secure card setup right now.',
                ], 422);
            }

            $intent = SetupIntent::create([
                'customer' => $customerId,
                'payment_method_types' => ['card'],
                'usage' => 'off_session',
            ]);

            return response()->json([
                'success' => true,
                'client_secret' => $intent->client_secret,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to start secure card setup right now.',
            ], 422);
        }
    }

    public function storePaymentMethod(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method_id' => 'required|string|max:255',
            'cardholder_name' => 'required|string|max:255',
            'make_default' => 'nullable|boolean',
        ]);

        $user = $request->user();

        try {
            StripeConfiguration::configure();

            $customerId = $this->ensureStripeCustomer($user);
            if (!$customerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to save card right now.',
                ], 422);
            }

            $paymentMethodId = (string) $validated['payment_method_id'];
            $paymentMethod = PaymentMethod::retrieve($paymentMethodId);

            if ((string) ($paymentMethod->customer ?? '') !== $customerId) {
                PaymentMethod::attach($paymentMethodId, ['customer' => $customerId]);
                $paymentMethod = PaymentMethod::retrieve($paymentMethodId);
            }

            if ((string) data_get($paymentMethod, 'type') !== 'card') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only credit/debit cards are supported.',
                ], 422);
            }

            $existingDefault = UserPaymentMethod::where('user_id', $user->id)
                ->where('is_active', true)
                ->where('is_default', true)
                ->exists();

            $makeDefault = (bool) ($validated['make_default'] ?? false) || !$existingDefault;
            if ($makeDefault) {
                UserPaymentMethod::where('user_id', $user->id)->update(['is_default' => false]);
            }

            $method = UserPaymentMethod::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'stripe_payment_method_id' => $paymentMethodId,
                ],
                [
                    'provider_type' => 'card',
                    'brand' => (string) data_get($paymentMethod, 'card.brand', ''),
                    'last4' => (string) data_get($paymentMethod, 'card.last4', ''),
                    'exp_month' => data_get($paymentMethod, 'card.exp_month'),
                    'exp_year' => data_get($paymentMethod, 'card.exp_year'),
                    'cardholder_name' => (string) $validated['cardholder_name'],
                    'is_active' => true,
                    'is_default' => $makeDefault,
                ]
            );

            return response()->json([
                'success' => true,
                'payment_method' => $this->mapPaymentMethod($method->fresh()),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to save card right now.',
            ], 422);
        }
    }

    public function deletePaymentMethod(Request $request, int $paymentMethodId): JsonResponse
    {
        $user = $request->user();
        $method = UserPaymentMethod::where('user_id', $user->id)->where('is_active', true)->findOrFail($paymentMethodId);
        $wasDefault = $method->is_default;

        StripeConfiguration::configure();

        try {
            PaymentMethod::retrieve($method->stripe_payment_method_id)->detach();
        } catch (\Throwable $e) {
            // Continue and mark inactive locally even if Stripe detach fails.
        }

        $method->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        if ($wasDefault) {
            $next = UserPaymentMethod::where('user_id', $user->id)
                ->where('is_active', true)
                ->latest('updated_at')
                ->first();

            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json(['success' => true]);
    }

    public function setDefaultPaymentMethod(Request $request, int $paymentMethodId): JsonResponse
    {
        $user = $request->user();
        $method = UserPaymentMethod::where('user_id', $user->id)->where('is_active', true)->findOrFail($paymentMethodId);

        UserPaymentMethod::where('user_id', $user->id)->update(['is_default' => false]);
        $method->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'payment_method' => $this->mapPaymentMethod($method->fresh()),
        ]);
    }

    private function mapAddress(UserAddress $address): array
    {
        return [
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
        ];
    }

    private function mapPaymentMethod(UserPaymentMethod $method): array
    {
        return [
            'id' => $method->id,
            'stripe_payment_method_id' => $method->stripe_payment_method_id,
            'provider_type' => $method->provider_type ?: 'card',
            'brand' => $method->brand,
            'last4' => $method->last4,
            'exp_month' => $method->exp_month,
            'exp_year' => $method->exp_year,
            'cardholder_name' => $method->cardholder_name,
            'is_default' => (bool) $method->is_default,
            'is_active' => (bool) $method->is_active,
        ];
    }

    private function ensureStripeCustomer(User $user): ?string
    {
        if (!Schema::hasColumn('users', 'stripe_customer_id')) {
            return null;
        }

        if (!empty($user->stripe_customer_id)) {
            return (string) $user->stripe_customer_id;
        }

        $name = trim((string) ($user->name ?? ''));
        if ($name === '') {
            $name = trim((string) ($user->username ?? ''));
        }
        if ($name === '') {
            $name = 'Customer ' . $user->id;
        }

        $customer = Customer::create([
            'email' => $user->email,
            'name' => $name,
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ]);

        $user->stripe_customer_id = $customer->id;
        $user->save();

        return (string) $customer->id;
    }
}
