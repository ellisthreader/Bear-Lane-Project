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
                'name' => 'Signature Embroidered Tee',
                'price' => 29.99,
                'original_price' => null,
                'description' => 'A soft premium tee finished with signature Bear Lane embroidery.',
                'is_trending' => true,
                'is_sale' => false,
                'is_premade_design' => false,
                'colour' => 'White',
                'images' => ['images/Products/WhiteTee1.png', 'images/Products/WhiteTee2.png'],
            ],
            [
                'slug' => 'bear-lane-blue-studio-tee',
                'brand' => 'Bear Lane Studio',
                'name' => 'Blue Studio Tee',
                'price' => 27.50,
                'original_price' => null,
                'description' => 'An everyday blue tee ready for a custom embroidered finish.',
                'is_trending' => true,
                'is_sale' => false,
                'is_premade_design' => false,
                'colour' => 'Blue',
                'images' => ['images/Products/BlueTee1.png', 'images/Products/BlueTee2.png'],
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
                'images' => ['images/Products/RedTee1.png', 'images/Products/RedTee2.png'],
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
                'images' => ['images/Products/BlackTee1.png', 'images/Products/BlackTee2.png'],
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
                'images' => ['images/Examples/Example1.png', 'images/Examples/Example1.webp'],
                'quote' => 'Personalise with your initials and choice of thread colours.',
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
                'images' => ['images/Examples/Example2.png', 'images/Examples/Example2.webp'],
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
                'images' => ['images/Examples/Example3.png', 'images/Examples/Example3.webp'],
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
                'images' => ['images/Examples/Example4.png', 'images/Examples/Example4.webp'],
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

                foreach ($images as $path) {
                    Image::query()->firstOrCreate([
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
