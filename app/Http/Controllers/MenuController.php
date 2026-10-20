<?php

namespace App\Http\Controllers;

use App\Models\Category;

class MenuController extends Controller
{
    public function categories()
    {
        // Fetch all categories
        $categories = Category::all();

        // Convert to nested structure
        $women = $categories
            ->where('parent_id', null)                // Top-level (Women)
            ->where('slug', 'women')                 // Ensure it's the women root
            ->first();

        if (!$women) {
            return response()->json([]);
        }

        $level2 = $categories->where('parent_id', $women->id);

        $result = [];

        foreach ($level2 as $cat2) {
            $level3 = $categories
                ->where('parent_id', $cat2->id)
                ->pluck('name')
                ->toArray();

            $result[$cat2->name] = $level3;
        }

        return response()->json([
            "Women" => $result
        ]);
    }
}
