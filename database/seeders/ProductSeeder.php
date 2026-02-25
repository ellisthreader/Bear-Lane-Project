<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Image;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [

            // 🔥 CLOUDMONSTER (ONE PRODUCT, 2 COLOURS)
            [
                'brand'          => 'On Running',
                'name'           => 'Cloudmonster',
                'slug'           => 'cloudmonster', // merged slug
                'description'    => 'The Cloudmonster running shoe from On Running.',
                'price'          => 160,
                'original_price' => null,
                'is_trending'    => true,
                'categories'     => ['men-shoes-trainers','women-shoes-trainers'],

                // Base images (neutral, not colour-specific)
                'images' => [
                    'images/Trending/cloudtecB1.png',
                    'images/Trending/cloudtecB2.png',
                    'images/Trending/cloudtecB3.png',
                    'images/Trending/cloudtecB4.png',
                ],

                'variants' => [
                    [
                        'colour' => 'Black',
                        'sizes'  => ['7','8','9','10','11','12'],
                        'images' => [
                            'images/Trending/cloudtecB1.png',
                            'images/Trending/cloudtecB2.png',
                            'images/Trending/cloudtecB3.png',
                            'images/Trending/cloudtecB4.png',
                        ],
                    ],
                    [
                        'colour' => 'White',
                        'sizes'  => ['7','8','9','10','11','12'],
                        'images' => [
                            'images/Trending/cloudtecW1.png',
                            'images/Trending/cloudtecW2.png',
                            'images/Trending/cloudtecW3.png',
                            'images/Trending/cloudtecB4.png',
                        ],
                    ],
                ],
            ],

            // Pegasus (Blue)
            [
                'brand'          => 'Nike',
                'name'           => 'Air Zoom Pegasus 40 - Blue',
                'slug'           => 'air-zoom-pegasus-40-blue',
                'description'    => 'The Nike Air Zoom Pegasus 40 for everyday running.',
                'price'          => 140,
                'original_price' => 170,
                'is_trending'    => false,
                'categories'     => ['men-shoes-trainers'],
                'images' => [
                    'images/Trending/pegasusB1.png',
                    'images/Trending/pegasusB2.png',
                ],
                'variants' => [
                    [
                        'colour' => 'Blue',
                        'sizes'  => ['7','8','9','10','11','12'],
                        'images' => [
                            'images/Products/BlueTee1.png',
                            'images/Products/BlueTee2.png',
                            'images/Products/BlueTee3.png',
                            'images/Products/BlueTee4.png',
                        ],
                    ],
                ],
            ],

            // Pegasus (Red)
            [
                'brand'          => 'Nike',
                'name'           => 'Air Zoom Pegasus 40 - Red',
                'slug'           => 'air-zoom-pegasus-40-red',
                'description'    => 'The Nike Air Zoom Pegasus 40 for everyday running.',
                'price'          => 140,
                'original_price' => 170,
                'is_trending'    => false,
                'categories'     => ['women-shoes-trainers'],
                'images' => [
                    'images/Trending/pegasusR1.png',
                    'images/Trending/pegasusR2.png',
                ],
                'variants' => [
                    [
                        'colour' => 'Red',
                        'sizes'  => ['7','8','9','10','11','12'],
                        'images' => [
                            'images/Products/RedTee1.png',
                            'images/Products/RedTee2.png',
                            'images/Products/RedTee3.png',
                            'images/Products/RedTee4.png',
                        ],
                    ],
                ],
            ],

            // GUCCI GG Monogram Print Silk Shirt
            [
                'brand'          => 'GUCCI',
                'name'           => 'GG Monogram Print Silk Shirt',
                'slug'           => 'gg-monogram-print-silk-shirt',
                'description'    => 'Luxury GG Monogram silk shirt from Gucci.',
                'price'          => 1000,
                'original_price' => 1400,
                'is_trending'    => true,
                'categories'     => ['men-accessories-hats','women-clothing-t-shirts'],
                'images' => [
                    'images/Products/GG/GGSilkShirt1.avif',
                    'images/Products/GG/GGSilkShirt2.avif',
                ],
                'variants' => [
                    [
                        'colour' => 'Brown Blue Mc',
                        'sizes'  => ['6','8','10'],
                        'images' => [
                            'images/Products/BrownTee1.png',
                            'images/Products/BrownTee2.png',
                            'images/Products/BrownTee3.png',
                            'images/Products/BrownTee4.png',
                        ],
                    ],
                ],
            ],

            // WHITE TEE WITH FULL COLOUR SET
            [
                'brand'          => 'Basic Apparel',
                'name'           => 'White Tee',
                'slug'           => 'white-tee',
                'description'    => 'Classic white T-shirt for everyday wear.',
                'price'          => 25.99,
                'original_price' => null,
                'is_trending'    => false,
                'categories'     => ['men-clothing-t-shirts'],
                'images' => [
                    'images/Products/WhiteTee1.png',
                    'images/Products/WhiteTee2.png',
                    'images/Products/WhiteTee3.png',
                    'images/Products/WhiteTee4.png',
                ],
                'variants' => [
                    [
                        'colour' => 'White',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/WhiteTee1.png',
                            'images/Products/WhiteTee2.png',
                            'images/Products/WhiteTee3.png',
                            'images/Products/WhiteTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Red',
                        'sizes'  => ['XS','S','M','L','XXL'],
                        'images' => [
                            'images/Products/RedTee1.png',
                            'images/Products/RedTee2.png',
                            'images/Products/RedTee3.png',
                            'images/Products/RedTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Blue',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/BlueTee1.png',
                            'images/Products/BlueTee2.png',
                            'images/Products/BlueTee3.png',
                            'images/Products/BlueTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Green',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/GreenTee1.png',
                            'images/Products/GreenTee2.png',
                            'images/Products/GreenTee3.png',
                            'images/Products/GreenTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Purple',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/PurpleTee1.png',
                            'images/Products/PurpleTee2.png',
                            'images/Products/PurpleTee3.png',
                            'images/Products/PurpleTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Grey',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/GreyTee1.png',
                            'images/Products/GreyTee2.png',
                            'images/Products/GreyTee3.png',
                            'images/Products/GreyTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Black',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/BlackTee1.png',
                            'images/Products/BlackTee2.png',
                            'images/Products/BlackTee3.png',
                            'images/Products/BlackTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Yellow',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/YellowTee1.png',
                            'images/Products/YellowTee2.png',
                            'images/Products/YellowTee3.png',
                            'images/Products/YellowTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Orange',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/OrangeTee1.png',
                            'images/Products/OrangeTee2.png',
                            'images/Products/OrangeTee3.png',
                            'images/Products/OrangeTee4.png',
                        ],
                    ],
                    [
                        'colour' => 'Brown',
                        'sizes'  => ['XS','S','M','L','XL','XXL'],
                        'images' => [
                            'images/Products/BrownTee1.png',
                            'images/Products/BrownTee2.png',
                            'images/Products/BrownTee3.png',
                            'images/Products/BrownTee4.png',
                        ],
                    ],
                ],
            ],
        ];

        // ------------------------------------------------------------
        // CREATE PRODUCTS + CATEGORY LINKS + IMAGES + VARIANTS
        // ------------------------------------------------------------

        foreach ($products as $data) {

            $variantData = $data['variants'];
            unset($data['variants']);

            $categorySlugs = $data['categories'];
            unset($data['categories']);

            // Extract base images & remove before Product::create()
            $baseImages = $data['images'];
            unset($data['images']);

            // Create product
            $product = Product::create($data);

            // Categories
            $categoryIds = Category::whereIn('slug', $categorySlugs)->pluck('id');
            $product->categories()->syncWithoutDetaching($categoryIds);

            // Base images
            foreach ($baseImages as $img) {
                Image::create([
                    'imageable_id'   => $product->id,
                    'imageable_type' => Product::class,
                    'path'           => $img,
                ]);
            }

            // Variants
            foreach ($variantData as $variant) {
                foreach ($variant['sizes'] as $size) {

                    $variantModel = ProductVariant::create([
                        'product_id'     => $product->id,
                        'sku'            => strtoupper(Str::random(10)),
                        'colour'         => $variant['colour'],
                        'size'           => $size,
                        'price'          => $product->price,
                        'original_price' => $product->original_price,
                        'stock'          => 10,
                    ]);

                    foreach ($variant['images'] as $variantImg) {
                        Image::create([
                            'imageable_id'   => $variantModel->id,
                            'imageable_type' => ProductVariant::class,
                            'path'           => $variantImg,
                        ]);
                    }
                }
            }
        }
    }
}
