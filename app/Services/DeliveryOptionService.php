<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Builds the delivery options offered at checkout.
 *
 * Every method, carrier and price comes from the admin "Delivery & Carriers"
 * settings (StoreSettingsService::getDeliverySettings) so the business can add,
 * remove and re-price delivery services without a deploy. Live carrier rates
 * from Shippo are still consulted to pick a named service for each method and,
 * when a method is set to "live" pricing, to charge the carrier's rate.
 */
class DeliveryOptionService
{
    public function __construct(
        private readonly DeliverySlotService $slotService,
        private readonly ShippoRateService $shippoRateService,
        private readonly UkDeliveryDateService $ukDeliveryDateService,
        private readonly ParcelEstimatorService $parcelEstimatorService,
        private readonly StoreSettingsService $settings,
    )
    {
    }

    public function getOptions(
        ?User $user = null,
        ?string $postcode = null,
        ?string $country = null,
        ?string $city = null,
        ?string $street1 = null,
        ?array $cartItems = null,
    ): array
    {
        $isMember = (bool) data_get($user, 'is_member', false);
        $now = now();
        $nextDayDate = $now->copy()->addDay();

        $methods = $this->settings->getEnabledDeliveryMethods();
        $carriers = $this->settings->getEnabledCarriers();
        $rates = $this->fetchNormalizedRates($postcode, $country, $city, $street1, $cartItems ?? [], $carriers);

        $timedAvailable = null;
        $options = [];

        foreach ($methods as $method) {
            $kind = $method['kind'];
            $selectedRate = $this->selectRateForMethod($method, $rates, $carriers);
            $available = true;
            $unavailableReason = null;

            if ($kind === 'next_day') {
                $cutoffHour = (int) ($method['cutoff_hour'] ?? 22);
                $allowedByWindow = (int) $now->format('H') < $cutoffHour
                    && (int) $nextDayDate->dayOfWeek !== Carbon::SUNDAY;
                $hasService = $selectedRate !== null;

                if (!$allowedByWindow) {
                    $available = false;
                    $unavailableReason = sprintf(
                        '%s is unavailable after %d:00 or for Sunday delivery.',
                        $method['label'],
                        $cutoffHour
                    );
                } elseif (!empty($method['require_carrier_service']) && !$hasService) {
                    $available = false;
                    $unavailableReason = sprintf(
                        '%s is unavailable because no approved next-day carrier service is available for this address.',
                        $method['label']
                    );
                }
            } elseif ($kind === 'timed') {
                if ($timedAvailable === null) {
                    $timedAvailable = $this->hasTimedAvailability($postcode);
                }
                $available = $timedAvailable;
                $unavailableReason = $available ? null : 'No timed slots are currently available.';
                // Timed delivery is priced per slot, never from a live rate.
                $selectedRate = $this->selectTimedRate($rates);
            } elseif ($kind === 'standard' && !empty($method['require_carrier_service']) && $selectedRate === null) {
                $available = false;
                $unavailableReason = sprintf('%s is unavailable for this address.', $method['label']);
            }

            $options[] = $this->buildOption($method, $available, $isMember, $unavailableReason, $selectedRate, $carriers);
        }

        $result = [
            'is_member' => $isMember,
            'options' => $options,
        ];

        Log::info('DeliveryOptionService: Final delivery option availability for address', [
            'destination' => [
                'postcode' => $postcode,
                'country' => strtoupper($country ?: 'GB'),
                'city' => $city ?: 'London',
                'street1' => $street1 ?: 'Address pending',
            ],
            'options' => array_map(function (array $option) {
                return [
                    'type' => $option['type'],
                    'available' => $option['available'],
                    'price' => $option['price'],
                    'display_price' => $option['display_price'],
                    'service' => $option['selected_shippo_service'] ?? null,
                    'unavailable_reason' => $option['unavailable_reason'] ?? null,
                ];
            }, $result['options']),
        ]);

        return $result;
    }

    /**
     * Keys of every configured method (enabled or not) so stored orders keep validating.
     *
     * @return array<int, string>
     */
    public function methodKeys(): array
    {
        return array_values(array_map(
            fn (array $method) => (string) $method['key'],
            $this->settings->getDeliverySettings()['methods']
        ));
    }

    public function findMethod(string $deliveryType): ?array
    {
        $normalized = strtoupper(trim($deliveryType));
        foreach ($this->settings->getDeliverySettings()['methods'] as $method) {
            if (strtoupper((string) $method['key']) === $normalized) {
                return $method;
            }
        }

        return null;
    }

