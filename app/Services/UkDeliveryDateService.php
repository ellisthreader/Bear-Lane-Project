<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;

class UkDeliveryDateService
{
    public function timezone(): string
    {
        return (string) config('delivery.timezone', 'Europe/London');
    }

    public function minSelectableDeliveryDate(?CarbonInterface $now = null): Carbon
    {
        $nowUk = $this->toUk($now ?? now());
        $cutoffHour = (int) config('delivery.cutoff_hour', 16);

        $minOffsetDays = 1;
        if ((int) $nowUk->format('H') >= $cutoffHour) {
            $minOffsetDays = 2;
        }

        $candidate = $nowUk->copy()->startOfDay()->addDays($minOffsetDays);
        return $this->nextWorkingDay($candidate);
    }

    public function isSelectableDeliveryDate(CarbonInterface $deliveryDate, ?CarbonInterface $now = null): bool
    {
        $deliveryDateUk = $this->toUk($deliveryDate)->startOfDay();
        $minDate = $this->minSelectableDeliveryDate($now);

        return $this->isWorkingDay($deliveryDateUk) && $deliveryDateUk->greaterThanOrEqualTo($minDate);
    }

    public function isWorkingDay(CarbonInterface $date): bool
    {
        $dateUk = $this->toUk($date);
        return !$dateUk->isSunday() && !$this->isBankHoliday($dateUk);
    }

    public function subtractWorkingDays(CarbonInterface $date, int $days): Carbon
    {
        $cursor = $this->toUk($date)->startOfDay();
        $remaining = max(0, $days);

        while ($remaining > 0) {
            $cursor->subDay();
            if ($this->isWorkingDay($cursor)) {
                $remaining--;
            }
        }

        return $cursor;
    }

    public function addWorkingDays(CarbonInterface $date, int $days): Carbon
    {
        $cursor = $this->toUk($date)->startOfDay();
        $remaining = max(0, $days);

        while ($remaining > 0) {
            $cursor->addDay();
            if ($this->isWorkingDay($cursor)) {
                $remaining--;
            }
        }

        return $cursor;
    }

    public function calculateShipDate(
        CarbonInterface $selectedDeliveryDate,
        int $transitWorkingDays,
        ?CarbonInterface $now = null,
    ): ?Carbon {
        $deliveryDateUk = $this->toUk($selectedDeliveryDate)->startOfDay();
        $transitDays = max(1, $transitWorkingDays);
        $candidateShipDate = $this->subtractWorkingDays($deliveryDateUk, $transitDays);
        $nowUk = $this->toUk($now ?? now());
        $todayUk = $nowUk->copy()->startOfDay();

        if ($candidateShipDate->lt($todayUk)) {
            return null;
        }

        // Same-day ship becomes invalid once cut-off is passed.
        $cutoffHour = (int) config('delivery.cutoff_hour', 16);
        if ($candidateShipDate->equalTo($todayUk) && (int) $nowUk->format('H') >= $cutoffHour) {
            return null;
        }

        if (!$this->isWorkingDay($candidateShipDate)) {
            return null;
        }

        return $candidateShipDate;
    }

    /**
     * @param array<int,array{service_name?:string,estimated_days?:int|null,amount?:float|int|string,object_id?:string|null}> $rates
     * @return array<int,array{service_name:string,estimated_days:int,amount:float,object_id:?string,ship_date:string,arrival_date:string}>
     */
    public function qualifyingRatesForDeliveryDate(
        array $rates,
        CarbonInterface $selectedDeliveryDate,
        ?CarbonInterface $now = null,
    ): array {
        $deliveryDateUk = $this->toUk($selectedDeliveryDate)->startOfDay();
        $qualifying = [];

        foreach ($rates as $rate) {
            $estimatedDays = isset($rate['estimated_days']) ? (int) $rate['estimated_days'] : null;
            $serviceName = (string) ($rate['service_name'] ?? 'Unnamed carrier service');
            $transitDays = $this->resolveTransitWorkingDays($serviceName, $estimatedDays);

            if (!$transitDays || $transitDays < 1) {
                continue;
            }

            $shipDate = $this->calculateShipDate($deliveryDateUk, $transitDays, $now);
            if (!$shipDate) {
                continue;
            }

            $arrivalDate = $this->addWorkingDays($shipDate, $transitDays);
            if ($arrivalDate->greaterThan($deliveryDateUk)) {
                continue;
            }

            $qualifying[] = [
                'service_name' => $serviceName,
                'estimated_days' => $transitDays,
                'amount' => isset($rate['amount']) ? (float) $rate['amount'] : INF,
                'object_id' => isset($rate['object_id']) ? (string) $rate['object_id'] : null,
                'ship_date' => $shipDate->toDateString(),
                'arrival_date' => $arrivalDate->toDateString(),
            ];
        }

        return $qualifying;
    }

    private function isBankHoliday(CarbonInterface $date): bool
    {
        $holidays = config('delivery.uk_bank_holidays', []);
        return in_array($date->toDateString(), $holidays, true);
    }

    private function nextWorkingDay(CarbonInterface $date): Carbon
    {
        $cursor = $this->toUk($date)->startOfDay();
        while (!$this->isWorkingDay($cursor)) {
            $cursor->addDay();
        }
        return $cursor;
    }

    private function toUk(CarbonInterface $date): Carbon
    {
        return Carbon::parse($date->toDateTimeString(), $date->getTimezone())
            ->setTimezone($this->timezone());
    }

    private function resolveTransitWorkingDays(string $serviceName, ?int $estimatedDays): ?int
    {
        if ($estimatedDays !== null && $estimatedDays >= 1) {
            return $estimatedDays;
        }

        $service = strtolower(trim($serviceName));
        if ($service === '') {
            return null;
        }

        if (
            str_contains($service, 'next day')
            || str_contains($service, 'special delivery guaranteed')
            || str_contains($service, 'tracked 24')
            || str_contains($service, '24 ')
            || str_contains($service, ' 24')
        ) {
            return 1;
        }

        if (
            str_contains($service, '2 day')
            || str_contains($service, '2-day')
            || str_contains($service, '48')
            || str_contains($service, 'tracked 48')
            || str_contains($service, 'second class')
        ) {
            return 2;
        }

        return null;
    }
}
