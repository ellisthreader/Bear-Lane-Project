<?php

namespace App\Services\Stripe;

use InvalidArgumentException;
use Stripe\Stripe;

final class StripeConfiguration
{
    private const MODE_LIVE = 'live';
    private const MODE_TEST = 'test';

    public static function configure(): string
    {
        $secret = self::validatedSecretKey();
        Stripe::setApiKey($secret);

        return $secret;
    }

    public static function validatedSecretKey(): string
    {
        $mode = self::normalizedMode((string) config('services.stripe.mode', self::MODE_LIVE));
        $secret = trim((string) config('services.stripe.secret', ''));

        if ($secret === '') {
            throw new InvalidArgumentException('Stripe secret key is missing in server configuration.');
        }

        self::assertModeCompatibleKey($secret, $mode, 'secret');

        return $secret;
    }

    private static function normalizedMode(string $mode): string
    {
        $normalized = strtolower(trim($mode));
        if (in_array($normalized, [self::MODE_LIVE, self::MODE_TEST], true)) {
            return $normalized;
        }

        throw new InvalidArgumentException("Invalid STRIPE_MODE '{$mode}'. Use 'live' or 'test'.");
    }

    private static function assertModeCompatibleKey(string $key, string $mode, string $keyType): void
    {
        $expectedPrefix = $keyType === 'secret'
            ? ($mode === self::MODE_LIVE ? 'sk_live_' : 'sk_test_')
            : ($mode === self::MODE_LIVE ? 'pk_live_' : 'pk_test_');

        if (!str_starts_with($key, $expectedPrefix)) {
            throw new InvalidArgumentException(
                "Stripe {$keyType} key does not match STRIPE_MODE={$mode}. Expected prefix: {$expectedPrefix}"
            );
        }
    }
}
