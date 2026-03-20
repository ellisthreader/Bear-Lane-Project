<?php

namespace App\Services\Stripe;

use App\Models\User;
use App\Models\UserPaymentMethod;
use Illuminate\Support\Facades\Schema;
use Stripe\Customer;
use Stripe\Exception\InvalidRequestException;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod;

class StripeWalletService
{
    public function ensureStripeCustomer(User $user): ?string
    {
        if (!Schema::hasColumn('users', 'stripe_customer_id')) {
            return null;
        }

        StripeConfiguration::configure();

        if (!empty($user->stripe_customer_id)) {
            $existingCustomerId = (string) $user->stripe_customer_id;
            try {
                Customer::retrieve($existingCustomerId);
                return $existingCustomerId;
            } catch (InvalidRequestException $e) {
                if (!$this->isMissingCustomerException($e)) {
                    throw $e;
                }

                // Stored customer id is stale (deleted in Stripe). Clear and recreate.
                $user->stripe_customer_id = null;
                $user->save();
            }
        }

        $name = trim((string) ($user->name ?? ''));
        if ($name === '') {
            $name = trim((string) ($user->username ?? ''));
        }
        if ($name === '') {
            $name = 'Customer ' . $user->id;
        }

        $customer = Customer::create($this->buildCustomerPayload($user, $name));

        $user->stripe_customer_id = $customer->id;
        $user->save();

        return (string) $customer->id;
    }

    private function buildCustomerPayload(User $user, string $name): array
    {
        return [
            'email' => $user->email,
            'name' => $name,
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ];
    }

    private function isMissingCustomerException(InvalidRequestException $e): bool
    {
        $message = strtolower(trim((string) $e->getMessage()));
        return str_contains($message, 'no such customer');
    }

    public function persistPaymentMethodFromIntent(User $user, string $paymentIntentId, ?string $providerHint = null, string $cardholderName = ''): ?UserPaymentMethod
    {
        if ($paymentIntentId === '') {
            return null;
        }

        StripeConfiguration::configure();
        $intent = PaymentIntent::retrieve($paymentIntentId);
        $rawPaymentMethod = data_get($intent, 'payment_method');
        $paymentMethodId = is_string($rawPaymentMethod) ? $rawPaymentMethod : data_get($rawPaymentMethod, 'id');

        if (!$paymentMethodId) {
            return null;
        }

        $customerId = $this->ensureStripeCustomer($user);
        if (!$customerId) {
            return null;
        }

        $paymentMethod = PaymentMethod::retrieve((string) $paymentMethodId);
        if ((string) ($paymentMethod->customer ?? '') !== $customerId) {
            PaymentMethod::attach((string) $paymentMethodId, ['customer' => $customerId]);
            $paymentMethod = PaymentMethod::retrieve((string) $paymentMethodId);
        }

        $providerType = $this->resolveProviderType(
            (string) data_get($paymentMethod, 'type', ''),
            $providerHint
        );

        UserPaymentMethod::where('user_id', $user->id)->update(['is_default' => false]);

        return UserPaymentMethod::updateOrCreate(
            [
                'user_id' => $user->id,
                'stripe_payment_method_id' => (string) $paymentMethodId,
            ],
            [
                'provider_type' => $providerType,
                'brand' => (string) data_get($paymentMethod, 'card.brand', ''),
                'last4' => (string) data_get($paymentMethod, 'card.last4', ''),
                'exp_month' => data_get($paymentMethod, 'card.exp_month'),
                'exp_year' => data_get($paymentMethod, 'card.exp_year'),
                'cardholder_name' => $cardholderName !== '' ? $cardholderName : (string) data_get($paymentMethod, 'billing_details.name', ''),
                'is_active' => true,
                'is_default' => true,
            ]
        );
    }

    public function detachPaymentMethod(UserPaymentMethod $method): void
    {
        StripeConfiguration::configure();
        PaymentMethod::retrieve($method->stripe_payment_method_id)->detach();
    }

    public function resolveProviderType(string $stripeType, ?string $providerHint = null): string
    {
        $hint = strtolower(trim((string) $providerHint));
        if (in_array($hint, ['paypal', 'klarna'], true)) {
            return $hint;
        }

        $type = strtolower(trim($stripeType));
        if ($type === 'card') {
            return 'card';
        }
        if ($type === 'paypal') {
            return 'paypal';
        }
        if ($type === 'klarna') {
            return 'klarna';
        }

        if (in_array($hint, ['card', 'paypal', 'klarna'], true)) {
            return $hint;
        }

        return 'card';
    }
}
