<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Support\Facades\Log;

class ProductSearchController extends Controller
{
    /**
     * Category search endpoint for the autocomplete search bar.
     *
     * GET /search-categories?q=...
     */
    public function searchCategories(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        // Base query with eager loading of products + images
        $baseQuery = Category::query()->with(['products.images']);

        // If there's no query, return all categories (or you might choose to return nothing)
        if ($q === '') {
            $categories = $baseQuery
                ->orderBy('age_group')
                ->orderBy('section')
                ->orderBy('subsection')
                ->orderBy('name')
                ->get();

            $results = $this->formatCategories($categories);

            Log::info('📦 Category Search (empty query) - returning all categories', [
                'count' => $categories->count(),
            ]);

            return response()->json($results);
        }

        $lowerQ = mb_strtolower($q);

        // 1) Try exact name matches (case-insensitive)
        $exactMatches = (clone $baseQuery)
            ->whereRaw('LOWER(name) = ?', [$lowerQ])
            ->orderBy('age_group')
            ->orderBy('section')
            ->orderBy('subsection')
            ->orderBy('name')
            ->get();

        Log::info('🔎 Exact name matches for category search', [
            'query' => $q,
            'exact_count' => $exactMatches->count(),
            'exact_ids' => $exactMatches->pluck('id')->all(),
            'exact_names' => $exactMatches->pluck('name')->all(),
        ]);

        // 2) If we found exact matches, use them. If not, do a broader LIKE search.
        if ($exactMatches->isNotEmpty()) {
            $categories = $exactMatches;
        } else {
            $like = '%' . str_replace('%', '\\%', $q) . '%';

            $likeMatches = (clone $baseQuery)
                ->where(function ($builder) use ($like) {
                    $builder->where('name', 'LIKE', $like)
                        ->orWhere('section', 'LIKE', $like)
                        ->orWhere('subsection', 'LIKE', $like)
                        ->orWhere('age_group', 'LIKE', $like)
                        ->orWhere('slug', 'LIKE', $like);
                })
                ->orderBy('age_group')
                ->orderBy('section')
                ->orderBy('subsection')
                ->orderBy('name')
                ->get();

            Log::info('🔎 LIKE matches for category search (fallback)', [
                'query' => $q,
                'like_count' => $likeMatches->count(),
                'like_ids' => $likeMatches->pluck('id')->all(),
                'like_names' => $likeMatches->pluck('name')->all(),
            ]);

            $categories = $likeMatches;
        }

        // Format to the frontend shape (with products & first image)
        $results = $this->formatCategories($categories);

        // Final log of payload (keeps it readable)
        Log::info('📦 Category Search Response Sent', [
            'query' => $q,
            'categories_found' => count($results),
            'categories' => $results,
        ]);

        return response()->json($results);
    }

    /**
     * Helper to format categories and their products for frontend response.
     */
    protected function formatCategories($categories)
    {
        return $categories->map(function ($c) {
            return [
                'id'         => $c->id,
                'name'       => $c->name,
                'slug'       => $c->slug,
                'section'    => $c->section,
                'subsection' => $c->subsection,
                'age_group'  => $c->age_group,
                'products'   => $c->products->map(function ($p) {
                    return [
                        'id'    => $p->id,
                        'name'  => $p->name,
                        'slug'  => $p->slug,
                        'price' => $p->price,
                        'image' => $p->images->first()
                            ? asset($p->images->first()->path)
                            : null,
                    ];
                })->values()->all(),
            ];
        })->values()->all();
    }
}
