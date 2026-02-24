<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ShippoRateService
{
    public function getRates(array $fromAddress, array $toAddress, array $parcel, ?string $shipmentDate = null): array
    {
        $token = config('services.shippo.token');

        if (empty($token)) {
            throw new \RuntimeException('Shippo API key is missing. Set SHIPPO_API_KEY in .env.');
        }

        $payload = [
            'address_from' => $fromAddress,
            'address_to' => $toAddress,
            'parcels' => [$parcel],
            'async' => false,
        ];
        if (!empty($shipmentDate)) {
            $payload['shipment_date'] = $shipmentDate;
        }

        $cacheKey = 'shippo:rates:' . md5(json_encode($payload));

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($payload, $token) {
            $response = Http::withHeaders([
                'Authorization' => 'ShippoToken ' . $token,
                'Content-Type' => 'application/json',
            ])->post('https://api.goshippo.com/v1/shipments', $payload);

            if ($response->failed()) {
                $body = $response->json();
                $message = is_array($body) && !empty($body['detail'])
                    ? (string) $body['detail']
                    : 'Shippo request failed.';

                throw new \RuntimeException($message);
            }

            $data = $response->json();
            if (!isset($data['rates']) || !is_array($data['rates'])) {
                throw new \RuntimeException('Shippo did not return rate data.');
            }

            $allRates = array_map(function (array $rate) {
                return [
                    'provider' => $rate['provider'] ?? null,
                    'service_name' => trim((string) (($rate['provider'] ?? '') . ' ' . (($rate['servicelevel']['name'] ?? '')))),
                    'amount' => $rate['amount'] ?? null,
                    'currency' => $rate['currency'] ?? null,
                    'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                    'attributes' => $rate['attributes'] ?? null,
                ];
            }, $data['rates']);

            logger()->info('ShippoRateService: ALL shippo rate options returned', [
                'rates_count' => count($allRates),
                'rates' => $allRates,
            ]);

            return $data['rates'];
        });
    }

    public function createTransaction(string $rateObjectId, string $labelFileType = 'PDF_4x6'): array
    {
        $token = config('services.shippo.token');

        if (empty($token)) {
            throw new \RuntimeException('Shippo API key is missing. Set SHIPPO_API_KEY in .env.');
        }

        $payload = [
            'rate' => $rateObjectId,
            'label_file_type' => $labelFileType,
            'async' => false,
        ];

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken ' . $token,
            'Content-Type' => 'application/json',
        ])->post('https://api.goshippo.com/v1/transactions', $payload);

        if ($response->failed()) {
            $body = $response->json();
            $message = is_array($body) && !empty($body['detail'])
                ? (string) $body['detail']
                : 'Shippo transaction creation failed.';

            throw new \RuntimeException($message);
        }

        $data = $response->json();
        if (!is_array($data)) {
            throw new \RuntimeException('Shippo transaction response was invalid.');
        }

        return $data;
    }

    public function getFilteredRates(array $fromAddress, array $toAddress, array $parcel, int $maxEstimatedDays = 2): array
    {
        $rates = $this->getRates($fromAddress, $toAddress, $parcel);

        $filtered = array_values(array_filter($rates, function ($rate) use ($maxEstimatedDays) {
            $days = isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : 999;
            return $days <= $maxEstimatedDays;
        }));

        return array_map(function ($rate) {
            return [
                'object_id' => $rate['object_id'] ?? null,
                'service_name' => trim(($rate['provider'] ?? '') . ' ' . (($rate['servicelevel']['name'] ?? ''))),
                'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                'amount' => $rate['amount'] ?? null,
            ];
        }, $filtered);
    }
}