    public function resolvePrice(string $deliveryType, ?User $user = null): float
    {
        $method = $this->findMethod($deliveryType);
        $isMember = (bool) data_get($user, 'is_member', false);

        if (!$method) {
            $pricing = config('delivery.pricing', []);
            $basePrice = (float) ($pricing[strtoupper(trim($deliveryType))] ?? 0);

            return $isMember ? 0.0 : $basePrice;
        }

        if ($isMember && !empty($method['free_for_members'])) {
            return 0.0;
        }

        return (float) $method['price'];
    }

    public function resolveSelectedServiceName(
        string $deliveryType,
        ?User $user = null,
        ?string $postcode = null,
        ?string $country = null,
        ?string $city = null,
        ?string $street1 = null,
        ?array $cartItems = null,
    ): ?string
    {
        $normalizedType = strtoupper(trim($deliveryType));
        $optionsPayload = $this->getOptions($user, $postcode, $country, $city, $street1, $cartItems ?? []);
        $options = $optionsPayload['options'] ?? [];

        foreach ($options as $option) {
            if (strtoupper((string) ($option['type'] ?? '')) !== $normalizedType) {
                continue;
            }

            $service = trim((string) ($option['selected_shippo_service'] ?? ''));
            if ($service !== '') {
                return $service;
            }

            if (($option['kind'] ?? '') === 'timed') {
                return 'Timed Delivery Service';
            }

            $carrierName = trim((string) ($option['carrier_name'] ?? ''));
            if ($carrierName !== '') {
                return $carrierName;
            }

            return null;
        }

        return null;
    }

