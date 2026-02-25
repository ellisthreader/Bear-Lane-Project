<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DeliveryOptionService
{
    public function __construct(
        private readonly DeliverySlotService $slotService,
        private readonly ShippoRateService $shippoRateService,
        private readonly UkDeliveryDateService $ukDeliveryDateService,
    )
    {
    }

    public function getOptions(
        ?User $user = null,
        ?string $postcode = null,
        ?string $country = null,
        ?string $city = null,
        ?string $street1 = null,
    ): array
    {
        $isMember = (bool) data_get($user, 'is_member', false);
        $now = now();
        $nextDayDate = $now->copy()->addDay();
        $selectedServices = $this->resolveSelectedServices($postcode, $country, $city, $street1);
        $hasPreferredNextDayService = !empty(data_get($selectedServices, 'NEXT_DAY.service_name'));

        $nextDayAllowedByWindow = (int) $now->format('H') < 22
            && (int) $nextDayDate->dayOfWeek !== Carbon::SUNDAY;
        $nextDayAvailable = $nextDayAllowedByWindow && $hasPreferredNextDayService;
        $nextDayUnavailableReason = $nextDayAvailable
            ? null
            : (
                !$nextDayAllowedByWindow
                    ? 'Next Day is unavailable after 10pm or on Sunday delivery windows.'
                    : 'Next Day is unavailable because no approved next-day service is available for this address.'
            );

        $timedAvailable = $this->hasTimedAvailability($postcode);

        $result = [
            'is_member' => $isMember,
            'options' => [
                $this->buildOption(
                    'STANDARD',
                    'Standard Delivery',
                    'Delivered within 2-3 days',
                    true,
                    $isMember,
                    null,
                    data_get($selectedServices, 'STANDARD.service_name'),
                    data_get($selectedServices, 'STANDARD.amount'),
                ),
                $this->buildOption(
                    'NEXT_DAY',
                    'Next Day Delivery',
                    'Delivered within 1 working day',
                    $nextDayAvailable,
                    $isMember,
                    $nextDayUnavailableReason,
                    data_get($selectedServices, 'NEXT_DAY.service_name'),
                    data_get($selectedServices, 'NEXT_DAY.amount'),
                ),
                $this->buildOption(
                    'TIMED',
                    'Timed Delivery',
                    'Choose a delivery date',
                    $timedAvailable,
                    $isMember,
                    $timedAvailable ? null : 'No timed slots are currently available.',
                    data_get($selectedServices, 'TIMED.service_name'),
                    null,
                ),
            ],
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

    public function resolvePrice(string $deliveryType, ?User $user = null): float
    {
        $normalized = strtoupper(trim($deliveryType));
        $pricing = config('delivery.pricing', []);
        $basePrice = (float) ($pricing[$normalized] ?? 0);
        $isMember = (bool) data_get($user, 'is_member', false);

        return $isMember ? 0.0 : $basePrice;
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

    private function buildOption(
        string $type,
        string $label,
        string $description,
        bool $available,
        bool $isMember,
        ?string $unavailableReason = null,
        ?string $selectedShippoService = null,
        ?float $shippoSelectedAmount = null,
    ): array {
        $pricing = config('delivery.pricing', []);
        $basePrice = (float) ($pricing[$type] ?? 0);
        $effectiveBasePrice = $shippoSelectedAmount ?? $basePrice;
        $price = $isMember ? 0.0 : $effectiveBasePrice;

        return [
            'type' => $type,
            'label' => $label,
            'description' => $description,
            'available' => $available,
            'price' => $price,
            'display_price' => $isMember ? 'Free with Membership' : '£' . number_format($price, 2),
            'unavailable_reason' => $available ? null : $unavailableReason,
            'selected_shippo_service' => $selectedShippoService,
        ];
    }

    private function resolveSelectedServices(
        ?string $postcode,
        ?string $country,
        ?string $city,
        ?string $street1,
    ): array {
        if (!$postcode) {
            return [];
        }

        $fromAddress = [
            'name' => "Ellis' Courses",
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

        $parcel = [
            'length' => '30',
            'width' => '25',
            'height' => '5',
            'distance_unit' => 'cm',
            'weight' => '1.2',
            'mass_unit' => 'kg',
        ];

        try {
            $rawRates = $this->shippoRateService->getRates($fromAddress, $toAddress, $parcel);
            $normalizedRates = array_map(function (array $rate) {
                $provider = trim((string) ($rate['provider'] ?? ''));
                $serviceLevel = trim((string) ($rate['servicelevel']['name'] ?? ''));
                $serviceName = trim($provider . ' ' . $serviceLevel);

                return [
                    'service_name' => $serviceName !== '' ? $serviceName : 'Unnamed carrier service',
                    'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                    'amount' => isset($rate['amount']) ? (float) $rate['amount'] : INF,
                ];
            }, $rawRates);

            $nextDayPreferred = array_values(array_filter($normalizedRates, function (array $rate) {
                return isset($rate['estimated_days']) && $rate['estimated_days'] !== null && $rate['estimated_days'] <= 1;
            }));

            $standardPreferred = array_values(array_filter($normalizedRates, function (array $rate) {
                $days = $rate['estimated_days'];
                return $days !== null && $days >= 2 && $days <= 3;
            }));

            $standardFallback = array_values(array_filter($normalizedRates, function (array $rate) {
                $days = $rate['estimated_days'];
                return $days === null || $days > 1;
            }));

            Log::info('DeliveryOptionService: Shippo candidate rates by timeframe', [
                'destination' => [
                    'postcode' => $postcode,
                    'country' => strtoupper($country ?: 'GB'),
                    'city' => $city ?: 'London',
                    'street1' => $street1 ?: 'Address pending',
                ],
                'all_rates_count' => count($normalizedRates),
                'all_rates' => $normalizedRates,
                'all_available_shipping_services' => array_values(array_unique(array_map(
                    fn (array $rate) => (string) ($rate['service_name'] ?? 'Unnamed carrier service'),
                    $normalizedRates
                ))),
                'next_day_candidates' => $nextDayPreferred,
                'standard_2_3_day_candidates' => $standardPreferred,
            ]);

            $nextDaySelectedRate =
                $this->selectPreferredNextDayRate($nextDayPreferred)
                ?? $this->selectPreferredNextDayRate($normalizedRates)
                ?? null;

            $standardSelectedRate =
                $this->selectCheapestRate($standardPreferred)
                ?? $this->selectCheapestRate($standardFallback)
                ?? $this->selectCheapestRate($normalizedRates);

            $timedSelectedRate = $this->selectTimedRateForEarliestDate($normalizedRates);

            Log::info('DeliveryOptionService: Shippo selected services', [
                'destination_postcode' => $postcode,
                'selected_next_day_service' => $nextDaySelectedRate['service_name'] ?? null,
                'selected_next_day_amount' => $nextDaySelectedRate['amount'] ?? null,
                'selected_standard_service' => $standardSelectedRate['service_name'] ?? null,
                'selected_standard_amount' => $standardSelectedRate['amount'] ?? null,
                'selected_timed_service' => $timedSelectedRate['service_name'] ?? null,
                'selected_timed_amount' => $timedSelectedRate['amount'] ?? null,
                'next_day_allowed_services' => [
                    'Royal Mail Special Delivery Guaranteed',
                    'DPD Next Day',
                ],
            ]);

            return [
                'NEXT_DAY' => $nextDaySelectedRate,
                'STANDARD' => $standardSelectedRate,
                'TIMED' => $timedSelectedRate,
            ];
        } catch (\Throwable $e) {
            Log::warning('DeliveryOptionService: Failed to resolve Shippo services', [
                'destination_postcode' => $postcode,
                'message' => $e->getMessage(),
            ]);
            return [];
        }
    }

    private function selectCheapestRate(array $rates): ?array
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

        // No approved next-day service found.
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

    private function selectTimedRateForEarliestDate(array $normalizedRates): ?array
    {
        $selectedDate = $this->ukDeliveryDateService->minSelectableDeliveryDate();

        $qualifying = $this->ukDeliveryDateService->qualifyingRatesForDeliveryDate(
            $normalizedRates,
            $selectedDate,
        );

        if (empty($qualifying)) {
            return null;
        }

        usort($qualifying, function (array $a, array $b) {
            return ((float) ($a['amount'] ?? INF)) <=> ((float) ($b['amount'] ?? INF));
        });

        return $qualifying[0] ?? null;
    }
}
