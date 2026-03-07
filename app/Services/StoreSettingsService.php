<?php

namespace App\Services;

use App\Models\StoreSetting;
use Illuminate\Support\Facades\Storage;

class StoreSettingsService
{
    public const KEY_DESIGN_PRICING = 'design_pricing';
    public const KEY_SITE_SETTINGS = 'site_settings';
    public const KEY_TAX_SETTINGS = 'tax_settings';
    public const KEY_SIZE_GUIDE = 'size_guide';

    public function getDesignPricing(): array
    {
        $stored = $this->get(self::KEY_DESIGN_PRICING, []);

        return $this->mergeDefaults($this->defaultDesignPricing(), is_array($stored) ? $stored : []);
    }

    public function saveDesignPricing(array $payload): array
    {
        $normalized = [
            'printing' => [
                'text_price' => $this->toMoney(data_get($payload, 'printing.text_price'), 0.75),
                'clipart_price' => $this->toMoney(data_get($payload, 'printing.clipart_price'), 1.00),
                'image_price' => $this->toMoney(data_get($payload, 'printing.image_price'), 1.50),
                'per_side_price' => $this->toMoney(data_get($payload, 'printing.per_side_price'), 1.25),
            ],
            'embroidery' => [
                'text_price' => $this->toMoney(data_get($payload, 'embroidery.text_price'), 1.13),
                'clipart_price' => $this->toMoney(data_get($payload, 'embroidery.clipart_price'), 1.50),
                'image_price' => $this->toMoney(data_get($payload, 'embroidery.image_price'), 2.25),
                'per_side_price' => $this->toMoney(data_get($payload, 'embroidery.per_side_price'), 1.88),
            ],
        ];

        $this->put(self::KEY_DESIGN_PRICING, $normalized);

        return $normalized;
    }

    public function getSiteSettings(): array
    {
        $stored = $this->get(self::KEY_SITE_SETTINGS, []);
        $merged = $this->mergeDefaults($this->defaultSiteSettings(), is_array($stored) ? $stored : []);

        $merged['logo_url'] = $this->publicUrlForPath((string) ($merged['logo_path'] ?? ''));
        $merged['favicon_url'] = $this->publicUrlForPath((string) ($merged['favicon_path'] ?? ''));

        return $merged;
    }

    public function saveSiteSettings(array $payload): array
    {
        $existing = $this->getSiteSettings();

        $normalized = [
            'site_name' => trim((string) ($payload['site_name'] ?? $existing['site_name'] ?? 'Bear Lane')),
            'support_email' => trim((string) ($payload['support_email'] ?? $existing['support_email'] ?? '')),
            'contact_phone' => trim((string) ($payload['contact_phone'] ?? $existing['contact_phone'] ?? '')),
            'business_address' => trim((string) ($payload['business_address'] ?? $existing['business_address'] ?? '')),
            'logo_path' => trim((string) ($payload['logo_path'] ?? $existing['logo_path'] ?? '')),
            'favicon_path' => trim((string) ($payload['favicon_path'] ?? $existing['favicon_path'] ?? '')),
            'maintenance_mode' => (bool) ($payload['maintenance_mode'] ?? $existing['maintenance_mode'] ?? false),
        ];

        $this->put(self::KEY_SITE_SETTINGS, $normalized);

        return $this->getSiteSettings();
    }

    public function getTaxSettings(): array
    {
        $stored = $this->get(self::KEY_TAX_SETTINGS, []);

        return $this->mergeDefaults($this->defaultTaxSettings(), is_array($stored) ? $stored : []);
    }

    public function saveTaxSettings(array $payload): array
    {
        $priceMode = strtolower((string) data_get($payload, 'price_mode', 'exclusive'));
        if (!in_array($priceMode, ['inclusive', 'exclusive'], true)) {
            $priceMode = 'exclusive';
        }

        $normalized = [
            'enabled' => (bool) data_get($payload, 'enabled', true),
            'rate_percent' => $this->toMoney(data_get($payload, 'rate_percent'), 20),
            'price_mode' => $priceMode,
        ];

        $this->put(self::KEY_TAX_SETTINGS, $normalized);

        return $normalized;
    }

    public function getSizeGuide(): array
    {
        $stored = $this->get(self::KEY_SIZE_GUIDE, []);

        return $this->mergeDefaults($this->defaultSizeGuide(), is_array($stored) ? $stored : []);
    }

    public function saveSizeGuide(array $payload): array
    {
        $normalized = [];

        foreach (['men', 'women', 'kids'] as $section) {
            $rows = data_get($payload, "{$section}.rows", []);
            if (!is_array($rows)) {
                $rows = [];
            }

            $normalizedRows = collect($rows)
                ->map(function ($row) {
                    return [
                        'size' => trim((string) data_get($row, 'size', '')),
                        'chest' => trim((string) data_get($row, 'chest', '')),
                        'length' => trim((string) data_get($row, 'length', '')),
                        'sleeve' => trim((string) data_get($row, 'sleeve', '')),
                    ];
                })
                ->filter(fn (array $row) => $row['size'] !== '' || $row['chest'] !== '' || $row['length'] !== '' || $row['sleeve'] !== '')
                ->values()
                ->all();

            $normalized[$section] = [
                'heading' => (string) data_get($payload, "{$section}.heading", ucfirst($section) . "'s Size Guide"),
                'subtitle' => (string) data_get($payload, "{$section}.subtitle", ''),
                'rows' => $normalizedRows,
            ];
        }

        $this->put(self::KEY_SIZE_GUIDE, $normalized);

        return $this->getSizeGuide();
    }

