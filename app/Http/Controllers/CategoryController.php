<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display products for any category page using the full slug.
     * Supports slashed slugs like "men/shoes/trainers".
     */
    public function show($slug)
    {
        // Find category using exact slug stored in DB
        $categoryModel = Category::where('slug', $slug)->firstOrFail();

        // Load products with relationships
        $products = $categoryModel->products()
            ->with(['categories', 'images', 'variants'])
            ->get();

        return Inertia::render('CategoryPage', [
            'heading'     => $categoryModel->section,
            'category'    => $categoryModel->subsection,
            'subcategory' => $categoryModel->name,
            'slug'        => $categoryModel->slug,
            'products'    => $products,
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

        return $this->show($slug);
    }

    /**
     * Kids category pages.
     * Example: /category/kids/girl/clothing/2-8-years/nightwear
     */
    public function kids($gender, $category, $age, $sub = null)
    {
        // DB slug for kids categories
        $slug = strtolower("kids-$gender-$category");
        $categoryModel = Category::where('slug', $slug)->firstOrFail();

        $products = $categoryModel->products()
            ->with(['categories', 'images', 'variants'])
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
