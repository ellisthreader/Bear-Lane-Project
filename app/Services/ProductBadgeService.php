<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProductBadgeService
{
    public const BADGE_BEST_SELLER = 'Best Seller';
    public const BADGE_HIGHEST_RATED = 'Highest Rated';
    public const BADGE_NEW_IN = 'New In';

    /**
     * Build badges for a category page scope (category + descendants).
     *
     * @param array<int> $categoryScopeIds
     * @return array<int, array<int, string>>
     */
    public function badgesForCategoryScope(array $categoryScopeIds): array
    {
        $scopeIds = collect($categoryScopeIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($scopeIds)) {
            return [];
        }

        $scopeProductIds = DB::query()
            ->fromSub($this->categoryProductPairsQuery($scopeIds), 'cp')
            ->select('cp.product_id')
            ->distinct()
            ->pluck('cp.product_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->values()
            ->all();

        if (empty($scopeProductIds)) {
            return [];
        }

        $badgesByProduct = [];

        $salesRows = DB::table('order_items as oi')
            ->leftJoin('orders as o', 'o.id', '=', 'oi.order_id')
            ->whereIn('oi.product_id', $scopeProductIds)
            ->where(function ($query) {
                $query
                    ->whereNull('o.id')
                    ->orWhereNotIn('o.status', ['cancelled', 'refunded', 'failed']);
            })
            ->groupBy('oi.product_id')
            ->selectRaw('oi.product_id as product_id')
            ->selectRaw('COALESCE(SUM(oi.quantity), 0) as units_sold')
            ->get();

        $maxUnits = $salesRows->max(fn ($row) => (int) ($row->units_sold ?? 0));
        if (is_numeric($maxUnits) && (int) $maxUnits > 0) {
            foreach ($salesRows as $row) {
                if ((int) ($row->units_sold ?? 0) === (int) $maxUnits) {
                    $productId = (int) ($row->product_id ?? 0);
                    if ($productId > 0) {
                        $this->addBadge($badgesByProduct, $productId, self::BADGE_BEST_SELLER);
                    }
                }
            }
        }

        $ratingRows = DB::table('product_reviews as pr')
            ->whereIn('pr.product_id', $scopeProductIds)
            ->where('pr.moderation_status', 'approved')
            ->where('pr.is_visible', true)
            ->groupBy('pr.product_id')
            ->selectRaw('pr.product_id as product_id')
            ->selectRaw('AVG(pr.rating) as average_rating')
            ->selectRaw('COUNT(*) as reviews_count')
            ->get();

        $topRating = null;
        $topRatingReviews = 0;
        foreach ($ratingRows as $row) {
            $avg = (float) ($row->average_rating ?? 0);
            $count = (int) ($row->reviews_count ?? 0);
            if ($count <= 0) {
                continue;
            }
            if ($topRating === null || $avg > $topRating + 0.0001 || (abs($avg - $topRating) <= 0.0001 && $count > $topRatingReviews)) {
                $topRating = $avg;
                $topRatingReviews = $count;
            }
        }

        if ($topRating !== null) {
            foreach ($ratingRows as $row) {
                $avg = (float) ($row->average_rating ?? 0);
                $count = (int) ($row->reviews_count ?? 0);
                if ($count > 0 && abs($avg - $topRating) <= 0.0001 && $count === $topRatingReviews) {
                    $productId = (int) ($row->product_id ?? 0);
                    if ($productId > 0) {
                        $this->addBadge($badgesByProduct, $productId, self::BADGE_HIGHEST_RATED);
                    }
                }
            }
        }

        $newRows = Product::query()
            ->whereIn('id', $scopeProductIds)
            ->select(['id', 'created_at'])
            ->get();

        $latestTimestamp = $newRows->max(fn (Product $product) => optional($product->created_at)?->getTimestamp() ?? 0);
        if (is_numeric($latestTimestamp) && (int) $latestTimestamp > 0) {
            foreach ($newRows as $row) {
                $timestamp = optional($row->created_at)?->getTimestamp() ?? 0;
                if ((int) $timestamp === (int) $latestTimestamp) {
                    $productId = (int) ($row->id ?? 0);
                    if ($productId > 0) {
                        $this->addBadge($badgesByProduct, $productId, self::BADGE_NEW_IN);
                    }
                }
            }
        }

        return $this->normalizeBadgeOrder($badgesByProduct);
    }

    /**
     * Build badges for a visible product set using each product's categories.
     *
     * @param Collection<int, Product>|Collection<int, object>|array<int, mixed> $products
     * @return array<int, array<int, string>>
     */
    public function badgesForVisibleProductsByCategory(Collection|array $products): array
    {
        $collection = $products instanceof Collection ? $products : collect($products);

        $visibleProductIds = $collection
            ->map(fn ($product) => (int) data_get($product, 'id', 0))
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($visibleProductIds)) {
            return [];
        }

        $productCategoryMap = $this->categoryIdsForProducts($visibleProductIds);
        $relevantCategoryIds = collect($productCategoryMap)
            ->flatten()
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($relevantCategoryIds)) {
            return [];
        }

        $leaders = $this->leadersForCategories($relevantCategoryIds);
        $badgesByProduct = [];

        foreach ($productCategoryMap as $productId => $categoryIds) {
            foreach ($categoryIds as $categoryId) {
                $bestSellerIds = $leaders['best_seller'][$categoryId] ?? [];
                if (in_array((int) $productId, $bestSellerIds, true)) {
                    $this->addBadge($badgesByProduct, (int) $productId, self::BADGE_BEST_SELLER);
                }

                $highestRatedIds = $leaders['highest_rated'][$categoryId] ?? [];
                if (in_array((int) $productId, $highestRatedIds, true)) {
                    $this->addBadge($badgesByProduct, (int) $productId, self::BADGE_HIGHEST_RATED);
                }

                $newInIds = $leaders['new_in'][$categoryId] ?? [];
                if (in_array((int) $productId, $newInIds, true)) {
                    $this->addBadge($badgesByProduct, (int) $productId, self::BADGE_NEW_IN);
                }
            }
        }

        return $this->normalizeBadgeOrder($badgesByProduct);
    }

    /**
     * @param array<int> $productIds
     * @return array<int, array<int>>
     */
    private function categoryIdsForProducts(array $productIds): array
    {
        $ids = collect($productIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return [];
        }

        $map = [];

        $pivotRows = DB::table('category_product')
            ->whereIn('product_id', $ids)
            ->select(['product_id', 'category_id'])
            ->get();

        foreach ($pivotRows as $row) {
            $productId = (int) ($row->product_id ?? 0);
            $categoryId = (int) ($row->category_id ?? 0);
            if ($productId <= 0 || $categoryId <= 0) {
                continue;
            }
            $map[$productId] = $map[$productId] ?? [];
            if (!in_array($categoryId, $map[$productId], true)) {
                $map[$productId][] = $categoryId;
            }
        }

        $directRows = DB::table('products')
            ->whereIn('id', $ids)
            ->whereNotNull('category_id')
            ->select(['id', 'category_id'])
            ->get();

        foreach ($directRows as $row) {
            $productId = (int) ($row->id ?? 0);
            $categoryId = (int) ($row->category_id ?? 0);
            if ($productId <= 0 || $categoryId <= 0) {
                continue;
            }
            $map[$productId] = $map[$productId] ?? [];
            if (!in_array($categoryId, $map[$productId], true)) {
                $map[$productId][] = $categoryId;
            }
        }

        return $map;
    }

    /**
     * @param array<int> $categoryIds
     * @return array<string, array<int, array<int>>>
     */
    private function leadersForCategories(array $categoryIds): array
    {
        $ids = collect($categoryIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return [
                'best_seller' => [],
                'highest_rated' => [],
                'new_in' => [],
            ];
        }

        $pairs = $this->categoryProductPairsQuery($ids);

        $bestSellerByCategory = [];
        $salesRows = DB::query()
            ->fromSub($pairs, 'cp')
            ->leftJoin('order_items as oi', 'oi.product_id', '=', 'cp.product_id')
            ->leftJoin('orders as o', 'o.id', '=', 'oi.order_id')
            ->where(function ($query) {
                $query
                    ->whereNull('o.id')
                    ->orWhereNotIn('o.status', ['cancelled', 'refunded', 'failed']);
            })
            ->groupBy('cp.category_id', 'cp.product_id')
            ->selectRaw('cp.category_id as category_id')
            ->selectRaw('cp.product_id as product_id')
            ->selectRaw('COALESCE(SUM(oi.quantity), 0) as units_sold')
            ->get();

        $maxUnitsByCategory = [];
        foreach ($salesRows as $row) {
            $categoryId = (int) ($row->category_id ?? 0);
            $units = (int) ($row->units_sold ?? 0);
            if ($categoryId <= 0) {
                continue;
            }
            $maxUnitsByCategory[$categoryId] = max($maxUnitsByCategory[$categoryId] ?? 0, $units);
        }

        foreach ($salesRows as $row) {
            $categoryId = (int) ($row->category_id ?? 0);
            $productId = (int) ($row->product_id ?? 0);
            $units = (int) ($row->units_sold ?? 0);
            if ($categoryId <= 0 || $productId <= 0) {
                continue;
            }
            $maxUnits = (int) ($maxUnitsByCategory[$categoryId] ?? 0);
            if ($maxUnits > 0 && $units === $maxUnits) {
                $bestSellerByCategory[$categoryId] = $bestSellerByCategory[$categoryId] ?? [];
                if (!in_array($productId, $bestSellerByCategory[$categoryId], true)) {
                    $bestSellerByCategory[$categoryId][] = $productId;
                }
            }
        }

        $highestRatedByCategory = [];
        $ratingRows = DB::query()
            ->fromSub($this->categoryProductPairsQuery($ids), 'cp')
            ->join('product_reviews as pr', 'pr.product_id', '=', 'cp.product_id')
            ->where('pr.moderation_status', 'approved')
            ->where('pr.is_visible', true)
            ->groupBy('cp.category_id', 'cp.product_id')
            ->selectRaw('cp.category_id as category_id')
            ->selectRaw('cp.product_id as product_id')
            ->selectRaw('AVG(pr.rating) as average_rating')
            ->selectRaw('COUNT(*) as reviews_count')
            ->get();

        $ratingWinners = [];
        foreach ($ratingRows as $row) {
            $categoryId = (int) ($row->category_id ?? 0);
            $productId = (int) ($row->product_id ?? 0);
            $avg = (float) ($row->average_rating ?? 0);
            $count = (int) ($row->reviews_count ?? 0);
            if ($categoryId <= 0 || $productId <= 0 || $count <= 0) {
                continue;
            }

            $current = $ratingWinners[$categoryId] ?? null;
            if (
                $current === null ||
                $avg > $current['avg'] + 0.0001 ||
                (abs($avg - $current['avg']) <= 0.0001 && $count > $current['count'])
            ) {
                $ratingWinners[$categoryId] = [
                    'avg' => $avg,
                    'count' => $count,
                    'products' => [$productId],
                ];
                continue;
            }

            if (abs($avg - $current['avg']) <= 0.0001 && $count === $current['count']) {
                if (!in_array($productId, $ratingWinners[$categoryId]['products'], true)) {
                    $ratingWinners[$categoryId]['products'][] = $productId;
                }
            }
        }

        foreach ($ratingWinners as $categoryId => $winner) {
            $highestRatedByCategory[(int) $categoryId] = array_values(array_unique(
                array_map('intval', (array) ($winner['products'] ?? []))
            ));
        }

        $newInByCategory = [];
        $newRows = DB::query()
            ->fromSub($this->categoryProductPairsQuery($ids), 'cp')
            ->join('products as p', 'p.id', '=', 'cp.product_id')
            ->groupBy('cp.category_id', 'cp.product_id')
            ->selectRaw('cp.category_id as category_id')
            ->selectRaw('cp.product_id as product_id')
            ->selectRaw('MAX(p.created_at) as created_at')
            ->orderBy('cp.category_id')
            ->orderByDesc('created_at')
            ->get();

        $latestByCategory = [];
        foreach ($newRows as $row) {
            $categoryId = (int) ($row->category_id ?? 0);
            $productId = (int) ($row->product_id ?? 0);
            $timestamp = strtotime((string) ($row->created_at ?? '')) ?: 0;
            if ($categoryId <= 0 || $productId <= 0 || $timestamp <= 0) {
                continue;
            }

            $currentLatest = (int) ($latestByCategory[$categoryId]['timestamp'] ?? 0);
            if ($timestamp > $currentLatest) {
                $latestByCategory[$categoryId] = [
                    'timestamp' => $timestamp,
                    'products' => [$productId],
                ];
                continue;
            }

            if ($timestamp === $currentLatest) {
                if (!in_array($productId, $latestByCategory[$categoryId]['products'], true)) {
                    $latestByCategory[$categoryId]['products'][] = $productId;
                }
            }
        }

        foreach ($latestByCategory as $categoryId => $winner) {
            $newInByCategory[(int) $categoryId] = array_values(array_unique(
                array_map('intval', (array) ($winner['products'] ?? []))
            ));
        }

        return [
            'best_seller' => $bestSellerByCategory,
            'highest_rated' => $highestRatedByCategory,
            'new_in' => $newInByCategory,
        ];
    }

    private function addBadge(array &$map, int $productId, string $badge): void
    {
        if ($productId <= 0) {
            return;
        }

        $map[$productId] = $map[$productId] ?? [];
        if (!in_array($badge, $map[$productId], true)) {
            $map[$productId][] = $badge;
        }
    }

    /**
     * @param array<int, array<int, string>> $badgesByProduct
     * @return array<int, array<int, string>>
     */
    private function normalizeBadgeOrder(array $badgesByProduct): array
    {
        $order = [
            self::BADGE_BEST_SELLER => 1,
            self::BADGE_HIGHEST_RATED => 2,
            self::BADGE_NEW_IN => 3,
        ];

        foreach ($badgesByProduct as $productId => $badges) {
            $normalized = collect((array) $badges)
                ->map(fn ($badge) => trim((string) $badge))
                ->filter(fn ($badge) => $badge !== '')
                ->unique()
                ->sortBy(fn ($badge) => $order[$badge] ?? 999)
                ->values()
                ->all();

            $badgesByProduct[(int) $productId] = $normalized;
        }

        return $badgesByProduct;
    }

    /**
     * @param array<int>|null $categoryIds
     */
    private function categoryProductPairsQuery(?array $categoryIds = null): QueryBuilder
    {
        $pivot = DB::table('category_product')
            ->selectRaw('category_id, product_id');

        $direct = DB::table('products')
            ->whereNotNull('category_id')
            ->selectRaw('category_id, id as product_id');

        if (is_array($categoryIds)) {
            $ids = collect($categoryIds)
                ->map(fn ($id) => (int) $id)
                ->filter(fn (int $id) => $id > 0)
                ->unique()
                ->values()
                ->all();

            if (!empty($ids)) {
                $pivot->whereIn('category_id', $ids);
                $direct->whereIn('category_id', $ids);
            } else {
                $pivot->whereRaw('1 = 0');
                $direct->whereRaw('1 = 0');
            }
        }

        return $pivot->union($direct);
    }
}

