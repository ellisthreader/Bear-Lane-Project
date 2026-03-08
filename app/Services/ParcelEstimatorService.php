<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;

class ParcelEstimatorService
{
    private const DEFAULT_PARCEL = [
        'length' => '30',
        'width' => '25',
        'height' => '5',
        'distance_unit' => 'cm',
        'weight' => '1.2',
        'mass_unit' => 'kg',
    ];

    public function forCheckoutItems(array $items): array
    {
        return $this->estimate($items);
    }

    public function forOrder(Order $order): array
    {
        $order->loadMissing('items.product');

        $items = $order->items->map(function ($item) {
            return [
                'slug' => (string) ($item->product?->slug ?? ''),
                'id' => $item->product_id,
                'size' => (string) ($item->size ?? ''),
                'colour' => (string) ($item->colour ?? ''),
                'quantity' => (int) ($item->quantity ?? 1),
            ];
        })->all();

        return $this->estimate($items);
    }

    private function estimate(array $items): array
    {
        if (empty($items)) {
            return self::DEFAULT_PARCEL;
        }

        $totalWeightKg = 0.0;
        $maxLengthCm = 0.0;
        $maxWidthCm = 0.0;
        $totalHeightCm = 0.0;
        $foundAnyProduct = false;

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $product = $this->resolveProduct($item);

            if (!$product) {
                continue;
            }

            $foundAnyProduct = true;

            $weightPerUnit = $this->resolveWeightPerUnitKg($product, $item);
            $totalWeightKg += $weightPerUnit * $quantity;

            [$lengthCm, $widthCm, $heightCm] = $this->resolveProductDimensionsCm($product);
            $maxLengthCm = max($maxLengthCm, $lengthCm);
            $maxWidthCm = max($maxWidthCm, $widthCm);
            $totalHeightCm += $heightCm * $quantity;
        }

        if (!$foundAnyProduct) {
            return self::DEFAULT_PARCEL;
        }

        $normalizedLength = $this->roundBounded($maxLengthCm, 5, 120);
        $normalizedWidth = $this->roundBounded($maxWidthCm, 5, 120);
        $normalizedHeight = $this->roundBounded($totalHeightCm, 2, 120);
        $normalizedWeight = $this->roundBounded($totalWeightKg, 0.05, 60);

        return [
            'length' => number_format($normalizedLength, 2, '.', ''),
            'width' => number_format($normalizedWidth, 2, '.', ''),
            'height' => number_format($normalizedHeight, 2, '.', ''),
            'distance_unit' => 'cm',
            'weight' => number_format($normalizedWeight, 2, '.', ''),
            'mass_unit' => 'kg',
        ];
    }

    private function resolveProduct(array $item): ?Product
    {
        if (!empty($item['id']) && is_numeric($item['id'])) {
            $product = Product::query()->find((int) $item['id']);
            if ($product) {
                return $product;
            }
        }

        $slug = trim((string) ($item['slug'] ?? $item['id'] ?? ''));
        if ($slug !== '') {
            $product = Product::query()->where('slug', $slug)->first();
            if ($product) {
                return $product;
            }
        }

        $name = trim((string) ($item['name'] ?? $item['title'] ?? ''));
        if ($name !== '') {
            return Product::query()->where('name', $name)->first();
        }

        return null;
    }

    private function resolveWeightPerUnitKg(Product $product, array $item): float
    {
        $directWeight = $item['weight_kg'] ?? $item['weight'] ?? null;
        if (is_numeric($directWeight) && (float) $directWeight > 0) {
            return (float) $directWeight;
        }

        $size = mb_strtoupper(trim((string) ($item['size'] ?? '')));
        $colour = mb_strtolower(trim((string) ($item['colour'] ?? $item['color'] ?? '')));

        if ($size !== '' || $colour !== '') {
            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->when($size !== '', fn ($query) => $query->whereRaw('UPPER(size) = ?', [$size]))
                ->when($colour !== '', fn ($query) => $query->whereRaw('LOWER(colour) = ?', [$colour]))
                ->first();

            if ($variant && is_numeric($variant->weight) && (float) $variant->weight > 0) {
                return (float) $variant->weight;
            }
        }

        $avgWeight = ProductVariant::query()
            ->where('product_id', $product->id)
            ->whereNotNull('weight')
            ->avg('weight');

        if (is_numeric($avgWeight) && (float) $avgWeight > 0) {
            return (float) $avgWeight;
        }

        return 1.2;
    }

    private function resolveProductDimensionsCm(Product $product): array
    {
        $length = (float) ($product->length ?? 0);
        $width = (float) ($product->width ?? 0);
        $height = (float) ($product->height ?? 0);
        $unit = strtolower(trim((string) ($product->dimension_unit ?? 'cm')));

        if ($unit === 'in') {
            $length *= 2.54;
            $width *= 2.54;
            $height *= 2.54;
        }

        return [
            $length > 0 ? $length : 30.0,
            $width > 0 ? $width : 25.0,
            $height > 0 ? $height : 5.0,
        ];
    }

    private function roundBounded(float $value, float $min, float $max): float
    {
        if ($value < $min) {
            return $min;
        }

        if ($value > $max) {
            return $max;
        }

        return round($value, 2);
    }
}
