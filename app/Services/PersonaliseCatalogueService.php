<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StoreSetting;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * The "Pick your product" catalogue: groups of products customers can personalise
 * from the homepage, managed by the admin under Other > Personalise.
 */
class PersonaliseCatalogueService
{
    public const SETTING_KEY = 'personalise_catalogue';

    public const MAX_GROUPS = 12;
    public const MAX_PRODUCTS_PER_GROUP = 40;

    /** Swatch colours for common colour names so the storefront can draw circles. */
    public const COLOUR_HEX = [
        'white' => '#F7F5F0',
        'black' => '#1C1B1A',
        'navy' => '#1F2A44',
        'grey' => '#9A9A98',
        'gray' => '#9A9A98',
        'pink' => '#F4B6C6',
        'blue' => '#9CC4E8',
        'lilac' => '#CBB6E6',
        'purple' => '#8E6BB8',
        'green' => '#4E8A5B',
        'beige' => '#D9C7A6',
        'cream' => '#F3ECD8',
        'natural' => '#E7DCC3',
        'red' => '#C63B3B',
        'yellow' => '#F2D35B',
        'orange' => '#F0964B',
        'brown' => '#7A5232',
        'burgundy' => '#6E1F2E',
        'olive' => '#7A7B3A',
        'khaki' => '#C8B98A',
        'teal' => '#2E7D82',
        'peach' => '#F6C9AC',
        'rust' => '#B7410E',
        'sage' => '#A7B79A',
        'sky blue' => '#9CC4E8',
    ];

    /**
     * Raw stored groups (no product hydration).
     *
     * @return array<int, array{key:string,label:string,description:string,product_ids:array<int,int>}>
     */
    public function getGroups(): array
    {
        $record = StoreSetting::query()->where('key', self::SETTING_KEY)->first();
        $stored = $record && is_array($record->value) ? $record->value : [];
        $groups = $this->normalizeGroups((array) ($stored['groups'] ?? []));

        return $groups !== [] ? $groups : $this->defaultGroups();
    }

    /**
     * Groups with their products hydrated for the storefront and the admin page.
     *
     * @return array{groups: array<int, array<string, mixed>>}
     */
    public function getCatalogue(): array
    {
        $groups = $this->getGroups();
        $ids = collect($groups)->pluck('product_ids')->flatten()->map(fn ($id) => (int) $id)->unique()->values();

        $products = $ids->isEmpty()
            ? collect()
            : Product::query()
                ->with(['images', 'variants.images'])
                ->whereIn('id', $ids->all())
                ->get()
                ->keyBy('id');

        return [
            'groups' => array_values(array_map(function (array $group) use ($products) {
                $items = [];
                foreach ($group['product_ids'] as $id) {
                    $product = $products->get((int) $id);
                    if ($product) {
                        $items[] = $this->presentProduct($product);
                    }
                }

                return [
                    'key' => $group['key'],
                    'label' => $group['label'],
                    'description' => $group['description'],
                    'product_ids' => array_values(array_map('intval', $group['product_ids'])),
                    'products' => $items,
                ];
            }, $groups)),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{groups: array<int, array<string, mixed>>}
     */
    public function save(array $payload): array
    {
        $groups = $this->normalizeGroups((array) ($payload['groups'] ?? []));

        StoreSetting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => ['groups' => $groups]]
        );

        return $this->getCatalogue();
    }

