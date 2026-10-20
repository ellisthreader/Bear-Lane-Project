<?php

namespace Tests\Feature;

use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\DeliveryOptionService;
use App\Services\ParcelEstimatorService;
use App\Services\ProductShippingService;
use App\Services\ShippoRateService;
use App\Services\StoreSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class DeliverySettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->travelTo(now()->setDate(2026, 10, 20)->setTime(9, 0));
        $this->mock(ShippoRateService::class)->shouldReceive('getRates')->andReturn([])->byDefault();
    }

    private function settings(): StoreSettingsService
    {
        return app(StoreSettingsService::class);
    }

    public function test_admin_changes_reach_public_pages_and_checkout(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][0] = [...$delivery['methods'][0], 'label' => 'Economy post', 'price' => 3.25, 'eta_min_days' => 4, 'eta_max_days' => 6];
        $delivery['methods'][1]['enabled'] = false;
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->putJson('/admin/other/delivery', $delivery)->assertOk();
        auth()->logout();
        $this->get('/support')->assertInertia(fn ($page) => $page
            ->where('storeSettings.delivery.methods.0.label', 'Economy post')
            ->where('storeSettings.delivery.methods.0.price', 3.25)
            ->has('storeSettings.delivery.methods', 2));
        $this->postJson('/api/delivery-options', [])->assertOk()->assertJsonPath('options.0.price', 3.25)->assertJsonCount(2, 'options');
    }

    public function test_rejected_disable_all_save_does_not_change_settings(): void
    {
        $before = $this->settings()->getDeliverySettings();
        $invalid = $before;
        foreach ($invalid['methods'] as &$method) { $method['enabled'] = false; }
        $this->actingAs(User::factory()->create(['is_admin' => true]))->putJson('/admin/other/delivery', $invalid)->assertUnprocessable();
        $this->assertSame($before, $this->settings()->getDeliverySettings());
    }

    public function test_disabled_and_deleted_carriers_do_not_turn_pinned_methods_into_any_carrier(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][1]['carrier_key'] = 'dpd';
        $delivery['carriers'][2]['enabled'] = false;
        $this->settings()->saveDeliverySettings($delivery);
        $this->assertNotContains('NEXT_DAY', array_column($this->settings()->getEnabledDeliveryMethods(), 'key'));
        array_pop($delivery['carriers']);
        $this->settings()->saveDeliverySettings($delivery);
        $this->assertNotContains('NEXT_DAY', array_column($this->settings()->getEnabledDeliveryMethods(), 'key'));
    }

    public function test_updated_presets_apply_to_existing_variants_product_pages_and_stale_carts(): void
    {
        $variant = ProductVariant::factory()->for(\App\Models\Product::factory()->state(["category_id" => null]))->create([
            'parcel_courier' => 'evri', 'parcel_size_tier' => 'small', 'weight' => 2,
            'parcel_length_cm' => 45, 'parcel_width_cm' => 35, 'parcel_height_cm' => 16,
        ]);
        $delivery = $this->settings()->getDeliverySettings();
        foreach ($delivery['parcel_options'] as &$option) {
            if ($option['key'] === 'evri_small') {
                $option = [...$option, 'max_weight_kg' => 0.5, 'length_cm' => 32, 'width_cm' => 24, 'height_cm' => 4];
            }
        }
        $this->settings()->saveDeliverySettings($delivery);
        $item = ['id' => $variant->product_id, 'size' => $variant->size, 'colour' => $variant->colour, 'quantity' => 2,
            'weight_kg' => 99, 'length_cm' => 99, 'width_cm' => 99, 'height_cm' => 99, 'preferred_courier' => 'dpd'];
        $parcel = app(ParcelEstimatorService::class)->forCheckoutItems([$item]);
        $this->assertSame('1.00', $parcel['weight']);
        $this->assertSame('32.00', $parcel['length']);
        $this->assertSame('8.00', $parcel['height']);
        $this->assertSame('evri', app(ProductShippingService::class)->currentItem($item)['preferred_courier']);
        $size = $variant->size;
        $this->get('/product/'.$variant->product->slug)->assertInertia(fn ($page) => $page
            ->where("product.colourProducts.0.size_shipping.{$size}.length_cm", 32)
            ->where("product.colourProducts.0.size_shipping.{$size}.weight_kg", 0.5));
    }

    public function test_manual_and_removed_presets_keep_recorded_measurements(): void
    {
        foreach (['manual', 'removed_preset'] as $tier) {
            $variant = ProductVariant::factory()->for(\App\Models\Product::factory()->state(["category_id" => null]))->create([
                'parcel_courier' => $tier === 'manual' ? 'manual' : 'dpd', 'parcel_size_tier' => $tier,
                'weight' => 0.3, 'parcel_length_cm' => 22, 'parcel_width_cm' => 12, 'parcel_height_cm' => 3,
            ]);
            $parcel = app(ParcelEstimatorService::class)->forCheckoutItems([
                ['id' => $variant->product_id, 'size' => $variant->size, 'colour' => $variant->colour],
            ]);
            $this->assertSame('0.30', $parcel['weight']);
            $this->assertSame('22.00', $parcel['length']);
        }
    }

    public function test_live_prices_and_disabled_carriers_are_respected(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][0]['price_mode'] = 'live';
        $delivery['carriers'][2]['enabled'] = false;
        $this->settings()->saveDeliverySettings($delivery);
        $this->mock(ShippoRateService::class)->shouldReceive('getRates')->andReturn([
            ['provider' => 'DPD', 'servicelevel' => ['name' => 'Two Day'], 'amount' => '1.00', 'estimated_days' => 2],
            ['provider' => 'Evri', 'servicelevel' => ['name' => 'Standard'], 'amount' => '4.20', 'estimated_days' => 3],
        ]);
        $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()
            ->assertJsonPath('options.0.price', 4.2)->assertJsonPath('options.0.carrier_name', 'Evri');
    }

    public function test_live_method_without_rate_is_unavailable_instead_of_falling_back_to_fixed_price(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][0]['price_mode'] = 'live';
        $this->settings()->saveDeliverySettings($delivery);
        $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()->assertJsonPath('options.0.available', false);
    }

    public function test_evri_next_day_service_is_recognized_when_shippo_omits_the_numeric_estimate(): void
    {
        $this->mock(ShippoRateService::class)->shouldReceive('getRates')->andReturn([
            ['provider' => 'Hermes UK', 'servicelevel' => ['name' => 'ParcelShop Drop-Off'], 'amount' => '2.90', 'estimated_days' => null],
            ['provider' => 'Hermes UK', 'servicelevel' => ['name' => 'ParcelShop Drop-Off Next Day'], 'amount' => '4.10', 'estimated_days' => null],
        ]);

        $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()
            ->assertJsonPath('options.0.selected_shippo_service', 'Hermes UK ParcelShop Drop-Off')
            ->assertJsonPath('options.1.available', true)
            ->assertJsonPath('options.1.selected_shippo_service', 'Hermes UK ParcelShop Drop-Off Next Day')
            ->assertJsonPath('options.1.carrier_name', 'Evri')
            ->assertJsonPath('options.1.price', 7.95);
    }

    public function test_unknown_or_explicitly_slower_services_are_not_offered_as_next_day(): void
    {
        $this->mock(ShippoRateService::class)->shouldReceive('getRates')->twice()->andReturn(
            [['provider' => 'Hermes UK', 'servicelevel' => ['name' => 'ParcelShop Drop-Off'], 'amount' => '4.10', 'estimated_days' => null]],
            [['provider' => 'Hermes UK', 'servicelevel' => ['name' => 'ParcelShop Drop-Off Next Day'], 'amount' => '4.10', 'estimated_days' => 2]],
        );
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()
                ->assertJsonPath('options.1.available', false)
                ->assertJsonPath('options.1.selected_shippo_service', null);
        }
    }

    public function test_named_next_day_service_still_respects_disabled_carriers_and_order_cutoff(): void
    {
        $this->mock(ShippoRateService::class)->shouldReceive('getRates')->andReturn([
            ['provider' => 'Hermes UK', 'servicelevel' => ['name' => 'ParcelShop Drop-Off Next Day'], 'amount' => '4.10', 'estimated_days' => null],
        ]);
        $delivery = $this->settings()->getDeliverySettings();
        foreach ($delivery['carriers'] as &$carrier) {
            if ($carrier['key'] === 'evri') {
                $carrier['enabled'] = false;
            }
        }
        unset($carrier);
        $this->settings()->saveDeliverySettings($delivery);
        $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()
            ->assertJsonPath('options.1.available', false);

        foreach ($delivery['carriers'] as &$carrier) {
            if ($carrier['key'] === 'evri') {
                $carrier['enabled'] = true;
            }
        }
        unset($carrier);
        $delivery['methods'][1]['cutoff_hour'] = 22;
        $this->settings()->saveDeliverySettings($delivery);
        $this->travelTo(\Carbon\Carbon::parse('2026-10-20 22:00:00', 'Europe/London'));
        $this->postJson('/api/delivery-options', ['postcode' => 'CM2 6AT'])->assertOk()
            ->assertJsonPath('options.1.available', false);
    }

    public function test_membership_and_timed_prices_follow_owner_settings(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][0]['free_for_members'] = false;
        $delivery['methods'][2]['price'] = 12.5;
        $this->settings()->saveDeliverySettings($delivery);
        $this->postJson('/api/delivery-options', [])->assertOk()->assertJsonPath('options.2.price', 12.5);
        $this->actingAs(User::factory()->create(['is_member' => true]))->postJson('/api/delivery-options', [])->assertOk()
            ->assertJsonPath('options.0.price', 5.95)->assertJsonPath('options.2.price', 0);
    }

    public function test_disabled_method_and_changed_price_are_rejected_before_payment(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][1]['enabled'] = false;
        $this->settings()->saveDeliverySettings($delivery);
        $payload = ['email' => 'customer@example.com', 'items' => [['unit_price' => 20, 'quantity' => 1]],
            'shipping' => ['method' => 'NEXT_DAY', 'cost' => 1, 'address' => ['postcode' => 'CM2 6AT']]];
        $this->postJson('/create-payment-intent', $payload)->assertUnprocessable();
        $payload['shipping']['method'] = 'STANDARD';
        $payload['shipping']['expected_price'] = 0.01;
        $this->postJson('/create-payment-intent', $payload)->assertStatus(409)->assertJsonPath('delivery_price', 5.95);
    }

    public function test_timed_and_label_rate_filter_respects_enabled_carriers_and_pinned_services(): void
    {
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['carriers'][2]['enabled'] = false;
        $this->settings()->saveDeliverySettings($delivery);
        $rates = [
            ['provider' => 'DPD', 'servicelevel' => ['name' => 'Next Day']],
            ['provider' => 'Evri', 'servicelevel' => ['name' => 'Standard']],
            ['provider' => 'Royal Mail', 'servicelevel' => ['name' => 'Tracked 24']],
        ];
        $this->assertCount(2, $this->settings()->filterCarrierRates($rates));
        $method = [...$delivery['methods'][2], 'carrier_key' => 'royal_mail', 'service_name' => 'Tracked 24'];
        $filtered = $this->settings()->filterCarrierRates($rates, $method);
        $this->assertCount(1, $filtered);
        $this->assertSame('Royal Mail', $filtered[0]['provider']);
    }
    public function test_payment_uses_current_delivery_price_and_records_the_quote(): void
    {
        config(['services.stripe.mode' => 'test', 'services.stripe.secret' => 'sk_test_local']);
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'][0]['price'] = 3.25;
        $this->settings()->saveDeliverySettings($delivery);
        $client = \Mockery::mock(\Stripe\HttpClient\ClientInterface::class);
        $client->shouldReceive('request')->once()->withArgs(function ($method, $url, $headers, $params) {
            return $method === 'post' && $params['metadata']['delivery_price'] === 3.25
                && $params['metadata']['delivery_type'] === 'STANDARD' && $params['amount'] === 2725;
        })->andReturn([json_encode(['id' => 'pi_local', 'object' => 'payment_intent', 'client_secret' => 'pi_local_secret', 'status' => 'requires_payment_method']), 200, []]);
        \Stripe\ApiRequestor::setHttpClient($client);
        try {
            $this->postJson('/create-payment-intent', [
                'email' => 'customer@example.com', 'items' => [['unit_price' => 20, 'quantity' => 1]],
                'shipping' => ['method' => 'STANDARD', 'cost' => 1, 'expected_price' => 3.25],
            ])->assertOk()->assertJsonPath('shipping', 3.25);
        } finally {
            \Stripe\ApiRequestor::setHttpClient(\Stripe\HttpClient\CurlClient::instance());
        }
    }

    public function test_paid_delivery_quote_is_preserved_after_owner_removes_method(): void
    {
        config(['services.stripe.mode' => 'test', 'services.stripe.secret' => 'sk_test_local']);
        $variant = ProductVariant::factory()->for(\App\Models\Product::factory()->state(['category_id' => null]))->create();
        $delivery = $this->settings()->getDeliverySettings();
        $delivery['methods'] = [[...$delivery['methods'][0], 'key' => 'COLLECT', 'kind' => 'collection', 'price' => 0]];
        $this->settings()->saveDeliverySettings($delivery);
        $client = \Mockery::mock(\Stripe\HttpClient\ClientInterface::class);
        $client->shouldReceive('request')->once()->andReturn([json_encode([
            'id' => 'pi_local', 'object' => 'payment_intent', 'status' => 'succeeded',
            'metadata' => ['email' => 'customer@example.com', 'delivery_type' => 'STANDARD', 'delivery_price' => '3.25', 'shipping_total' => '3.25', 'delivery_service' => 'Evri Standard'],
        ]), 200, []]);
        \Stripe\ApiRequestor::setHttpClient($client);
        \Illuminate\Support\Facades\Storage::fake('public');
        try {
            $this->postJson('/checkout/store-order', [
                'email' => 'customer@example.com', 'payment_intent_id' => 'pi_local',
                'items' => [['id' => $variant->product_id, 'quantity' => 1, 'unit_price' => 20]],
                'totals' => ['total' => 27.25, 'shipping' => 0.01],
                'delivery' => ['firstName' => 'Test', 'lastName' => 'Customer', 'country' => 'GB'],
                'options' => ['delivery_type' => 'STANDARD', 'delivery_price' => 0.01],
            ])->assertOk()->assertJsonPath('success', true);
            $this->assertDatabaseHas('orders', ['payment_intent_id' => 'pi_local', 'delivery_price' => 3.25, 'shipping' => 3.25, 'shipping_rate' => 'Evri Standard']);
        } finally {
            \Stripe\ApiRequestor::setHttpClient(\Stripe\HttpClient\CurlClient::instance());
        }
    }

}
