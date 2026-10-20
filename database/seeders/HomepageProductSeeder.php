<?php

namespace Database\Seeders;

use App\Models\Image;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Services\StoreSettingsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HomepageProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'slug' => 'bear-lane-signature-tee',
                'brand' => 'Bear Lane Studio',
                'name' => 'Signature Printed Tee',
                'price' => 29.99,
                'original_price' => null,
                'description' => 'A soft premium tee finished with a signature Bear Lane print.',
                'is_trending' => true,
                'is_sale' => false,
                'is_premade_design' => false,
                'colour' => 'White',
                'images' => ['images/HomepageGenerated/signature-printed-tee.png'],
            ],
            [
                'slug' => 'bear-lane-blue-studio-tee',
                'brand' => 'Bear Lane Studio',
                'name' => 'Blue Studio Tee',
                'price' => 27.50,
                'original_price' => null,
                'description' => 'An everyday blue tee ready for a custom printed finish.',
                'is_trending' => true,
                'is_sale' => false,
                'is_premade_design' => false,
                'colour' => 'Blue',
                'images' => ['images/HomepageGenerated/blue-studio-tee.png'],
            ],
            [
                'slug' => 'bear-lane-red-statement-tee',
                'brand' => 'Bear Lane Studio',
                'name' => 'Red Statement Tee',
                'price' => 24.99,
                'original_price' => 31.99,
                'description' => 'A bold red tee made for team names, logos, and statement designs.',
                'is_trending' => true,
                'is_sale' => true,
                'is_premade_design' => false,
                'colour' => 'Red',
                'images' => ['images/HomepageGenerated/red-statement-tee.png'],
            ],
            [
                'slug' => 'bear-lane-black-essential-tee',
                'brand' => 'Bear Lane Studio',
                'name' => 'Black Essential Tee',
                'price' => 26.99,
                'original_price' => null,
                'description' => 'A versatile black tee with a clean, premium-weight finish.',
                'is_trending' => true,
                'is_sale' => false,
                'is_premade_design' => false,
                'colour' => 'Black',
                'images' => ['images/HomepageGenerated/black-essential-tee.png'],
            ],
            [
                'slug' => 'premade-wildflower-monogram',
                'brand' => 'Bear Lane Studio',
                'name' => 'Wildflower Monogram',
                'price' => 34.99,
                'original_price' => null,
                'description' => 'A delicate floral monogram template, ready to personalise.',
                'is_trending' => false,
                'is_sale' => false,
                'is_premade_design' => true,
                'colour' => 'Natural',
                'images' => ['images/HomepageGenerated/wildflower-monogram.png'],
                'quote' => 'Personalise with your initials and choice of print colours.',
            ],
            [
                'slug' => 'premade-vintage-club',
                'brand' => 'Bear Lane Studio',
                'name' => 'Vintage Club Emblem',
                'price' => 36.50,
                'original_price' => null,
                'description' => 'A heritage-inspired club emblem for teams and communities.',
                'is_trending' => false,
                'is_sale' => false,
                'is_premade_design' => true,
                'colour' => 'Navy',
                'images' => ['images/HomepageGenerated/vintage-club-emblem.png'],
                'quote' => 'Add your club name, founding year, and preferred colours.',
            ],
            [
                'slug' => 'premade-little-explorer',
                'brand' => 'Bear Lane Studio',
                'name' => 'Little Explorer Badge',
                'price' => 31.99,
                'original_price' => null,
                'description' => 'A playful adventure badge designed for children and family gifts.',
                'is_trending' => false,
                'is_sale' => false,
                'is_premade_design' => true,
                'colour' => 'Sky Blue',
                'images' => ['images/HomepageGenerated/little-explorer-badge.png'],
                'quote' => 'Customise the name and badge colours for a one-of-a-kind gift.',
            ],
            [
                'slug' => 'premade-botanical-script',
                'brand' => 'Bear Lane Studio',
                'name' => 'Botanical Script',
                'price' => 33.99,
                'original_price' => null,
                'description' => 'Elegant script lettering framed by a modern botanical motif.',
                'is_trending' => false,
                'is_sale' => false,
                'is_premade_design' => true,
                'colour' => 'Sage',
                'images' => ['images/HomepageGenerated/botanical-script.png'],
                'quote' => 'Choose a name or short phrase and we will prepare the final layout.',
            ],
        ];

        DB::transaction(function () use ($products): void {
            $featuredIds = [];
            $premadeIds = [];
            $premadeQuotes = [];

            foreach ($products as $position => $data) {
                $images = $data['images'];
                $colour = $data['colour'];
                $quote = $data['quote'] ?? null;
                unset($data['images'], $data['colour'], $data['quote']);

                $product = Product::query()->updateOrCreate(
                    ['slug' => $data['slug']],
                    $data
                );

                $product->images()->delete();
                foreach ($images as $path) {
                    Image::query()->create([
                        'imageable_id' => $product->id,
                        'imageable_type' => Product::class,
                        'path' => $path,
                    ]);
                }

                ProductVariant::query()->updateOrCreate(
                    ['sku' => 'HOMEPAGE-' . strtoupper(str_replace('-', '_', $data['slug']))],
                    [
                        'product_id' => $product->id,
                        'colour' => $colour,
                        'size' => 'M',
                        'price' => $product->price,
                        'original_price' => $product->original_price,
                        'stock' => 25,
                    ]
                );

                if ($position < 4) {
                    $featuredIds[] = $product->id;
                } else {
                    $premadeIds[] = $product->id;
                    if ($quote !== null) {
                        $premadeQuotes[(string) $product->id] = $quote;
                    }
                }
            }

            StoreSetting::query()->updateOrCreate(
                ['key' => StoreSettingsService::KEY_FRONT_PAGE_PRODUCTS],
                ['value' => [
                    'featured_product_ids' => $featuredIds,
                    'premade_product_ids' => $premadeIds,
                    'premade_quotes' => $premadeQuotes,
                ]]
            );
        });
    }
}
