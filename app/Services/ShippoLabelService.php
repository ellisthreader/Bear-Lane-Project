<?php

namespace App\Services;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ShippoLabelService
{
    public function __construct(
        private readonly ShippoRateService $shippoRateService,
        private readonly ParcelEstimatorService $parcelEstimatorService,
    )
    {
    }

    public function purchaseLabelForOrder(Order $order, ?string $preferredService = null): array
    {
        $fromAddress = [
            'name' => 'Bear Lane',
            'street1' => '390 Springfield Road',
            'city' => 'Chelmsford',
            'zip' => 'CM2 6AT',
            'country' => 'GB',
        ];

        $recipientName = $this->resolveRecipientName($order);

        $toAddress = [
            'name' => $recipientName,
            'street1' => (string) ($order->address_line1 ?? 'Address pending'),
            'street2' => (string) ($order->address_line2 ?? ''),
            'city' => (string) ($order->city ?? 'London'),
            'zip' => (string) ($order->postcode ?? ''),
            'country' => strtoupper((string) ($order->country ?: 'GB')),
            'phone' => (string) ($order->phone ?? ''),
            'email' => (string) ($order->email ?? $order->user?->email ?? ''),
        ];

        if ($toAddress['zip'] === '') {
            throw new \RuntimeException('Delivery label requires a destination postcode.');
        }

        $parcel = $this->parcelEstimatorService->forOrder($order);

        $shipDateSource = $order->calculated_ship_date
            ?: $order->selected_delivery_date
            ?: Carbon::now('Europe/London')->addDay()->toDateString();

        $shipDateIso = Carbon::parse($shipDateSource, 'Europe/London')
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
                'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
            ];
        }, $rates);

        $forceNextDayForTimed = $this->shouldForceNextDayForTimed($order);

        Log::info('ShippoLabelService: rates for timed label purchase', [
            'order_number' => $order->order_number,
            'destination_postcode' => $toAddress['zip'],
            'ship_date' => $shipDateIso,
            'preferred_service' => $preferredService,
            'force_next_day_for_timed' => $forceNextDayForTimed,
            'rates_count' => count($normalizedRates),
            'rates' => $normalizedRates,
        ]);

        $selectedRate = $forceNextDayForTimed
            ? $this->selectNextDayRate($normalizedRates, $preferredService)
            : $this->selectRate($normalizedRates, $preferredService);

        if ($forceNextDayForTimed && !$selectedRate) {
            throw new \RuntimeException('No next day Shippo service is available for this timed delivery date.');
        }

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

    public function purchaseTimedLabelForOrder(Order $order, ?string $preferredService = null): array
    {
        return $this->purchaseLabelForOrder($order, $preferredService);
    }

    public function purchaseReturnLabelForOrder(Order $order, ?string $preferredService = null): array
    {
        $recipientName = $this->resolveRecipientName($order);

        $fromAddress = [
            'name' => $recipientName,
            'street1' => (string) ($order->address_line1 ?? 'Address pending'),
            'street2' => (string) ($order->address_line2 ?? ''),
            'city' => (string) ($order->city ?? 'London'),
            'zip' => (string) ($order->postcode ?? ''),
            'country' => strtoupper((string) ($order->country ?: 'GB')),
            'phone' => (string) ($order->phone ?? ''),
            'email' => (string) ($order->email ?? $order->user?->email ?? ''),
        ];

        $toAddress = [
            'name' => 'Bear Lane',
            'street1' => '390 Springfield Road',
            'city' => 'Chelmsford',
            'zip' => 'CM2 6AT',
            'country' => 'GB',
        ];

        if ($fromAddress['zip'] === '') {
            throw new \RuntimeException('Return label requires a valid customer postcode.');
        }

        $parcel = $this->parcelEstimatorService->forOrder($order);

        $shipDateIso = Carbon::now('Europe/London')
            ->addDay()
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
                'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
            ];
        }, $rates);

        $selectedRate = $this->selectRate($normalizedRates, $preferredService);
        if (!$selectedRate || empty($selectedRate['object_id'])) {
            throw new \RuntimeException('Unable to find a return shipping rate right now.');
        }

        $transaction = $this->shippoRateService->createTransaction((string) $selectedRate['object_id']);
        $status = (string) ($transaction['status'] ?? '');
        if (!in_array($status, ['SUCCESS', 'QUEUED'], true)) {
            $messages = $transaction['messages'] ?? [];
            $firstMessage = is_array($messages) && isset($messages[0]['text'])
                ? (string) $messages[0]['text']
                : null;
            throw new \RuntimeException($firstMessage ?: 'Shippo return label generation failed.');
        }

        return [
            'shippo_transaction_id' => $transaction['object_id'] ?? null,
            'shippo_label_url' => $transaction['label_url'] ?? null,
            'shippo_tracking_number' => $transaction['tracking_number'] ?? null,
            'shippo_selected_rate_id' => $selectedRate['object_id'],
            'shippo_selected_service' => $selectedRate['service_name'],
        ];
    }

    private function shouldForceNextDayForTimed(Order $order): bool
    {
        if (strtoupper((string) $order->delivery_type) !== 'TIMED' || !$order->selected_delivery_date) {
            return false;
        }

        $today = Carbon::now('Europe/London')->startOfDay();
        $selectedDate = Carbon::parse((string) $order->selected_delivery_date, 'Europe/London')->startOfDay();

        return $today->diffInDays($selectedDate, false) === 1;
    }

    private function resolveRecipientName(Order $order): string
    {
        $recipientName = trim(((string) $order->first_name) . ' ' . ((string) $order->last_name));
        if ($recipientName === '') {
            $recipientName = trim((string) ($order->user?->name ?? ''));
        }
        if ($recipientName === '') {
            $recipientName = trim((string) ($order->email ?? $order->user?->email ?? ''));
        }

        return $recipientName !== '' ? $recipientName : 'Checkout Customer';
    }

    private function selectNextDayRate(array $rates, ?string $preferredService): ?array
    {
        $nextDayRates = array_values(array_filter($rates, function (array $rate): bool {
            $estimatedDays = $rate['estimated_days'] ?? null;
            return is_int($estimatedDays) && $estimatedDays <= 1;
        }));

        if (empty($nextDayRates)) {
            return null;
        }

        return $this->selectRate($nextDayRates, $preferredService);
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