    private function hasTimedAvailability(?string $postcode = null): bool
    {
        $days = $this->slotService->getAvailableSlots($postcode);

        foreach ($days as $day) {
            $slots = $day['slots'] ?? [];
            foreach ($slots as $slot) {
                if (!empty($slot['available'])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $method
     * @param array<int, array<string, mixed>> $carriers
     */
    private function buildOption(
        array $method,
        bool $available,
        bool $isMember,
        ?string $unavailableReason,
        ?array $selectedRate,
        array $carriers,
    ): array {
        $basePrice = (float) $method['price'];
        $liveAmount = $selectedRate !== null && is_finite((float) ($selectedRate['amount'] ?? INF))
            ? (float) $selectedRate['amount']
            : null;
        $effectivePrice = $method['price_mode'] === 'live' && $liveAmount !== null && $method['kind'] !== 'timed'
            ? $liveAmount
            : $basePrice;
        $freeForMember = $isMember && !empty($method['free_for_members']);
        $price = $freeForMember ? 0.0 : round($effectivePrice, 2);

        $carrierName = null;
        if ($selectedRate !== null) {
            $carrierName = $selectedRate['carrier_name'] ?? null;
        }
        if ($carrierName === null && $method['carrier_key'] !== '') {
            foreach ($carriers as $carrier) {
                if ($carrier['key'] === $method['carrier_key']) {
                    $carrierName = $carrier['name'];
                    break;
                }
            }
        }

        return [
            'type' => $method['key'],
            'kind' => $method['kind'],
            'label' => $method['label'],
            'description' => $method['description'],
            'available' => $available,
            'price' => $price,
            'display_price' => $freeForMember
                ? 'Free with Membership'
                : ($price <= 0 ? 'Free' : '£' . number_format($price, 2)),
            'unavailable_reason' => $available ? null : $unavailableReason,
            'selected_shippo_service' => $selectedRate['service_name'] ?? null,
            'carrier_name' => $carrierName,
            'eta_min_days' => (int) $method['eta_min_days'],
            'eta_max_days' => (int) $method['eta_max_days'],
        ];
    }

    /**
     * Fetches Shippo rates once per request and normalises them with the matching carrier.
     *
     * @param array<int, array<string, mixed>> $carriers
     * @return array<int, array<string, mixed>>
     */
    private function fetchNormalizedRates(
        ?string $postcode,
        ?string $country,
        ?string $city,
        ?string $street1,
        array $cartItems,
        array $carriers,
    ): array {
        if (!$postcode || $carriers === []) {
            return [];
        }

        $fromAddress = [
            'name' => 'Bear Lane',
            'street1' => '390 Springfield Road',
            'city' => 'Chelmsford',
            'zip' => 'CM2 6AT',
            'country' => 'GB',
        ];

        $toAddress = [
            'name' => 'Checkout Customer',
            'street1' => $street1 ?: 'Address pending',
            'city' => $city ?: 'London',
            'zip' => $postcode,
            'country' => strtoupper($country ?: 'GB'),
        ];

        $parcel = $this->parcelEstimatorService->forCheckoutItems($cartItems);
        $preferredCouriers = $this->extractPreferredCouriers($cartItems, $carriers);

        try {
            $rawRates = $this->shippoRateService->getRates($fromAddress, $toAddress, $parcel);
        } catch (\Throwable $e) {
            Log::warning('DeliveryOptionService: Failed to resolve Shippo services', [
                'destination_postcode' => $postcode,
                'message' => $e->getMessage(),
            ]);

            return [];
        }

        $normalized = [];
        foreach ($rawRates as $rate) {
            if (!is_array($rate)) {
                continue;
            }
            $provider = trim((string) ($rate['provider'] ?? ''));
            $serviceLevel = trim((string) ($rate['servicelevel']['name'] ?? ''));
            $serviceName = trim($provider . ' ' . $serviceLevel);
            $carrier = $this->matchCarrier($provider, $serviceName, $carriers);
            if ($carrier === null) {
                // Rates from carriers the admin has disabled (or never added) are ignored.
                continue;
            }

            $normalized[] = [
                'provider' => $provider,
                'carrier_key' => $carrier['key'],
                'carrier_name' => $carrier['name'],
                'service_name' => $serviceName !== '' ? $serviceName : 'Unnamed carrier service',
                'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                'amount' => isset($rate['amount']) ? (float) $rate['amount'] : INF,
                'preferred' => $preferredCouriers === [] || in_array($carrier['key'], $preferredCouriers, true),
            ];
        }

        Log::info('DeliveryOptionService: Shippo candidate rates', [
            'destination_postcode' => $postcode,
            'preferred_couriers' => $preferredCouriers,
            'rates_count' => count($normalized),
            'services' => array_values(array_unique(array_map(fn (array $rate) => $rate['service_name'], $normalized))),
        ]);

        return $normalized;
    }

    /**
     * @param array<int, array<string, mixed>> $carriers
     */
    private function matchCarrier(string $provider, string $serviceName, array $carriers): ?array
    {
        $providerLower = mb_strtolower($provider);
        $serviceLower = mb_strtolower($serviceName);

        foreach ($carriers as $carrier) {
            foreach ((array) ($carrier['match'] ?? []) as $term) {
                $term = mb_strtolower(trim((string) $term));
                if ($term === '') {
                    continue;
                }
                if (str_contains($providerLower, $term) || str_contains($serviceLower, $term)) {
                    return $carrier;
                }
            }
        }

        return null;
    }

    /**
     * Picks the carrier service that best fits a delivery method.
     *
     * @param array<string, mixed> $method
     * @param array<int, array<string, mixed>> $rates
     * @param array<int, array<string, mixed>> $carriers
     */
    private function selectRateForMethod(array $method, array $rates, array $carriers): ?array
    {
        if ($rates === [] || $method['kind'] === 'collection') {
            return null;
        }

        $candidates = $rates;
        if ($method['carrier_key'] !== '') {
            $candidates = array_values(array_filter($candidates, fn (array $rate) => $rate['carrier_key'] === $method['carrier_key']));
        }

        $serviceNeedle = mb_strtolower(trim((string) $method['service_name']));
        if ($serviceNeedle !== '') {
            $pinned = array_values(array_filter(
                $candidates,
                fn (array $rate) => str_contains(mb_strtolower($rate['service_name']), $serviceNeedle)
            ));
            if ($pinned !== []) {
                return $this->cheapest($pinned);
            }
            // A pinned service that the carrier does not offer for this address is treated as unavailable.
            return null;
        }

        // Prefer the couriers set on the cart's products, but never at the cost of having no option.
        $preferred = array_values(array_filter($candidates, fn (array $rate) => (bool) $rate['preferred']));
        $pool = $preferred !== [] ? $preferred : $candidates;

        if ($method['kind'] === 'next_day') {
            return $this->selectPreferredNextDayRate($pool) ?? $this->selectPreferredNextDayRate($candidates);
        }

        $minDays = (int) $method['eta_min_days'];
        $maxDays = (int) $method['eta_max_days'];

        $inWindow = array_values(array_filter($pool, function (array $rate) use ($minDays, $maxDays) {
            $days = $rate['estimated_days'];
            return $days !== null && $days >= $minDays && $days <= $maxDays;
        }));
        $notNextDay = array_values(array_filter($pool, function (array $rate) {
            $days = $rate['estimated_days'];
            return $days === null || $days > 1;
        }));

        return $this->cheapest($inWindow)
            ?? $this->cheapest($notNextDay)
            ?? $this->cheapest($pool);
    }

    private function selectTimedRate(array $rates): ?array
    {
        if ($rates === []) {
            return null;
        }

        try {
            $selectedDate = $this->ukDeliveryDateService->minSelectableDeliveryDate();
            $qualifying = $this->ukDeliveryDateService->qualifyingRatesForDeliveryDate($rates, $selectedDate);
        } catch (\Throwable) {
            $qualifying = [];
        }

        return $this->cheapest($qualifying);
    }

    private function cheapest(array $rates): ?array
    {
        if (empty($rates)) {
            return null;
        }

        usort($rates, function (array $a, array $b) {
            $aAmount = (float) ($a['amount'] ?? INF);
            $bAmount = (float) ($b['amount'] ?? INF);
            return $aAmount <=> $bAmount;
        });

        return $rates[0] ?? null;
    }

    /**
     * @param array<int, array<string, mixed>> $carriers
     * @return array<int, string>
     */
    private function extractPreferredCouriers(array $cartItems, array $carriers): array
    {
        $carrierKeys = array_map(fn (array $carrier) => $carrier['key'], $carriers);
        $preferred = [];
        foreach ($cartItems as $item) {
            if (!is_array($item)) {
                continue;
            }

            $resolved = $this->resolvePreferredCourierFromItem($item);
            if ($resolved === null || !in_array($resolved, $carrierKeys, true)) {
                continue;
            }
            $preferred[] = $resolved;
        }

        return array_values(array_unique($preferred));
    }

    private function resolvePreferredCourierFromItem(array $item): ?string
    {
        $direct = $this->normalizePreferredCourier((string) ($item['preferred_courier'] ?? ''));
        if ($direct !== null) {
            return $direct;
        }

        $productId = null;
        if (!empty($item['id']) && is_numeric($item['id'])) {
            $productId = (int) $item['id'];
        }

        if (!$productId) {
            $slug = trim((string) ($item['slug'] ?? $item['id'] ?? ''));
            if ($slug !== '') {
                $productId = (int) (Product::query()->where('slug', $slug)->value('id') ?? 0);
            }
        }

        if (!$productId) {
            $name = trim((string) ($item['name'] ?? $item['title'] ?? ''));
            if ($name !== '') {
                $productId = (int) (Product::query()->where('name', $name)->value('id') ?? 0);
            }
        }

        if (!$productId) {
            return null;
        }

        $size = strtoupper(trim((string) ($item['size'] ?? '')));
        $colour = strtolower(trim((string) ($item['colour'] ?? $item['color'] ?? '')));

        $variantCourier = ProductVariant::query()
            ->where('product_id', $productId)
            ->when($size !== '', fn ($query) => $query->whereRaw('UPPER(size) = ?', [$size]))
            ->when($colour !== '', fn ($query) => $query->whereRaw('LOWER(colour) = ?', [$colour]))
            ->value('parcel_courier');

        if (!$variantCourier) {
            $variantCourier = ProductVariant::query()
                ->where('product_id', $productId)
                ->whereNotNull('parcel_courier')
                ->value('parcel_courier');
        }

        return $this->normalizePreferredCourier((string) ($variantCourier ?? ''));
    }

    private function normalizePreferredCourier(string $value): ?string
    {
        $raw = strtolower(trim($value));
        if ($raw === '' || $raw === 'manual') {
            return null;
        }

        return str_replace([' ', '-'], '_', $raw);
    }

    private function selectPreferredNextDayRate(array $rates): ?array
    {
        // Ordered preference for next-day service with flexible matching.
        foreach ($rates as $rate) {
            $service = strtolower((string) ($rate['service_name'] ?? ''));
            if ($this->matchesRoyalMailSpecialDeliveryGuaranteed($service)) {
                return $rate;
            }
        }

        foreach ($rates as $rate) {
            $service = strtolower((string) ($rate['service_name'] ?? ''));
            if ($this->matchesDpdNextDay($service)) {
                return $rate;
            }
        }

        // Fall back to any service the carrier estimates at one day.
        foreach ($rates as $rate) {
            $days = $rate['estimated_days'] ?? null;
            $service = strtolower((string) ($rate['service_name'] ?? ''));
            if ($days !== null && $days <= 1 && (str_contains($service, 'next') || str_contains($service, 'express') || str_contains($service, '24'))) {
                return $rate;
            }
        }

        return null;
    }

    private function matchesRoyalMailSpecialDeliveryGuaranteed(string $service): bool
    {
        return str_contains($service, 'royal mail')
            && str_contains($service, 'special')
            && str_contains($service, 'delivery')
            && str_contains($service, 'guaranteed');
    }

    private function matchesDpdNextDay(string $service): bool
    {
        return str_contains($service, 'dpd')
            && str_contains($service, 'next')
            && str_contains($service, 'day');
    }
}
