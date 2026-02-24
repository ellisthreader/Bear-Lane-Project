<?php

namespace App\Services;

use App\Models\DeliverySlot;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DeliverySlotService
{
    public const SLOT_WINDOWS = [
        '08:00-12:00',
        '12:00-16:00',
        '18:00-22:00',
    ];

    public function __construct(
        private readonly UkDeliveryDateService $ukDeliveryDateService,
        private readonly ShippoRateService $shippoRateService,
    )
    {
    }

    /**
     * Ensure future slot rows exist and return delivery days.
     */
    public function ensureAndGetDeliveryDays(int $days = 14): array
    {
        $dates = [];
        $cursor = $this->ukDeliveryDateService->minSelectableDeliveryDate();

        while (count($dates) < $days) {
            if ($this->ukDeliveryDateService->isWorkingDay($cursor)) {
                $dates[] = $cursor->toDateString();
            }
            $cursor->addDay();
        }

        $rows = [];
        foreach ($dates as $date) {
            foreach (self::SLOT_WINDOWS as $window) {
                $rows[] = [
                    'date' => $date,
                    'time_window' => $window,
                    'capacity' => (int) config('delivery.slot.capacity', 25),
                    'reserved_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DeliverySlot::upsert(
            $rows,
            ['date', 'time_window'],
            ['updated_at']
        );

        return $dates;
    }

    public function getAvailableSlots(?string $postcode = null): array
    {
        // Postcode currently accepted for future routing logic.
        $this->releaseExpiredReservations();
        $dates = $this->ensureAndGetDeliveryDays(14);

        $slots = DeliverySlot::query()
            ->whereIn('date', $dates)
            ->orderBy('date')
            ->orderBy('time_window')
            ->get();

        $grouped = [];

        foreach ($slots as $slot) {
            $dateKey = $slot->date->toDateString();
            $remaining = max(0, (int) $slot->capacity - (int) $slot->reserved_count);

            if (!isset($grouped[$dateKey])) {
                $grouped[$dateKey] = [
                    'date' => $dateKey,
                    'slots' => [],
                ];
            }

            $grouped[$dateKey]['slots'][] = [
                'slot_id' => $slot->id,
                'time_window' => $slot->time_window,
                'capacity' => (int) $slot->capacity,
                'reserved_count' => (int) $slot->reserved_count,
                'remaining' => $remaining,
                'available' => $remaining > 0,
            ];
        }

        return array_values($grouped);
    }

    public function reserveSlot(int $slotId, array $addressContext = []): Reservation
    {
        $this->releaseExpiredReservations();

        $lock = Cache::lock("delivery-slot:{$slotId}", 10);

        return $lock->block(5, function () use ($slotId, $addressContext) {
            return DB::transaction(function () use ($slotId, $addressContext) {
                $slot = DeliverySlot::query()->lockForUpdate()->findOrFail($slotId);

                if ($slot->reserved_count >= $slot->capacity) {
                    throw new \RuntimeException('This slot is fully booked.');
                }

                $selectedDeliveryDate = $slot->date->copy()->startOfDay();
                if (!$this->ukDeliveryDateService->isSelectableDeliveryDate($selectedDeliveryDate)) {
                    throw new \RuntimeException('Selected delivery date unavailable.');
                }

                $timedRate = $this->resolveTimedRateForDate($selectedDeliveryDate, $addressContext);
                if (!$timedRate) {
                    throw new \RuntimeException('Selected delivery date unavailable.');
                }

                $reservation = Reservation::create([
                    'slot_id' => $slot->id,
                    'status' => 'reserved',
                    'expires_at' => now()->addMinutes((int) config('delivery.slot.hold_minutes', 15)),
                    'selected_delivery_date' => $selectedDeliveryDate->toDateString(),
                    'calculated_ship_date' => $timedRate['ship_date'],
                    'shipping_service' => $timedRate['service_name'],
                    'shipping_rate_id' => $timedRate['object_id'],
                ]);

                $slot->increment('reserved_count');

                return $reservation->fresh('slot');
            });
        });
    }

    public function confirmReservation(int $reservationId, ?int $orderId = null, ?string $shippingRate = null): Reservation
    {
        return DB::transaction(function () use ($reservationId, $orderId, $shippingRate) {
            $reservation = Reservation::query()->lockForUpdate()->findOrFail($reservationId);

            if ($reservation->status === 'confirmed') {
                return $reservation;
            }

            if ($reservation->status !== 'reserved') {
                throw new \RuntimeException('Reservation is no longer valid.');
            }

            if ($reservation->expires_at->isPast()) {
                $slot = DeliverySlot::query()->lockForUpdate()->findOrFail($reservation->slot_id);
                $slot->reserved_count = max(0, $slot->reserved_count - 1);
                $slot->save();

                $reservation->status = 'expired';
                $reservation->save();

                throw new \RuntimeException('Reservation has expired. Please select another slot.');
            }

            $reservation->status = 'confirmed';
            $reservation->confirmed_at = now();
            if ($orderId) {
                $reservation->order_id = $orderId;
            }
            $reservation->save();

            if ($orderId) {
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update([
                        'delivery_slot_id' => $reservation->slot_id,
                        'shipping_rate' => $shippingRate ?: $reservation->shipping_service,
                        'selected_delivery_date' => $reservation->selected_delivery_date,
                        'calculated_ship_date' => $reservation->calculated_ship_date,
                        'updated_at' => now(),
                    ]);
            }

            return $reservation->fresh('slot');
        });
    }

    public function cancelReservation(int $reservationId): void
    {
        DB::transaction(function () use ($reservationId) {
            $reservation = Reservation::query()->lockForUpdate()->findOrFail($reservationId);

            if ($reservation->status !== 'reserved') {
                return;
            }

            $slot = DeliverySlot::query()->lockForUpdate()->find($reservation->slot_id);
            if ($slot) {
                $slot->reserved_count = max(0, $slot->reserved_count - 1);
                $slot->save();
            }

            $reservation->status = 'expired';
            $reservation->save();
        });
    }

    public function releaseExpiredReservations(): int
    {
        $expired = Reservation::query()
            ->where('status', 'reserved')
            ->where('expires_at', '<=', now())
            ->get();

        if ($expired->isEmpty()) {
            return 0;
        }

        $released = 0;

        foreach ($expired as $reservation) {
            DB::transaction(function () use ($reservation, &$released) {
                $res = Reservation::query()->lockForUpdate()->find($reservation->id);
                if (!$res || $res->status !== 'reserved' || $res->expires_at->isFuture()) {
                    return;
                }

                $slot = DeliverySlot::query()->lockForUpdate()->find($res->slot_id);
                if ($slot) {
                    $slot->reserved_count = max(0, $slot->reserved_count - 1);
                    $slot->save();
                }

                $res->status = 'expired';
                $res->save();
                $released++;
            });
        }

        return $released;
    }

    private function resolveTimedRateForDate(Carbon $selectedDeliveryDate, array $addressContext): ?array
    {
        $postcode = (string) ($addressContext['postcode'] ?? '');
        if ($postcode === '') {
            return null;
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
            'street1' => (string) ($addressContext['street1'] ?? 'Address pending'),
            'city' => (string) ($addressContext['city'] ?? 'London'),
            'zip' => $postcode,
            'country' => strtoupper((string) ($addressContext['country'] ?? 'GB')),
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
                    'object_id' => $rate['object_id'] ?? null,
                    'service_name' => $serviceName !== '' ? $serviceName : 'Unnamed carrier service',
                    'estimated_days' => isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null,
                    'amount' => isset($rate['amount']) ? (float) $rate['amount'] : INF,
                ];
            }, $rawRates);

            $qualifying = $this->ukDeliveryDateService->qualifyingRatesForDeliveryDate(
                $normalizedRates,
                $selectedDeliveryDate,
            );

            Log::info('DeliverySlotService: Timed date qualification', [
                'selected_delivery_date' => $selectedDeliveryDate->toDateString(),
                'destination_postcode' => $postcode,
                'normalized_rates_count' => count($normalizedRates),
                'qualifying_rates_count' => count($qualifying),
                'qualifying_rates' => $qualifying,
            ]);

            if (empty($qualifying)) {
                return null;
            }

            usort($qualifying, function (array $a, array $b) {
                return ((float) ($a['amount'] ?? INF)) <=> ((float) ($b['amount'] ?? INF));
            });

            return $qualifying[0];
        } catch (\Throwable $e) {
            Log::warning('DeliverySlotService: Timed rate resolution failed', [
                'selected_delivery_date' => $selectedDeliveryDate->toDateString(),
                'destination_postcode' => $postcode,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
