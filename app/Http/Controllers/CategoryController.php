<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
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

        // Load products with relationships
        $products = $categoryModel->products()
            ->with(['categories', 'images', 'variants'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get();

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

        $products = $categoryModel->products()
            ->with(['categories', 'images', 'variants'])
            ->withAvg('approvedReviews as average_rating', 'rating')
            ->withCount('approvedReviews as reviews_count')
            ->get();

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
}
