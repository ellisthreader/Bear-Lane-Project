<?php

namespace Tests\Unit;

use App\Services\UkDeliveryDateService;
use Carbon\Carbon;
use Tests\TestCase;

class UkDeliveryDateServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('delivery.timezone', 'Europe/London');
        config()->set('delivery.cutoff_hour', 16);
        config()->set('delivery.uk_bank_holidays', [
            '2026-05-25',
        ]);
    }

    public function test_min_selectable_delivery_date_respects_cutoff(): void
    {
        $service = app(UkDeliveryDateService::class);

        $beforeCutoff = Carbon::parse('2026-02-23 15:00:00', 'Europe/London');
        $afterCutoff = Carbon::parse('2026-02-23 17:00:00', 'Europe/London');

        $this->assertSame('2026-02-24', $service->minSelectableDeliveryDate($beforeCutoff)->toDateString());
        $this->assertSame('2026-02-25', $service->minSelectableDeliveryDate($afterCutoff)->toDateString());
    }

    public function test_selectable_delivery_date_excludes_sunday_and_bank_holiday(): void
    {
        $service = app(UkDeliveryDateService::class);
        $now = Carbon::parse('2026-05-22 12:00:00', 'Europe/London');

        $sunday = Carbon::parse('2026-05-24', 'Europe/London');
        $bankHoliday = Carbon::parse('2026-05-25', 'Europe/London');
        $workingDay = Carbon::parse('2026-05-26', 'Europe/London');

        $this->assertFalse($service->isSelectableDeliveryDate($sunday, $now));
        $this->assertFalse($service->isSelectableDeliveryDate($bankHoliday, $now));
        $this->assertTrue($service->isSelectableDeliveryDate($workingDay, $now));
    }

    public function test_calculate_ship_date_fails_when_same_day_shipping_after_cutoff(): void
    {
        $service = app(UkDeliveryDateService::class);

        $selectedDeliveryDate = Carbon::parse('2026-02-24', 'Europe/London');
        $nowAfterCutoff = Carbon::parse('2026-02-23 17:00:00', 'Europe/London');

        $shipDate = $service->calculateShipDate($selectedDeliveryDate, 1, $nowAfterCutoff);
        $this->assertNull($shipDate);
    }

    public function test_qualifying_rates_for_delivery_date_filters_to_possible_rates(): void
    {
        $service = app(UkDeliveryDateService::class);
        $selectedDeliveryDate = Carbon::parse('2026-02-25', 'Europe/London');
        $now = Carbon::parse('2026-02-23 10:00:00', 'Europe/London');

        $rates = [
            [
                'object_id' => 'rate_1',
                'service_name' => 'Carrier Fast',
                'estimated_days' => 1,
                'amount' => 10.50,
            ],
            [
                'object_id' => 'rate_2',
                'service_name' => 'Carrier Unknown ETA',
                'estimated_days' => null,
                'amount' => 8.00,
            ],
        ];

        $qualified = $service->qualifyingRatesForDeliveryDate($rates, $selectedDeliveryDate, $now);

        $this->assertCount(1, $qualified);
        $this->assertSame('rate_1', $qualified[0]['object_id']);
        $this->assertSame('2026-02-24', $qualified[0]['ship_date']);
    }

    public function test_qualifying_rates_can_infer_next_day_from_service_name_when_eta_missing(): void
    {
        $service = app(UkDeliveryDateService::class);
        $selectedDeliveryDate = Carbon::parse('2026-02-25', 'Europe/London');
        $now = Carbon::parse('2026-02-23 10:00:00', 'Europe/London');

        $rates = [
            [
                'object_id' => 'rate_dpd',
                'service_name' => 'DPD UK Next Day',
                'estimated_days' => null,
                'amount' => 5.38,
            ],
        ];

        $qualified = $service->qualifyingRatesForDeliveryDate($rates, $selectedDeliveryDate, $now);

        $this->assertCount(1, $qualified);
        $this->assertSame('rate_dpd', $qualified[0]['object_id']);
        $this->assertSame(1, $qualified[0]['estimated_days']);
        $this->assertSame('2026-02-24', $qualified[0]['ship_date']);
    }
}
