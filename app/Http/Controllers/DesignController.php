<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\SavedDesign;
use App\Models\Image;
use App\Services\ProductBadgeService;
use App\Services\StoreSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class DesignController extends Controller
{
    /**
     * ---------------------------------------------------------
     * SHOW DESIGN PAGE (INITIAL LOAD BY SLUG)
     * ---------------------------------------------------------
     */
    public function show(Request $request, string $slug)
    {
        $selectedColour = $request->query('colour');
        $selectedSize   = $request->query('size');
        $selectedDesignType = $request->query('designType');
        $savedDesignId  = $request->query('savedDesign');

        // Fetch product by slug instead of default ID binding
        $product = Product::with(['images', 'variants.images', 'categories'])
            ->where('slug', $slug)
            ->firstOrFail();

        Log::info("=== DesignController@show ===", [
            'slug'   => $slug,
            'colour' => $selectedColour,
            'size'   => $selectedSize,
            'design_type' => $selectedDesignType,
        ]);

        // Build colour products
        $this->attachColourProducts($product);

        // -------------------------------
        // CATEGORY HELPERS
        // -------------------------------
        $premadeQuotesById = collect((array) data_get(app(StoreSettingsService::class)->getFrontPageProducts(), 'premade_quotes', []))
            ->mapWithKeys(fn ($quote, $id) => [(int) $id => trim((string) $quote)])
            ->all();

        $mapProducts = function ($products) use ($premadeQuotesById) {
            $badgeMap = app(ProductBadgeService::class)->badgesForVisibleProductsByCategory($products);

            return $products->map(function ($p) use ($premadeQuotesById, $badgeMap) {
                $images = $p->images->isNotEmpty()
                    ? $p->images->pluck('path')->map(fn($path) => asset($path))->all()
                    : [];

                return [
                    'id'             => $p->id,
                    'name'           => $p->name,
                    'slug'           => $p->slug,
                    'brand'          => $p->brand,
                    'price'          => $p->price,
                    'original_price' => $p->original_price,
                    'is_premade_design' => (bool) ($p->is_premade_design ?? false),
                    'premade_quote' => (string) ($premadeQuotesById[(int) $p->id] ?? ''),
                    'auto_badges' => (array) ($badgeMap[(int) $p->id] ?? []),
                    'images'         => $images,
                ];
            })->values()->all();
        };

        // Adult categories
        $adultCategories = Category::with('parent')
            ->whereNull('age_group')
            ->orderBy('section')
            ->get()
            ->map(function ($cat) use ($mapProducts) {
                return [
                    'id'       => $cat->id,
                    'name'     => $cat->name,
                    'slug'     => $cat->slug,
                    'section'  => $cat->section,
                    'subsection' => $cat->subsection,
                    'age_group' => $cat->age_group,
                    'parent_name' => $cat->parent?->name,
                    'products' => $mapProducts($cat->products()->with('images')->get()),
                ];
            });

        // Kids categories
        $kidsCategories = Category::with('parent')
            ->whereNotNull('age_group')
            ->orderBy('age_group')
            ->orderBy('section')
            ->get()
            ->groupBy('age_group')
            ->map(function ($group) use ($mapProducts) {
                return $group->map(function ($cat) use ($mapProducts) {
                    return [
                        'id'        => $cat->id,
                        'name'      => $cat->name,
                        'slug'      => $cat->slug,
                        'section'   => $cat->section,
                        'subsection' => $cat->subsection,
                        'age_group' => $cat->age_group,
                        'parent_name' => $cat->parent?->name,
                        'products'  => $mapProducts($cat->products()->with('images')->get()),
                    ];
                })->values();
            });

        // Related products
        $categoryNames = $product->categories->pluck('name')->unique();
        $relatedProducts = Product::with('images')
            ->whereHas('categories', fn($q) => $q->whereIn('name', $categoryNames))
            ->where('id', '!=', $product->id)
            ->get();

        $savedDesigns = [];
        $initialSavedDesign = null;

        if ($request->user()) {
            $savedDesigns = SavedDesign::with(['product.images'])
                ->where('user_id', $request->user()->id)
                ->latest('updated_at')
                ->get()
                ->map(function (SavedDesign $savedDesign) {
                    return [
                        'id' => $savedDesign->id,
                        'name' => $savedDesign->name,
                        'product' => [
                            'id' => $savedDesign->product?->id,
                            'name' => $savedDesign->product?->name,
                            'slug' => $savedDesign->product?->slug,
                            'images' => $savedDesign->product?->images
                                ? $savedDesign->product->images->pluck('url')->values()->all()
                                : [],
                        ],
                        'previewImage' => data_get($savedDesign->design_payload, 'compositePngByView.front')
                            ?: data_get(
                                $savedDesign->design_payload,
                                'compositePngByView.' . data_get($savedDesign->design_payload, 'currentViewKey')
                            )
                            ?: $savedDesign->product?->images?->first()?->url,
                        'updatedAt' => $savedDesign->updated_at?->toIso8601String(),
                        'payload' => $savedDesign->design_payload,
                    ];
                })
                ->values()
                ->all();

            if ($savedDesignId) {
                $matchedSavedDesign = SavedDesign::where('user_id', $request->user()->id)
                    ->where('id', $savedDesignId)
                    ->first();

                if ($matchedSavedDesign) {
                    $initialSavedDesign = [
                        'id' => $matchedSavedDesign->id,
                        'name' => $matchedSavedDesign->name,
                        'payload' => $matchedSavedDesign->design_payload,
                    ];
                }
            }
        }

        return Inertia::render('Design/Design', [
            'product'         => $product,
            'selectedColour'  => $selectedColour,
            'selectedSize'    => $selectedSize,
            'selectedDesignType' => $selectedDesignType,
            'adultCategories' => $adultCategories,
            'kidsCategories'  => $kidsCategories,
            'relatedProducts' => $relatedProducts,
            'savedDesigns' => $savedDesigns,
            'initialSavedDesign' => $initialSavedDesign,
        ]);
    }

    /**
     * ---------------------------------------------------------
     * CHANGE PRODUCT (AJAX / MODAL)
     * ---------------------------------------------------------
     */
    public function changeProduct(Product $product)
    {
        Log::info("=== DesignController@changeProduct ===", [
            'product_id' => $product->id,
            'slug'       => $product->slug,
        ]);

        $product->load(['images', 'variants.images', 'categories']);
        $this->attachColourProducts($product);

        return response()->json(['product' => $product]);
    }

    /**
     * ---------------------------------------------------------
     * SHARED HELPER
     * ---------------------------------------------------------
     */
    private function attachColourProducts(Product $product): void
    {
        $productImageUrls = $product->images->pluck('url')->values()->all();
        $productImageBoxes = $this->buildImageBoxesMap($product->images);

        $product->colourProducts = collect($product->variants)
            ->groupBy('colour')
            ->map(function ($group, $colour) use ($product, $productImageBoxes) {
                $firstVariant = $group->first();
                $variantImageBoxes = $this->buildImageBoxesMap($firstVariant->images);

                $images = $firstVariant->images->isNotEmpty()
                    ? $firstVariant->images->pluck('url')->values()->all()
                    : $product->images->pluck('url')->values()->all();

                return [
                    'colour' => $colour,
                    'slug'   => $firstVariant->slug,
                    'sizes'  => $group->pluck('size')->unique()->values()->all(),
                    'images' => $images,
                    'image_boxes' => count($variantImageBoxes) > 0 ? $variantImageBoxes : $productImageBoxes,
                ];
            })
            ->values()
            ->all();

        $product->images = $productImageUrls;
        $product->image_boxes = $productImageBoxes;
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

                return [$image->url => $box];
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
}
