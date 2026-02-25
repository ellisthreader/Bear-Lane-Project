<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;

class ProductController extends Controller
{
    public function index()
    {
        // Load categories WITH their assigned products
        $categories = Category::with('products')
            ->orderBy('name')
            ->get();

        return inertia('Admin/Products', [
            'categories' => $categories,
        ]);
    }

    public function storeCategory()
    {
        request()->validate([
            'name' => 'required|string|max:255',
        ]);

        $cat = Category::create([
            'name' => request('name'),
            'slug' => strtolower(str_replace(' ', '-', request('name'))),
        ]);

        return back();
    }

    public function deleteCategory(Category $category)
    {
        $category->delete();
        return back();
    }
}