    /**
     * @return array<string, mixed>
     */
    public function presentProduct(Product $product): array
    {
        $productImage = $product->images->first()?->url ?? asset('images/placeholder.jpg');

        $byColour = collect($product->variants)->groupBy(fn ($variant) => trim((string) $variant->colour));
        $colours = [];
        $sizesByColour = [];
        foreach ($byColour as $colour => $variants) {
            $colour = (string) $colour;
            if ($colour === '') {
                continue;
            }
            $first = $variants->first();
            $image = $first?->images?->first()?->url ?? $productImage;
            $colours[] = [
                'name' => $colour,
                'image_url' => $image,
                'hex' => self::COLOUR_HEX[strtolower($colour)] ?? null,
            ];
            $sizesByColour[$colour] = $variants
                ->pluck('size')
                ->map(fn ($size) => trim((string) $size))
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        $allSizes = collect($sizesByColour)->flatten()->unique()->values()->all();

        return [
            'id' => (int) $product->id,
            'name' => (string) $product->name,
            'slug' => (string) $product->slug,
            'brand' => (string) ($product->brand ?? ''),
            'price' => (float) ($product->price ?? 0),
            'description' => (string) ($product->description ?? ''),
            'image_url' => $productImage,
            'colours' => $colours,
            'sizes' => $allSizes,
            'sizes_by_colour' => $sizesByColour,
        ];
    }

    /**
     * Product library for the admin picker.
     *
     * @return array<int, array<string, mixed>>
     */
    public function productLibrary(): array
    {
        return Product::query()
            ->with('images')
            ->orderBy('name')
            ->limit(800)
            ->get()
            ->map(fn (Product $product) => [
                'id' => (int) $product->id,
                'name' => (string) $product->name,
                'slug' => (string) $product->slug,
                'brand' => (string) ($product->brand ?? ''),
                'price' => (float) ($product->price ?? 0),
                'image_url' => $product->images->first()?->url ?? asset('images/placeholder.jpg'),
                'is_premade_design' => (bool) ($product->is_premade_design ?? false),
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<int, mixed> $groups
     * @return array<int, array{key:string,label:string,description:string,product_ids:array<int,int>}>
     */
    private function normalizeGroups(array $groups): array
    {
        $seenKeys = [];
        $normalized = [];

        foreach (array_slice(array_values($groups), 0, self::MAX_GROUPS) as $group) {
            if (!is_array($group)) {
                continue;
            }

            $label = Str::limit(trim((string) ($group['label'] ?? '')), 60, '');
            if ($label === '') {
                continue;
            }

            $key = Str::slug((string) ($group['key'] ?? $label));
            if ($key === '') {
                $key = Str::slug($label) ?: 'group';
            }
            $base = $key;
            $suffix = 2;
            while (in_array($key, $seenKeys, true)) {
                $key = "{$base}-{$suffix}";
                $suffix++;
            }
            $seenKeys[] = $key;

            $ids = collect((array) ($group['product_ids'] ?? []))
                ->map(fn ($id) => (int) $id)
                ->filter(fn (int $id) => $id > 0)
                ->unique()
                ->take(self::MAX_PRODUCTS_PER_GROUP)
                ->values()
                ->all();

            $normalized[] = [
                'key' => $key,
                'label' => $label,
                'description' => Str::limit(trim((string) ($group['description'] ?? '')), 200, ''),
                'product_ids' => $ids,
            ];
        }

        return $normalized;
    }

    /**
     * Default groups, resolved from the seeded product slugs.
     *
     * @return array<int, array{key:string,label:string,description:string,product_ids:array<int,int>}>
     */
    /**
     * Default groups shown until the admin picks products under Other > Personalise.
     *
     * @return array<int, array{key:string,label:string,description:string,product_ids:array<int,int>}>
     */
    private function defaultGroups(): array
    {
        return [
            ['key' => 'baby', 'label' => 'Baby', 'description' => 'Bodysuits in soft cotton with a choice of colours.', 'product_ids' => []],
            ['key' => 'adults', 'label' => 'Adults', 'description' => "Women's and men's t-shirts.", 'product_ids' => []],
            ['key' => 'children', 'label' => 'Children', 'description' => "Girls' and boys' t-shirts.", 'product_ids' => []],
            ['key' => 'bags', 'label' => 'Bags', 'description' => 'Cotton tote bags.', 'product_ids' => []],
        ];
    }

    /**
     * @return Collection<int, Product>
     */
    public function productsFor(array $ids): Collection
    {
        return Product::query()->whereIn('id', $ids)->get();
    }
}
