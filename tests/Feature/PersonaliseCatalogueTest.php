<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StoreSetting;
use App\Services\PersonaliseCatalogueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PersonaliseCatalogueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Migrations insert demo products; isolate each catalogue scenario.
        Product::query()->delete();
        StoreSetting::query()->where('key', PersonaliseCatalogueService::SETTING_KEY)->delete();
    }

    private function product(string $slug, bool $premade = false): Product
    {
        return Product::create([
            'name' => ucfirst($slug), 'slug' => $slug, 'brand' => 'Bear Lane',
            'price' => 12, 'is_premade_design' => $premade,
        ]);
    }

    private function selection(array $ids): void
    {
        StoreSetting::updateOrCreate(['key' => PersonaliseCatalogueService::SETTING_KEY], ['value' => [
            'groups' => [['key' => 'favourites', 'label' => 'Favourites', 'product_ids' => $ids]],
        ]]);
    }

    public function test_unconfigured_picker_shows_shop_products_and_their_options(): void
    {
        $product = $this->product('tee');
        $this->product('premade', true);
        $product->variants()->create(['sku' => 'TEE-W-M', 'colour' => 'White', 'size' => 'M', 'stock' => 5]);
        $product->images()->create(['path' => 'images/BL-Logo.png']);

        $this->get('/personalise')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Personalise/PickProduct')
            ->has('catalogue.groups', 1)
            ->has('catalogue.groups.0.products', 1)
            ->where('catalogue.groups.0.products.0.id', $product->id)
            ->where('catalogue.groups.0.products.0.slug', 'tee')
            ->where('catalogue.groups.0.products.0.colours.0.name', 'White')
            ->where('catalogue.groups.0.products.0.sizes_by_colour.White', ['M'])
            ->where('catalogue.groups.0.products.0.image_url', asset('images/BL-Logo.png')));
        $this->assertDatabaseMissing('store_settings', ['key' => PersonaliseCatalogueService::SETTING_KEY]);
    }

    public function test_empty_and_deleted_selections_fall_back_without_rewriting_admin_settings(): void
    {
        $product = $this->product('tee');
        foreach ([[], [99999]] as $ids) {
            $this->selection($ids);
            $service = app(PersonaliseCatalogueService::class);
            $this->assertSame([$product->id], $service->getStorefrontCatalogue()['groups'][0]['product_ids']);
            $this->assertSame($ids, $service->getGroups()[0]['product_ids']);
        }
    }

    public function test_valid_curated_groups_keep_their_selection_and_order(): void
    {
        $first = $this->product('tee');
        $second = $this->product('bag');
        $this->product('unselected');
        $this->selection([$first->id, $second->id]);
        $group = app(PersonaliseCatalogueService::class)->getStorefrontCatalogue()['groups'][0];
        $this->assertSame('Favourites', $group['label']);
        $this->assertSame([$first->id, $second->id], array_column($group['products'], 'id'));
    }

    public function test_empty_state_is_used_when_no_personalisable_products_exist(): void
    {
        $this->product('premade', true);
        $this->assertSame([], app(PersonaliseCatalogueService::class)->getStorefrontCatalogue()['groups']);
    }
}
