<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;

/**
 * Lookups the homepage editors need: which products can be featured and where a
 * homepage tile may link to. Shared by the Admin > Other > Homepage page and the
 * on-page editor so both offer the same choices.
 */
class HomepageEditorService
{
    /**
     * @return array<int, array{id: int, name: string, slug: string, brand: string, price: float, image_url: string, is_premade_design: bool}>
     */
    public function productLibrary(): array
    {
        return Product::query()
            ->with('images')
            ->orderBy('name')
            ->limit(600)
            ->get()
            ->map(function (Product $product) {
                $firstImage = $product->images->first();

                return [
                    'id' => $product->id,
                    'name' => (string) $product->name,
                    'slug' => (string) $product->slug,
                    'brand' => (string) ($product->brand ?? ''),
                    'price' => (float) ($product->price ?? 0),
                    'image_url' => (string) ($firstImage?->url ?? '/images/no-image.png'),
                    'is_premade_design' => (bool) ($product->is_premade_design ?? false),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Link targets offered when editing a homepage tile or button.
     *
     * @return array<int, array{label: string, href: string}>
     */
    public function categoryLinkOptions(): array
    {
        $special = [
            ['label' => 'New In', 'href' => '/category/new-in'],
            ['label' => 'Pre-made designs', 'href' => '/category/pre-made'],
            ['label' => 'Sale', 'href' => '/category/sale'],
            ['label' => 'Kids Clothing', 'href' => '/category/kids-clothing'],
            ['label' => 'T-Shirts', 'href' => '/category/t-shirts'],
            ['label' => 'Teddies', 'href' => '/category/teddies'],
            ['label' => 'Bags', 'href' => '/category/bags'],
            ['label' => 'Personalise a product', 'href' => '/personalise'],
        ];

        $categories = Category::query()
            ->orderBy('slug')
            ->get(['id', 'name', 'slug', 'parent_id'])
            ->map(fn (Category $category) => [
                'label' => trim(str_replace('/', ' › ', ucwords(str_replace('-', ' ', (string) $category->slug)))),
                'href' => '/category/' . ltrim((string) $category->slug, '/'),
            ])
            ->all();

        return array_values(array_merge($special, $categories));
    }
}
