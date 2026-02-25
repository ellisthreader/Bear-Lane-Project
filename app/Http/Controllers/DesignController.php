<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\SavedDesign;
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
        $savedDesignId  = $request->query('savedDesign');

        // Fetch product by slug instead of default ID binding
        $product = Product::with(['images', 'variants.images', 'categories'])
            ->where('slug', $slug)
            ->firstOrFail();

        Log::info("=== DesignController@show ===", [
            'slug'   => $slug,
            'colour' => $selectedColour,
            'size'   => $selectedSize,
        ]);

        // Build colour products
        $this->attachColourProducts($product);

        // -------------------------------
        // CATEGORY HELPERS
        // -------------------------------
        $mapProducts = function ($products) {
            return $products->map(function ($p) {
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
                    'images'         => $images,
                ];
            })->values()->all();
        };

        // Adult categories
        $adultCategories = Category::whereNull('age_group')
            ->orderBy('section')
            ->get()
            ->map(function ($cat) use ($mapProducts) {
                return [
                    'id'       => $cat->id,
                    'name'     => $cat->name,
                    'section'  => $cat->section,
                    'products' => $mapProducts($cat->products()->with('images')->get()),
                ];
            });

        // Kids categories
        $kidsCategories = Category::whereNotNull('age_group')
            ->orderBy('age_group')
            ->orderBy('section')
            ->get()
            ->groupBy('age_group')
            ->map(function ($group) use ($mapProducts) {
                return $group->map(function ($cat) use ($mapProducts) {
                    return [
                        'id'        => $cat->id,
                        'name'      => $cat->name,
                        'section'   => $cat->section,
                        'age_group' => $cat->age_group,
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
                        'previewImage' => $savedDesign->product?->images?->first()?->url,
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
        $product->colourProducts = collect($product->variants)
            ->groupBy('colour')
            ->map(function ($group, $colour) use ($product) {
                $firstVariant = $group->first();

                $images = $firstVariant->images->isNotEmpty()
                    ? $firstVariant->images->pluck('path')->map(fn($p) => asset($p))->all()
                    : $product->images->pluck('path')->map(fn($p) => asset($p))->all();

                return [
                    'colour' => $colour,
                    'slug'   => $firstVariant->slug,
                    'sizes'  => $group->pluck('size')->unique()->values()->all(),
                    'images' => $images,
                ];
            })
            ->values()
            ->all();
    }
}
