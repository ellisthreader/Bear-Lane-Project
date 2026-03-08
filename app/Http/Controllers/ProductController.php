<?php

namespace App\Http\Controllers;

use App\Models\BackInStockSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Category;
use App\Models\Image;
use App\Models\ProductReview;
use App\Services\ProductBadgeService;
use App\Services\StoreSettingsService;
use App\Services\Security\RecaptchaService;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    /**
     * Display all products of a specific type
     */
    public function index($type)
    {
        $products = Product::where('type', $type)
            ->with(['images', 'variants.images'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get();

        $badgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory($products);
        $products = $products->map(fn ($product) => $this->formatProduct(
            $product,
            (array) ($badgeMap[(int) $product->id] ?? [])
        ));

        return Inertia::render('Products/Index', [
            'type' => $type,
            'products' => $products,
        ]);
    }

    /**
     * Display all products for a specific category
     */
    public function categoryProducts($slug)
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        $products = Product::where('category_id', $category->id)
            ->with(['images', 'variants.images'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get();

        $badgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory($products);
        $products = $products->map(fn ($product) => $this->formatProduct(
            $product,
            (array) ($badgeMap[(int) $product->id] ?? [])
        ));

        return Inertia::render('Products/CategoryProducts', [
            'category' => $category,
            'products' => $products,
        ]);
    }

    /**
     * Get trending products
     */
    public function trending()
    {
        $products = Product::where('is_trending', true)
            ->with(['images', 'variants.images'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get();

        $badgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory($products);
        $products = $products->map(fn ($product) => $this->formatProduct(
            $product,
            (array) ($badgeMap[(int) $product->id] ?? [])
        ));

        return $products;
    }

    /**
     * Show single product page
     */
    public function show(Request $request, $slug)
    {
        Log::info("🔎 Product requested", ['slug' => $slug]);

        $productModel = Product::where('slug', $slug)
            ->with([
                'images',
                'variants.images',
                'category.parent.parent.parent',
                'categories.parent.parent.parent',
                'approvedReviews' => fn ($query) => $query
                    ->with([
                        'user:id,username,name,avatar',
                        'images',
                    ])
                    ->latest('created_at')
                    ->limit(50),
            ])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->firstOrFail();

        $productBadgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory(collect([$productModel]));
        $product = $this->formatProduct($productModel, (array) ($productBadgeMap[(int) $productModel->id] ?? []));
        $productImageBoxes = $this->buildImageBoxesMap($productModel->images);

        // Build colourProducts for frontend
        $product->colourProducts = collect($productModel->variants)
            ->groupBy('colour')
            ->map(function ($group, $colour) use ($product, $productImageBoxes) {
                $firstVariant = $group->first();
                $variantImageBoxes = $this->buildImageBoxesMap($firstVariant->images);

                $images = $firstVariant->images->isNotEmpty()
                    ? $firstVariant->images->pluck('url')->values()->all()
                    : $product->images;

                return [
                    'colour' => $colour,
                    'slug' => $firstVariant->slug,
                    'sizes' => $group->pluck('size')->unique()->values()->all(),
                    'size_stock' => $group
                        ->mapWithKeys(fn ($variant) => [(string) $variant->size => (int) ($variant->stock ?? 0)])
                        ->all(),
                    'images' => $images,
                    'image_boxes' => count($variantImageBoxes) > 0 ? $variantImageBoxes : $productImageBoxes,
                ];
            })
            ->values()
            ->all();
        $product->image_boxes = $productImageBoxes;
        $product->breadcrumbs = $this->buildProductBreadcrumbs($productModel);
        $product->reviews = $productModel->approvedReviews
            ->map(fn (ProductReview $review) => $this->mapReview($review))
            ->values()
            ->all();
        $recommendedProducts = $this->buildRecommendedProducts($productModel);
        $isAdminEditor = (bool) optional($request->user())->is_admin && $request->boolean('product_mode');
        $isPreMadeDesign = (bool) ($productModel->is_premade_design ?? false);

        $primaryCategory = null;
        if ($productModel->relationLoaded('categories') && $productModel->categories->isNotEmpty()) {
            $primaryCategory = $productModel->categories->first();
        } elseif ($productModel->relationLoaded('category') && $productModel->category) {
            $primaryCategory = $productModel->category;
        }

        Log::info("=== colourProducts built ===", ['colourProducts' => $product->colourProducts]);

        return Inertia::render('Product/ProductLayout', [
            'product' => $product,
            'isPreMadeDesign' => $isPreMadeDesign,
            'recommendedProducts' => $recommendedProducts,
            'adminEditor' => $isAdminEditor ? [
                'enabled' => true,
                'categoryId' => $primaryCategory?->id,
                'categorySlug' => $primaryCategory?->slug,
                'categoryName' => $primaryCategory?->name,
                'premade' => $isPreMadeDesign,
            ] : null,
        ]);
    }

    public function subscribeRestock(Request $request, string $slug, RecaptchaService $recaptchaService): JsonResponse
    {
        $recaptchaService->verifyOrFail($request, 'restock_notify');

        $validated = $request->validate([
            'colour' => ['nullable', 'string', 'max:100'],
            'size' => ['required', 'string', 'max:20'],
        ]);

        $product = Product::query()
            ->where('slug', $slug)
            ->with(['variants:id,product_id,colour,size,stock'])
            ->firstOrFail();

        $normalizedColour = mb_strtolower(trim((string) ($validated['colour'] ?? '')));
        $normalizedSize = mb_strtoupper(trim((string) $validated['size']));

        $selectedVariant = $product->variants->first(function ($variant) use ($normalizedColour, $normalizedSize) {
            return mb_strtolower(trim((string) $variant->colour)) === $normalizedColour
                && mb_strtoupper(trim((string) $variant->size)) === $normalizedSize;
        });

        // Fallback matching keeps notify flow resilient to slight frontend/backend value mismatches.
        if (!$selectedVariant) {
            $selectedVariant = $product->variants->first(function ($variant) use ($normalizedSize) {
                return mb_strtoupper(trim((string) $variant->size)) === $normalizedSize;
            });
        }

        if (!$selectedVariant) {
            $selectedVariant = $product->variants->first(function ($variant) use ($normalizedColour) {
                return mb_strtolower(trim((string) $variant->colour)) === $normalizedColour;
            });
        }

        BackInStockSubscription::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'product_id' => $product->id,
                'colour' => $selectedVariant ? trim((string) $selectedVariant->colour) : trim((string) ($validated['colour'] ?? '')),
                'size' => $selectedVariant ? mb_strtoupper(trim((string) $selectedVariant->size)) : $normalizedSize,
            ],
            [
                'notified_at' => null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'You will be notified when this size is back in stock.',
        ]);
    }

    private function buildProductBreadcrumbs(Product $product): array
    {
        $candidates = collect();

        if ($product->relationLoaded('categories')) {
            $candidates = $candidates->merge($product->categories);
        }

        if ($product->relationLoaded('category') && $product->category) {
            $candidates->push($product->category);
        }

        $candidates = $candidates
            ->filter()
            ->unique('id')
            ->values();

        if ($candidates->isEmpty()) {
            return [];
        }

        $bestTrail = [];
        foreach ($candidates as $category) {
            $trail = $this->buildCategoryTrail($category);
            if (count($trail) > count($bestTrail)) {
                $bestTrail = $trail;
            }
        }

        if (empty($bestTrail)) {
            return [];
        }

        $slugs = [];
        return collect($bestTrail)
            ->map(function (Category $category) use (&$slugs) {
                $slugs[] = (string) $category->slug;

                return [
                    'label' => (string) $category->name,
                    'href' => '/category/' . implode('/', $slugs),
                ];
            })
            ->values()
            ->all();
    }

    private function buildCategoryTrail(Category $leaf): array
    {
        $trail = [];
        $seen = [];
        $current = $leaf;

        while ($current instanceof Category && !in_array($current->id, $seen, true)) {
            array_unshift($trail, $current);
            $seen[] = $current->id;
            $current = $current->parent;
        }

        return $trail;
    }

    private function buildRecommendedProducts(Product $product): array
    {
        $categoryIds = collect();

        if ($product->relationLoaded('category') && $product->category) {
            $categoryIds->push((int) $product->category->id);
        }

        if ($product->relationLoaded('categories')) {
            $categoryIds = $categoryIds->merge($product->categories->pluck('id')->map(fn ($id) => (int) $id));
        }

        $categoryIds = $categoryIds->unique()->values();

        $query = Product::query()
            ->where('id', '!=', $product->id)
            ->with(['images']);

        if ($categoryIds->isNotEmpty()) {
            $query->where(function ($q) use ($categoryIds) {
                $q->whereIn('category_id', $categoryIds->all())
                    ->orWhereHas('categories', function ($categoryQuery) use ($categoryIds) {
                        $categoryQuery->whereIn('categories.id', $categoryIds->all());
                    });
            });
        } else {
            $query->where('is_trending', true);
        }

        $recommended = $query
            ->orderByDesc('is_trending')
            ->latest('id')
            ->limit(8)
            ->get();

        $badgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory($recommended);

        return $recommended
            ->map(fn (Product $item) => $this->formatProductTile(
                $item,
                (array) ($badgeMap[(int) $item->id] ?? [])
            ))
            ->values()
            ->all();
    }

    /**
     * @param array<int, string> $autoBadges
     */
    private function formatProductTile(Product $product, array $autoBadges = []): array
    {
        $image = $product->images->first();

        return [
            'id' => (int) $product->id,
            'name' => (string) $product->name,
            'slug' => (string) $product->slug,
            'brand' => (string) ($product->brand ?? ''),
            'price' => (float) ($product->price ?? 0),
            'image' => $image ? $image->url : '/images/no-image.png',
            'is_premade_design' => (bool) ($product->is_premade_design ?? false),
            'premade_quote' => $this->premadeQuoteForProductId((int) $product->id),
            'auto_badges' => array_values(array_unique(array_map('strval', $autoBadges))),
            'average_rating' => isset($product->average_rating) ? round((float) $product->average_rating, 2) : 0,
            'reviews_count' => (int) ($product->reviews_count ?? 0),
        ];
    }

    /**
     * Format a product for frontend
     */
    /**
     * @param array<int, string> $autoBadges
     */
    private function formatProduct($product, array $autoBadges = [])
    {
        $product->slug = (string) $product->slug;

        $allColours = $product->variants->pluck('colour')->unique()->values()->all();
        $allSizes   = $product->variants->pluck('size')->unique()->values()->all();

        $productImages = $product->images
            ->map(fn ($img) => $img->url)
            ->values()
            ->all();

        // Ensure each variant includes images
        $product->variants->transform(function ($variant) {
            $variant->images = $variant->images ?? collect([]);
            return $variant;
        });

        Log::info("=== Product formatted ===", [
            'id' => $product->id,
            'name' => $product->name,
            'colours' => $allColours,
            'sizes' => $allSizes,
            'images' => $productImages
        ]);

        return (object)[
            'id' => $product->id,
            'brand' => $product->brand,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'price' => $product->price,
            'original_price' => $product->original_price,
            'is_trending' => $product->is_trending,
            'is_premade_design' => (bool) ($product->is_premade_design ?? false),
            'premade_quote' => $this->premadeQuoteForProductId((int) $product->id),
            'auto_badges' => array_values(array_unique(array_map('strval', $autoBadges))),
            'images' => $productImages,
            'sizes' => $allSizes,
            'colour' => $allColours,
            'average_rating' => isset($product->average_rating) ? round((float) $product->average_rating, 2) : 0,
            'rating' => isset($product->average_rating) ? round((float) $product->average_rating, 2) : 0,
            'review_count' => (int) ($product->reviews_count ?? 0),
            'reviews_count' => (int) ($product->reviews_count ?? 0),
            'variants' => $product->variants,
            'colourProducts' => [], // will be filled in `show`
            'reviews' => [],
        ];
    }

    private function buildImageBoxesMap($images): array
    {
        if (!$images) {
            return [];
        }

        return collect($images)
            ->mapWithKeys(function (Image $image) {
                $box = $this->imageRestrictedBox($image);
                if (!$box) {
                    return [];
                }

                return [
                    $image->url => $box,
                ];
            })
            ->all();
    }

    private function imageRestrictedBox(Image $image): ?array
    {
        $left = $image->restricted_left;
        $top = $image->restricted_top;
        $width = $image->restricted_width;
        $height = $image->restricted_height;

        if (
            $left === null ||
            $top === null ||
            $width === null ||
            $height === null
        ) {
            return null;
        }

        return [
            'left' => (float) $left,
            'top' => (float) $top,
            'width' => (float) $width,
            'height' => (float) $height,
        ];
    }

    private function mapReview(ProductReview $review): array
    {
        $username = trim((string) ($review->user?->username ?: $review->user?->name ?: $review->username_snapshot ?: 'Customer'));

        $avatarUrl = null;
        if ($review->user && $review->user->avatar_url) {
            $avatarUrl = $review->user->avatar_url;
        } elseif (is_string($review->avatar_url_snapshot) && trim($review->avatar_url_snapshot) !== '') {
            $snapshot = trim($review->avatar_url_snapshot);
            $avatarUrl = str_starts_with($snapshot, 'http://') || str_starts_with($snapshot, 'https://')
                ? $snapshot
                : asset('storage/' . ltrim($snapshot, '/'));
        }

        return [
            'id' => $review->id,
            'rating' => (float) ($review->rating ?? 0),
            'message' => (string) ($review->message ?? ''),
            'title' => (string) ($review->title ?? ''),
            'created_at' => optional($review->created_at)->toIso8601String(),
            'is_verified_purchase' => true,
            'user' => [
                'username' => $username,
                'avatar_url' => $avatarUrl,
            ],
            'images' => $review->images
                ->map(fn ($image) => $image->image_url)
                ->filter(fn ($url) => is_string($url) && trim($url) !== '')
                ->values()
                ->all(),
        ];
    }

    private function premadeQuoteForProductId(int $productId): string
    {
        if ($productId <= 0) {
            return '';
        }

        static $quoteMap = null;
        if (!is_array($quoteMap)) {
            $frontPage = app(StoreSettingsService::class)->getFrontPageProducts();
            $quoteMap = collect((array) data_get($frontPage, 'premade_quotes', []))
                ->mapWithKeys(fn ($quote, $id) => [(int) $id => trim((string) $quote)])
                ->all();
        }

        return (string) ($quoteMap[$productId] ?? '');
    }
}
