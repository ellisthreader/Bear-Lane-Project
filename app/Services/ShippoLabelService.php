<?php

namespace App\Services;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ShippoLabelService
{
    public function __construct(private readonly ShippoRateService $shippoRateService)
    {
    }

    public function purchaseTimedLabelForOrder(Order $order, ?string $preferredService = null): array
    {
        if (!$order->calculated_ship_date) {
            throw new \RuntimeException('Timed delivery is missing calculated ship date.');
        }

        $fromAddress = [
            'name' => "Ellis' Courses",
            'street1' => '390 Springfield Road',
            'city' => 'Chelmsford',
            'zip' => 'CM2 6AT',
            'country' => 'GB',
        ];

        $toAddress = [
            'name' => trim(((string) $order->first_name) . ' ' . ((string) $order->last_name)),
            'street1' => (string) ($order->address_line1 ?? 'Address pending'),
            'city' => (string) ($order->city ?? 'London'),
            'zip' => (string) ($order->postcode ?? ''),
            'country' => strtoupper((string) ($order->country ?: 'GB')),
        ];

        if ($toAddress['zip'] === '') {
            throw new \RuntimeException('Timed delivery requires a destination postcode.');
        }

        $parcel = [
            'length' => '30',
            'width' => '25',
            'height' => '5',
            'distance_unit' => 'cm',
            'weight' => '1.2',
            'mass_unit' => 'kg',
        ];

        $shipDateIso = Carbon::parse($order->calculated_ship_date, 'Europe/London')
            ->setTime(9, 0, 0)
            ->utc()
            ->toIso8601String();

        $rates = $this->shippoRateService->getRates($fromAddress, $toAddress, $parcel, $shipDateIso);

        $normalizedRates = array_map(function (array $rate): array {
            $provider = trim((string) ($rate['provider'] ?? ''));
            $serviceLevel = trim((string) ($rate['servicelevel']['name'] ?? ''));
            $serviceName = trim($provider . ' ' . $serviceLevel);

            return [
                'object_id' => (string) ($rate['object_id'] ?? ''),
                'service_name' => $serviceName !== '' ? $serviceName : 'Unnamed carrier service',
                'amount' => isset($rate['amount']) ? (float) $rate['amount'] : INF,
            ];
        }, $rates);

        Log::info('ShippoLabelService: rates for timed label purchase', [
            'order_number' => $order->order_number,
            'destination_postcode' => $toAddress['zip'],
            'ship_date' => $shipDateIso,
            'preferred_service' => $preferredService,
            'rates_count' => count($normalizedRates),
            'rates' => $normalizedRates,
        ]);

        $selectedRate = $this->selectRate($normalizedRates, $preferredService);
        if (!$selectedRate || empty($selectedRate['object_id'])) {
            throw new \RuntimeException('Selected delivery date unavailable.');
        }

        $transaction = $this->shippoRateService->createTransaction((string) $selectedRate['object_id']);

        $status = (string) ($transaction['status'] ?? '');
        if (!in_array($status, ['SUCCESS', 'QUEUED'], true)) {
            $messages = $transaction['messages'] ?? [];
            $firstMessage = is_array($messages) && isset($messages[0]['text'])
                ? (string) $messages[0]['text']
                : null;
            throw new \RuntimeException($firstMessage ?: 'Shippo label generation failed.');
        }

        return [
            'shippo_transaction_id' => $transaction['object_id'] ?? null,
            'shippo_label_url' => $transaction['label_url'] ?? null,
            'shippo_tracking_number' => $transaction['tracking_number'] ?? null,
            'shippo_selected_rate_id' => $selectedRate['object_id'],
            'shippo_selected_service' => $selectedRate['service_name'],
        ];
    }

    private function selectRate(array $rates, ?string $preferredService): ?array
    {
        if (empty($rates)) {
            return null;
        }

        if (!empty($preferredService)) {
            $preferred = strtolower(trim($preferredService));

            foreach ($rates as $rate) {
                if (strtolower(trim((string) ($rate['service_name'] ?? ''))) === $preferred) {
                    return $rate;
                }
            }

            foreach ($rates as $rate) {
                $service = strtolower(trim((string) ($rate['service_name'] ?? '')));
                if ($service !== '' && (str_contains($service, $preferred) || str_contains($preferred, $service))) {
                    return $rate;
                }
            }
        }

        usort($rates, function (array $a, array $b): int {
            return ((float) ($a['amount'] ?? INF)) <=> ((float) ($b['amount'] ?? INF));
        });

        return $rates[0] ?? null;
    }
}

