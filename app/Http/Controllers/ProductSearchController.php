<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;

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

        // Base query with constrained eager loading to reduce payload size.
        $baseQuery = Category::query()
            ->select(['id', 'name', 'slug', 'section', 'subsection', 'age_group'])
            ->with([
                'products' => fn ($query) => $query
                    ->select(['products.id', 'products.name', 'products.slug', 'products.price'])
                    ->orderByDesc('products.created_at')
                    ->limit(8)
                    ->with([
                        'images' => fn ($imageQuery) => $imageQuery
                            ->select(['id', 'imageable_id', 'imageable_type', 'path'])
                            ->orderBy('id')
                            ->limit(1),
                    ]),
            ]);

        // If there's no query, return all categories (or you might choose to return nothing)
        if ($q === '') {
            $categories = (clone $baseQuery)
                ->orderBy('age_group')
                ->orderBy('section')
                ->orderBy('subsection')
                ->orderBy('name')
                ->limit(20)
                ->get();

            $results = $this->formatCategories($categories);

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
                ->limit(20)
                ->get();

            $categories = $likeMatches;
        }

        // Format to the frontend shape (with products & first image)
        $results = $this->formatCategories($categories);

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
