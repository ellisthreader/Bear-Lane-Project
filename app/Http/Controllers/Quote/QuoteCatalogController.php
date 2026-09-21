<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Feeds the "Get Quote Instantly" widget with the categories and subcategories
 * that actually exist in the admin dashboard. Nothing here is hard-coded: when
 * an admin adds, renames or removes a category the quote form follows.
 */
class QuoteCatalogController extends Controller
{
    private const FALLBACK_BASE_PRICE = 10.0;

    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id', 'sort_order']);

        $byId = $categories->keyBy('id');
        $childrenByParent = $categories->groupBy(fn (Category $category) => (string) ($category->parent_id ?? 'root'));

        // Lowest product price per category so the estimate reflects real catalogue pricing.
        $minPriceByCategory = $this->minPriceByCategory();

        $groups = [];

        foreach ($categories as $category) {
            if ($category->parent_id === null) {
                continue; // Women / Men / Kids / Sale roots are audiences, not product types.
            }

            $parent = $byId->get($category->parent_id);
            if (!$parent) {
                continue;
            }

            $hasChildren = $childrenByParent->has((string) $category->id);
            $isLeaf = !$hasChildren;

            // A group is a category directly under a root (Clothing, Accessories, ...),
            // items are its leaf descendants (T-Shirts, Bags, ...). A childless group
            // (e.g. "Bears" straight under Women) is offered as an item of itself.
            if ($parent->parent_id === null) {
                $groupLabel = $this->normalizeLabel($category->name);
                $groupKey = $this->keyFor($groupLabel);
                $groups[$groupKey] ??= ['key' => $groupKey, 'label' => $groupLabel, 'items' => []];

                if ($isLeaf) {
                    $this->addItem($groups[$groupKey], $category, $groupLabel, [$category->id], $minPriceByCategory);
                }
                continue;
            }

            if (!$isLeaf) {
                continue;
            }

            $groupCategory = $this->groupAncestor($category, $byId);
            if (!$groupCategory) {
                continue;
            }
            $groupLabel = $this->normalizeLabel($groupCategory->name);
            $groupKey = $this->keyFor($groupLabel);
            $groups[$groupKey] ??= ['key' => $groupKey, 'label' => $groupLabel, 'items' => []];
            $this->addItem($groups[$groupKey], $category, $groupLabel, [$category->id], $minPriceByCategory);
        }

        // The widget asks for gender / age group in a separate box, so product types
        // are offered as ONE flat list, de-duplicated across Women / Men / Kids / Boys / Girls.
        $flat = [];
        foreach ($groups as $group) {
            foreach ($group['items'] as $item) {
                $dedupeKey = $this->dedupeKey($item['label']);
                if (!isset($flat[$dedupeKey])) {
                    $item['group'] = '';
                    $item['path'] = $item['label'];
                    $flat[$dedupeKey] = $item;
                    continue;
                }
                $existing = $flat[$dedupeKey];
                $existing['category_ids'] = array_values(array_unique(array_merge($existing['category_ids'], $item['category_ids'])));
                $existing['slugs'] = array_values(array_unique(array_merge($existing['slugs'], $item['slugs'])));
                if ($item['base_price'] !== null) {
                    $existing['base_price'] = $existing['base_price'] === null
                        ? $item['base_price']
                        : min($existing['base_price'], $item['base_price']);
                    $existing['has_products'] = true;
                }
                $flat[$dedupeKey] = $existing;
            }
        }

        $payload = [[
            'key' => 'all',
            'label' => 'Products',
            'items' => collect($flat)->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)->values()->all(),
        ]];
        if ($flat === []) {
            $payload = [];
        }

        return response()->json([
            'groups' => $payload,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Walks up to the category sitting directly under a root (the "group").
     */
    private function groupAncestor(Category $category, Collection $byId): ?Category
    {
        $current = $category;
        $guard = 0;
        while ($current && $current->parent_id !== null && $guard++ < 12) {
            $parent = $byId->get($current->parent_id);
            if (!$parent) {
                return null;
            }
            if ($parent->parent_id === null) {
                return $current;
            }
            $current = $parent;
        }

        return null;
    }

    /**
     * @param array{key: string, label: string, items: array<string, array<string, mixed>>} $group
     * @param array<int, int> $categoryIds
     * @param array<int, float> $minPriceByCategory
     */
    private function addItem(array &$group, Category $category, string $groupLabel, array $categoryIds, array $minPriceByCategory): void
    {
        $label = $this->normalizeLabel($category->name);
        $itemKey = $this->keyFor($label);

        $prices = array_values(array_filter(array_map(
            fn (int $id) => $minPriceByCategory[$id] ?? null,
            $categoryIds
        ), fn ($price) => $price !== null && $price > 0));

        $existing = $group['items'][$itemKey] ?? null;
        $candidatePrice = $prices !== [] ? min($prices) : null;

        if ($existing) {
            // Same product type under several audiences (Women › T-Shirts, Men › T-Shirts): merge.
            $existing['category_ids'] = array_values(array_unique(array_merge($existing['category_ids'], $categoryIds)));
            $existing['slugs'][] = (string) $category->slug;
            $existing['slugs'] = array_values(array_unique($existing['slugs']));
            if ($candidatePrice !== null) {
                $existing['base_price'] = $existing['base_price'] === null
                    ? $candidatePrice
                    : min($existing['base_price'], $candidatePrice);
            }
            $group['items'][$itemKey] = $existing;
            return;
        }

        $group['items'][$itemKey] = [
            'key' => $itemKey,
            'label' => $label,
            'group' => $groupLabel,
            'path' => $groupLabel . ' → ' . $label,
            'slugs' => [(string) $category->slug],
            'category_ids' => $categoryIds,
            'base_price' => $candidatePrice,
            'has_products' => $candidatePrice !== null,
        ];
    }

    /**
     * @return array<int, float>
     */
    private function minPriceByCategory(): array
    {
        $pivot = DB::table('category_product')
            ->join('products', 'products.id', '=', 'category_product.product_id')
            ->select('category_product.category_id', DB::raw('MIN(products.price) as min_price'))
            ->groupBy('category_product.category_id')
            ->pluck('min_price', 'category_id')
            ->map(fn ($price) => (float) $price)
            ->all();

        $direct = Product::query()
            ->whereNotNull('category_id')
            ->select('category_id', DB::raw('MIN(price) as min_price'))
            ->groupBy('category_id')
            ->pluck('min_price', 'category_id')
            ->map(fn ($price) => (float) $price)
            ->all();

        foreach ($direct as $categoryId => $price) {
            $categoryId = (int) $categoryId;
            $pivot[$categoryId] = isset($pivot[$categoryId]) ? min($pivot[$categoryId], $price) : $price;
        }

        return array_map('floatval', $pivot);
    }

    private function normalizeLabel(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? $name);
        // Present product types consistently: "t-shirt" → "T-Shirt".
        return preg_replace_callback('/\b([a-z])/', fn ($m) => strtoupper($m[1]), $name) ?? $name;
    }

    /** "T-Shirt" and "T-Shirts" are the same product type for quoting. */
    private function dedupeKey(string $label): string
    {
        $key = strtolower(preg_replace('/[^a-z0-9]+/i', '', $label) ?? $label);

        return rtrim($key, 's');
    }

    private function keyFor(string $label): string
    {
        return strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $label) ?? $label, '-'));
    }

    public static function fallbackBasePrice(): float
    {
        return self::FALLBACK_BASE_PRICE;
    }
}
