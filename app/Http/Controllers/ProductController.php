<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
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
            ->get()
            ->map(fn ($product) => $this->formatProduct($product));

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
            ->get()
            ->map(fn($product) => $this->formatProduct($product));

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
            ->get()
            ->map(fn ($product) => $this->formatProduct($product));

        return $products;
    }

    /**
     * Show single product page
     */
    public function show($slug)
    {
        Log::info("🔎 Product requested", ['slug' => $slug]);

        $product = Product::where('slug', $slug)
            ->with(['images', 'variants.images'])
            ->firstOrFail();

        $product = $this->formatProduct($product);

        // Build colourProducts for frontend
        $product->colourProducts = collect($product->variants)
            ->groupBy('colour')
            ->map(function ($group, $colour) use ($product) {
                $firstVariant = $group->first();

                $images = $firstVariant->images->isNotEmpty()
                    ? $firstVariant->images->pluck('path')->map(fn($path) => asset($path))->all()
                    : $product->images;

                return [
                    'colour' => $colour,
                    'slug' => $firstVariant->slug,
                    'sizes' => $group->pluck('size')->unique()->values()->all(),
                    'images' => $images,
                ];
            })
            ->values()
            ->all();

        Log::info("=== colourProducts built ===", ['colourProducts' => $product->colourProducts]);

        return Inertia::render('Product/ProductLayout', [
            'product' => $product,
        ]);
    }

    /**
     * Format a product for frontend
     */
    private function formatProduct($product)
    {
        $product->slug = (string) $product->slug;

        $allColours = $product->variants->pluck('colour')->unique()->values()->all();
        $allSizes   = $product->variants->pluck('size')->unique()->values()->all();

        $productImages = $product->images
            ->map(fn ($img) => asset($img->path))
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
            'images' => $productImages,
            'sizes' => $allSizes,
            'colour' => $allColours,
            'variants' => $product->variants,
            'colourProducts' => [], // will be filled in `show`
        ];
    }
}
