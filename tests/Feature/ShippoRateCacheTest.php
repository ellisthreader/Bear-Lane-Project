<?php

namespace Tests\Feature;

use App\Services\ShippoRateService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShippoRateCacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array']);
        Cache::store('array')->flush();
        Http::preventStrayRequests();
    }

    public function test_switching_to_live_credentials_does_not_reuse_test_rates(): void
    {
        Http::fake([
            'api.goshippo.com/v1/shipments' => Http::sequence()
                ->push(['rates' => [['object_id' => 'test-rate', 'test' => true]]])
                ->push(['rates' => [['object_id' => 'live-rate', 'test' => false]]]),
        ]);
        $service = app(ShippoRateService::class);
        $address = ['country' => 'GB', 'zip' => 'CM2 6AT'];
        $parcel = ['weight' => '1', 'mass_unit' => 'kg'];

        config(['services.shippo.token' => 'shippo_test_fixture']);
        $this->assertSame('test-rate', $service->getRates($address, $address, $parcel)[0]['object_id']);
        config(['services.shippo.token' => 'shippo_live_fixture']);
        $this->assertSame('live-rate', $service->getRates($address, $address, $parcel)[0]['object_id']);
        $this->assertFalse($service->getRates($address, $address, $parcel)[0]['test']);
        Http::assertSentCount(2);
    }

    public function test_carrier_account_caches_are_isolated_between_credentials(): void
    {
        Http::fake([
            'api.goshippo.com/carrier_accounts*' => Http::sequence()
                ->push(['results' => [['carrier' => 'hermes_uk', 'active' => true, 'object_id' => 'account-a']]])
                ->push(['results' => [['carrier' => 'royal_mail', 'active' => true, 'object_id' => 'account-b']]]),
        ]);
        $service = app(ShippoRateService::class);
        config(['services.shippo.token' => 'shippo_live_fixture_a']);
        $this->assertSame('account-a', $service->getCarrierAccounts()[0]['object_id']);
        config(['services.shippo.token' => 'shippo_live_fixture_b']);
        $this->assertSame('account-b', $service->getCarrierAccounts()[0]['object_id']);
        config(['services.shippo.token' => 'shippo_live_fixture_a']);
        $this->assertSame('account-a', $service->getCarrierAccounts()[0]['object_id']);
        Http::assertSentCount(2);
    }
}
