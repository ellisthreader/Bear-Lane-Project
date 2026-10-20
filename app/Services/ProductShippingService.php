<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;

class ProductShippingService
{
    public function __construct(private readonly StoreSettingsService $settings)
    {
    }

    public function productForItem(array $item): ?Product
    {
        $id = $item['product_id'] ?? $item['productId'] ?? $item['id'] ?? null;
        if (is_numeric($id) && $product = Product::find((int) $id)) {
            return $product;
        }
        $slug = trim((string) ($item['slug'] ?? $id ?? ''));
        if ($slug !== '' && $product = Product::where('slug', $slug)->first()) {
            return $product;
        }
        $name = trim((string) ($item['name'] ?? $item['title'] ?? ''));

        return $name !== '' ? Product::where('name', $name)->first() : null;
    }

    public function variantForItem(Product $product, array $item): ?ProductVariant
    {
        $size = mb_strtoupper(trim((string) ($item['size'] ?? '')));
        $colour = mb_strtolower(trim((string) ($item['colour'] ?? $item['color'] ?? '')));

        return $product->variants()
            ->when($size !== '', fn ($query) => $query->whereRaw('UPPER(size) = ?', [$size]))
            ->when($colour !== '', fn ($query) => $query->whereRaw('LOWER(colour) = ?', [$colour]))
            ->first();
    }

    public function forVariant(ProductVariant $variant): array
    {
        $courier = strtolower(trim((string) $variant->parcel_courier));
        $tier = strtolower(trim((string) $variant->parcel_size_tier));
        $preset = null;
        if ($courier !== 'manual' && $tier !== 'manual' && $tier !== '') {
            foreach ($this->settings->getDeliverySettings()['parcel_options'] as $option) {
                if ($option['carrier_key'] === $courier
                    && in_array($option['key'], [$tier, "{$courier}_{$tier}"], true)) {
                    $preset = $option;
                    break;
                }
            }
        }

        // Preset-backed variants inherit edits immediately. Manual/deleted presets
        // retain their recorded measurements, never another carrier's first preset.
        return [
            'parcel_courier' => $variant->parcel_courier,
            'parcel_size_tier' => $variant->parcel_size_tier,
            'weight_kg' => $preset['max_weight_kg'] ?? $variant->weight,
            'length_cm' => $preset['length_cm'] ?? $variant->parcel_length_cm,
            'width_cm' => $preset['width_cm'] ?? $variant->parcel_width_cm,
            'height_cm' => $preset['height_cm'] ?? $variant->parcel_height_cm,
        ];
    }

    public function currentItem(array $item): array
    {
        $product = $this->productForItem($item);
        if (!$product) {
            return $item;
        }
        $variant = $this->variantForItem($product, $item);
        $metrics = $variant ? $this->forVariant($variant) : [];
        $factor = strtolower((string) $product->dimension_unit) === 'in' ? 2.54 : 1;
        $positive = static fn ($value, float $fallback): float => is_numeric($value) && (float) $value > 0 ? (float) $value : $fallback;
        $courier = (string) ($metrics['parcel_courier'] ?? '');
        $enabled = array_column($this->settings->getEnabledCarriers(), 'key');

        return [
            ...$item,
            'weight_kg' => $positive($metrics['weight_kg'] ?? null, 1.2),
            'length_cm' => $positive($metrics['length_cm'] ?? null, $positive($product->length, 30 / $factor) * $factor),
            'width_cm' => $positive($metrics['width_cm'] ?? null, $positive($product->width, 25 / $factor) * $factor),
            'height_cm' => $positive($metrics['height_cm'] ?? null, $positive($product->height, 5 / $factor) * $factor),
            'dimension_unit' => 'cm',
            'preferred_courier' => in_array($courier, $enabled, true) ? $courier : null,
        ];
    }
}
