<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\ProductBadgeService;
use App\Services\StoreSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display products for any category page using the full slug.
     * Supports slashed slugs like "men/shoes/trainers".
     */
    public function show(Request $request, $slug)
    {
        // Find category using exact slug stored in DB
        $categoryModel = Category::where('slug', $slug)->firstOrFail();
        $premadeQuotes = $this->premadeQuoteMap();
        $categoryIds = $this->collectCategoryTreeIds($categoryModel);

        // Load products for this category + all descendants
        $products = Product::query()
            ->where(function ($query) use ($categoryIds) {
                $query
                    ->whereHas('categories', function ($categoryQuery) use ($categoryIds) {
                        $categoryQuery->whereIn('categories.id', $categoryIds);
                    })
                    ->orWhereIn('category_id', $categoryIds);
            })
            ->with(['categories', 'images', 'variants'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->orderByDesc('is_trending')
            ->latest('products.id')
            ->get()
            ->map(fn (Product $product) => $this->attachPremadeQuote($product, $premadeQuotes));
        $badgeMap = app(ProductBadgeService::class)->badgesForCategoryScope($categoryIds);
        $products = $products->map(fn (Product $product) => $this->attachAutoBadges($product, $badgeMap));

        $isAdmin = (bool) optional($request->user())->is_admin;
        $productMode = $isAdmin && $request->boolean('product_mode');

        $allProducts = [];
        if ($productMode) {
            $allProducts = Product::query()
                ->orderBy('name')
                ->get(['id', 'name', 'brand', 'slug', 'price'])
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'brand' => $product->brand,
                    'slug' => $product->slug,
                    'price' => $product->price,
                ])
                ->values();
        }

        return Inertia::render('CategoryPage', [
            'heading'     => $categoryModel->section,
            'category'    => $categoryModel->subsection,
            'subcategory' => $categoryModel->name,
            'slug'        => $categoryModel->slug,
            'category_id' => $categoryModel->id,
            'products'    => $products,
            'product_mode' => $productMode,
            'all_products' => $allProducts,
        ]);
    }

    /**
     * Multi-segment category route.
     * Redirects to show() with the correct slug format.
     */
    public function showMulti($heading, $category, $subcategory)
    {
        // Convert URL segments to DB slug format
        $slug = strtolower("$heading/$category/$subcategory");

        return redirect()->route('category.show', ['slug' => $slug]);
    }

    /**
     * Kids category pages.
     * Example: /category/kids/girl/clothing/2-8-years/nightwear
     */
    public function kids($gender, $category, $age, $sub = null)
    {
        // Keep legacy kids route but map into the new nested slug format.
        $slug = strtolower("kids/$category");
        $categoryModel = Category::where('slug', $slug)->first();
        if (!$categoryModel) {
            $fallback = strtolower("kids/$sub");
            $categoryModel = Category::where('slug', $fallback)->firstOrFail();
        }

        $premadeQuotes = $this->premadeQuoteMap();
        $categoryIds = $this->collectCategoryTreeIds($categoryModel);

        $products = Product::query()
            ->where(function ($query) use ($categoryIds) {
                $query
                    ->whereHas('categories', function ($categoryQuery) use ($categoryIds) {
                        $categoryQuery->whereIn('categories.id', $categoryIds);
                    })
                    ->orWhereIn('category_id', $categoryIds);
            })
            ->with(['categories', 'images', 'variants'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->orderByDesc('is_trending')
            ->latest('products.id')
            ->get()
            ->map(fn (Product $product) => $this->attachPremadeQuote($product, $premadeQuotes));
        $badgeMap = app(ProductBadgeService::class)->badgesForCategoryScope($categoryIds);
        $products = $products->map(fn (Product $product) => $this->attachAutoBadges($product, $badgeMap));

        return Inertia::render('CategoryPage', [
            'heading'     => 'Kids',
            'subcategory' => $gender,
            'category'    => $category,
            'ageRaw'      => $age,
            'subRaw'      => $sub,
            'slug'        => $categoryModel->slug,
            'products'    => $products,
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function premadeQuoteMap(): array
    {
        $settings = app(StoreSettingsService::class)->getFrontPageProducts();

        return collect((array) data_get($settings, 'premade_quotes', []))
            ->mapWithKeys(fn ($quote, $id) => [(string) ((int) $id) => trim((string) $quote)])
            ->all();
    }

    private function attachPremadeQuote(Product $product, array $quotes): Product
    {
        $product->setAttribute('premade_quote', (string) ($quotes[(string) ((int) $product->id)] ?? ''));

        return $product;
    }

    /**
     * @param array<int, array<int, string>> $badgeMap
     */
    private function attachAutoBadges(Product $product, array $badgeMap): Product
    {
        $product->setAttribute('auto_badges', (array) ($badgeMap[(int) $product->id] ?? []));

        return $product;
    }

    /**
     * @return array<int>
     */
    private function collectCategoryTreeIds(Category $root): array
    {
        $categories = Category::query()->get(['id', 'parent_id']);
        $childrenByParent = [];

        foreach ($categories as $category) {
            $parentId = $category->parent_id ? (int) $category->parent_id : 0;
            $childrenByParent[$parentId][] = (int) $category->id;
        }

        $rootId = (int) $root->id;
        $queue = [$rootId];
        $seen = [];

        while (!empty($queue)) {
            $current = array_shift($queue);
            if ($current === null || isset($seen[$current])) {
                continue;
            }

            $seen[$current] = true;
            foreach ($childrenByParent[$current] ?? [] as $childId) {
                if (!isset($seen[$childId])) {
                    $queue[] = $childId;
                }
            }
        }

        return array_map('intval', array_keys($seen));
    }
}