    public function getPublicSettings(): array
    {
        $site = $this->getSiteSettings();

        return [
            'site' => [
                'site_name' => (string) ($site['site_name'] ?? 'Bear Lane'),
                'support_email' => (string) ($site['support_email'] ?? ''),
                'contact_phone' => (string) ($site['contact_phone'] ?? ''),
                'business_address' => (string) ($site['business_address'] ?? ''),
                'logo_url' => $site['logo_url'] ?? null,
                'favicon_url' => $site['favicon_url'] ?? null,
                'maintenance_mode' => (bool) ($site['maintenance_mode'] ?? false),
            ],
            'design_pricing' => $this->getDesignPricing(),
            'tax' => $this->getTaxSettings(),
            'size_guide' => $this->getSizeGuide(),
        ];
    }

    private function get(string $key, mixed $default = null): mixed
    {
        $record = StoreSetting::query()->where('key', $key)->first();

        if (!$record) {
            return $default;
        }

        return $record->value ?? $default;
    }

    private function put(string $key, array $value): void
    {
        StoreSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    private function toMoney(mixed $value, float $fallback): float
    {
        if ($value === null || $value === '') {
            return round($fallback, 2);
        }

        if (is_numeric($value)) {
            return round(max(0, (float) $value), 2);
        }

        $sanitized = preg_replace('/[^0-9.\-]/', '', (string) $value);
        if ($sanitized === null || $sanitized === '' || !is_numeric($sanitized)) {
            return round($fallback, 2);
        }

        return round(max(0, (float) $sanitized), 2);
    }

    private function publicUrlForPath(string $path): ?string
    {
        $trimmed = trim($path);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $trimmed) === 1) {
            return $trimmed;
        }

        return Storage::disk('public')->url($trimmed);
    }

    private function mergeDefaults(array $defaults, array $stored): array
    {
        return array_replace_recursive($defaults, $stored);
    }

    private function defaultDesignPricing(): array
    {
        return [
            'printing' => [
                'text_price' => 0.75,
                'clipart_price' => 1.00,
                'image_price' => 1.50,
                'per_side_price' => 1.25,
            ],
            'embroidery' => [
                'text_price' => 1.13,
                'clipart_price' => 1.50,
                'image_price' => 2.25,
                'per_side_price' => 1.88,
            ],
        ];
    }

    private function defaultSiteSettings(): array
    {
        return [
            'site_name' => 'Bear Lane',
            'support_email' => '',
            'contact_phone' => '',
            'business_address' => '',
            'logo_path' => '',
            'favicon_path' => '',
            'maintenance_mode' => false,
        ];
    }

    private function defaultTaxSettings(): array
    {
        return [
            'enabled' => true,
            'rate_percent' => 20,
            'price_mode' => 'exclusive',
        ];
    }

    private function defaultSizeGuide(): array
    {
        return [
            'men' => [
                'heading' => "Men's Size Guide",
                'subtitle' => 'Measurements in cm. Use garment lay-flat values for best fit.',
                'rows' => [
                    ['size' => 'S', 'chest' => '96', 'length' => '70', 'sleeve' => '20'],
                    ['size' => 'M', 'chest' => '102', 'length' => '72', 'sleeve' => '21'],
                    ['size' => 'L', 'chest' => '108', 'length' => '74', 'sleeve' => '22'],
                    ['size' => 'XL', 'chest' => '114', 'length' => '76', 'sleeve' => '23'],
                ],
            ],
            'women' => [
                'heading' => "Women's Size Guide",
                'subtitle' => 'Measurements in cm. Compare chest first, then length and sleeve.',
                'rows' => [
                    ['size' => 'XS', 'chest' => '82', 'length' => '62', 'sleeve' => '16'],
                    ['size' => 'S', 'chest' => '88', 'length' => '64', 'sleeve' => '17'],
                    ['size' => 'M', 'chest' => '94', 'length' => '66', 'sleeve' => '18'],
                    ['size' => 'L', 'chest' => '100', 'length' => '68', 'sleeve' => '19'],
                ],
            ],
            'kids' => [
                'heading' => "Kids' Size Guide",
                'subtitle' => 'Measurements in cm. Choose chest first for growing children.',
                'rows' => [
                    ['size' => '3-4Y', 'chest' => '64', 'length' => '44', 'sleeve' => '13'],
                    ['size' => '5-6Y', 'chest' => '70', 'length' => '48', 'sleeve' => '14'],
                    ['size' => '7-8Y', 'chest' => '76', 'length' => '52', 'sleeve' => '15'],
                    ['size' => '9-11Y', 'chest' => '82', 'length' => '56', 'sleeve' => '16'],
                ],
            ],
        ];
    }
}
