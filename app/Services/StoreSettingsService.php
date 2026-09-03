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
    public const KEY_FRONT_PAGE_PRODUCTS = 'front_page_products';
    public const KEY_ADMIN_NOTIFICATION_SETTINGS = 'admin_notification_settings';
    public const KEY_WEBSITE_DESIGN = 'website_design';

    /** Font names must match resources/js/Theme/fonts.ts. */
    public const WEBSITE_DESIGN_FONTS = [
        'system',
        'Inter',
        'DM Sans',
        'Poppins',
        'Montserrat',
        'Nunito',
        'Lato',
        'Raleway',
        'Work Sans',
        'Playfair Display',
        'Lora',
        'Merriweather',
        'Cormorant Garamond',
    ];

    public const WEBSITE_DESIGN_MAX_HERO_SLIDES = 6;

    public function getDesignPricing(): array
    {
        $stored = $this->get(self::KEY_DESIGN_PRICING, []);

        return [
            'printing' => [
                'text_price' => $this->toMoney(data_get($stored, 'printing.text_price'), 0.75),
                'clipart_price' => $this->toMoney(data_get($stored, 'printing.clipart_price'), 1.00),
                'image_price' => $this->toMoney(data_get($stored, 'printing.image_price'), 1.50),
                'per_side_price' => $this->toMoney(data_get($stored, 'printing.per_side_price'), 1.25),
            ],
        ];
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

    public function getFrontPageProducts(): array
    {
        $stored = $this->get(self::KEY_FRONT_PAGE_PRODUCTS, []);

        return $this->mergeDefaults($this->defaultFrontPageProducts(), is_array($stored) ? $stored : []);
    }

    public function getAdminNotificationCatalog(): array
    {
        return [
            [
                'id' => 'commerce',
                'title' => 'Commerce',
                'description' => 'Orders, returns, and checkout activity.',
                'items' => [
                    ['key' => 'new_order', 'title' => 'New order placed', 'description' => 'Triggered when a customer successfully places an order.'],
                    ['key' => 'order_status_changed', 'title' => 'Order status changed', 'description' => 'Triggered when an admin updates order status.'],
                    ['key' => 'return_request_submitted', 'title' => 'Return request submitted', 'description' => 'Triggered when a customer requests a return.'],
                    ['key' => 'return_status_changed', 'title' => 'Return status changed', 'description' => 'Triggered when a return request status is updated.'],
                ],
            ],
            [
                'id' => 'sales_support',
                'title' => 'Sales & Support',
                'description' => 'Quotes, chats, and support flow.',
                'items' => [
                    ['key' => 'instant_quote_generated', 'title' => 'Instant quote generated', 'description' => 'Triggered when a customer generates an instant quote.'],
                    ['key' => 'quote_request_submitted', 'title' => 'Print specialist request', 'description' => 'Triggered when a customer submits a print specialist request.'],
                    ['key' => 'support_message_submitted', 'title' => 'Support form message', 'description' => 'Triggered when a customer sends a message via the support page.'],
                    ['key' => 'new_live_chat', 'title' => 'New live chat started', 'description' => 'Triggered when a new live chat is opened.'],
                    ['key' => 'faq_request_submitted', 'title' => 'FAQ request submitted', 'description' => 'Triggered when a customer submits an FAQ request.'],
                ],
            ],
            [
                'id' => 'account_content',
                'title' => 'Account & Content',
                'description' => 'User signups and social proof updates.',
                'items' => [
                    ['key' => 'new_user_registered', 'title' => 'New user registered', 'description' => 'Triggered when a new customer account is created.'],
                    ['key' => 'new_review_submitted', 'title' => 'New review submitted', 'description' => 'Triggered when a customer leaves a product review.'],
                ],
            ],
        ];
    }

    public function getAdminNotificationSettings(): array
    {
        $stored = $this->get(self::KEY_ADMIN_NOTIFICATION_SETTINGS, []);

        return $this->mergeDefaults($this->defaultAdminNotificationSettings(), is_array($stored) ? $stored : []);
    }

    public function saveAdminNotificationSettings(array $payload): array
    {
        $defaults = $this->defaultAdminNotificationSettings();
        $inputEvents = data_get($payload, 'events', []);
        if (!is_array($inputEvents)) {
            $inputEvents = [];
        }

        $normalizedEvents = [];
        foreach ((array) data_get($defaults, 'events', []) as $eventKey => $defaultEventValue) {
            $inAppValue = data_get($inputEvents, "{$eventKey}.in_app");
            $emailValue = data_get($inputEvents, "{$eventKey}.email");

            $normalizedEvents[$eventKey] = [
                'in_app' => $this->toBool($inAppValue, (bool) data_get($defaultEventValue, 'in_app', true)),
                'email' => $this->toBool($emailValue, (bool) data_get($defaultEventValue, 'email', true)),
            ];
        }

        $normalized = ['events' => $normalizedEvents];
        $this->put(self::KEY_ADMIN_NOTIFICATION_SETTINGS, $normalized);

        return $this->getAdminNotificationSettings();
    }

    public function isAdminEmailNotificationEnabled(string $eventKey): bool
    {
        return (bool) data_get($this->getAdminNotificationSettings(), "events.{$eventKey}.email", true);
    }

    public function isAdminInAppNotificationEnabled(string $eventKey): bool
    {
        return (bool) data_get($this->getAdminNotificationSettings(), "events.{$eventKey}.in_app", true);
    }

    public function saveFrontPageProducts(array $payload): array
    {
        $normalizeIds = static function (mixed $value): array {
            if (!is_array($value)) {
                return [];
            }

            return collect($value)
                ->map(fn ($id) => (int) $id)
                ->filter(fn (int $id) => $id > 0)
                ->unique()
                ->take(30)
                ->values()
                ->all();
        };

        $featuredIds = $normalizeIds(data_get($payload, 'featured_product_ids', []));
        $premadeIds = $normalizeIds(data_get($payload, 'premade_product_ids', []));
        $rawQuotes = data_get($payload, 'premade_quotes', []);
        $premadeQuotes = [];
        if (is_array($rawQuotes)) {
            foreach ($rawQuotes as $id => $quote) {
                $productId = (int) $id;
                if (!in_array($productId, $premadeIds, true)) {
                    continue;
                }

                $text = trim((string) $quote);
                if ($text === '') {
                    continue;
                }

                $premadeQuotes[(string) $productId] = mb_substr($text, 0, 220);
            }
        }

        $normalized = [
            'featured_product_ids' => $featuredIds,
            'premade_product_ids' => $premadeIds,
            'premade_quotes' => $premadeQuotes,
        ];

        $this->put(self::KEY_FRONT_PAGE_PRODUCTS, $normalized);

        return $this->getFrontPageProducts();
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

    public function getWebsiteDesign(): array
    {
        $stored = $this->get(self::KEY_WEBSITE_DESIGN, []);
        $merged = $this->mergeDefaults($this->defaultWebsiteDesign(), is_array($stored) ? $stored : []);

        $heroPaths = collect((array) data_get($merged, 'images.hero_slide_paths', []))
            ->map(fn ($path) => trim((string) $path))
            ->filter()
            ->unique()
            ->take(self::WEBSITE_DESIGN_MAX_HERO_SLIDES)
            ->values();

        $merged['images']['hero_slide_paths'] = $heroPaths->all();
        $merged['images']['nav_logo_url'] = $this->publicUrlForPath((string) data_get($merged, 'images.nav_logo_path', ''));
        $merged['images']['footer_logo_url'] = $this->publicUrlForPath((string) data_get($merged, 'images.footer_logo_path', ''));
        $merged['images']['hero_slides'] = $heroPaths
            ->map(fn (string $path) => ['path' => $path, 'url' => $this->publicUrlForPath($path)])
            ->all();

        return $merged;
    }

    public function saveWebsiteDesign(array $payload): array
    {
        $defaults = $this->defaultWebsiteDesign();
        $existing = $this->getWebsiteDesign();

        $color = function (string $key) use ($payload, $existing, $defaults): string {
            $candidate = strtoupper(trim((string) data_get($payload, "colors.{$key}", '')));
            if (preg_match('/^#[0-9A-F]{6}$/', $candidate) === 1) {
                return $candidate;
            }

            return (string) data_get($existing, "colors.{$key}", data_get($defaults, "colors.{$key}"));
        };

        $font = function (string $key) use ($payload, $existing): string {
            $candidate = trim((string) data_get($payload, "fonts.{$key}", ''));
            if (in_array($candidate, self::WEBSITE_DESIGN_FONTS, true)) {
                return $candidate;
            }

            $current = (string) data_get($existing, "fonts.{$key}", 'system');

            return in_array($current, self::WEBSITE_DESIGN_FONTS, true) ? $current : 'system';
        };

        $heroPaths = collect((array) data_get($payload, 'images.hero_slide_paths', data_get($existing, 'images.hero_slide_paths', [])))
            ->map(fn ($path) => trim((string) $path))
            ->filter()
            ->unique()
            ->take(self::WEBSITE_DESIGN_MAX_HERO_SLIDES)
            ->values()
            ->all();

        $normalized = [
            'colors' => [
                'accent' => $color('accent'),
                'text' => $color('text'),
                'surface' => $color('surface'),
            ],
            'fonts' => [
                'heading' => $font('heading'),
                'body' => $font('body'),
            ],
            'images' => [
                'nav_logo_path' => trim((string) data_get($payload, 'images.nav_logo_path', data_get($existing, 'images.nav_logo_path', ''))),
                'footer_logo_path' => trim((string) data_get($payload, 'images.footer_logo_path', data_get($existing, 'images.footer_logo_path', ''))),
                'hero_slide_paths' => $heroPaths,
            ],
        ];

        $this->put(self::KEY_WEBSITE_DESIGN, $normalized);

        return $this->getWebsiteDesign();
    }

    public function getPublicWebsiteDesign(): array
    {
        $design = $this->getWebsiteDesign();

        return [
            'colors' => $design['colors'],
            'fonts' => $design['fonts'],
            'images' => [
                'nav_logo_url' => $design['images']['nav_logo_url'],
                'footer_logo_url' => $design['images']['footer_logo_url'],
                'hero_slides' => array_values(array_filter(array_map(
                    fn (array $slide) => $slide['url'],
                    $design['images']['hero_slides']
                ))),
            ],
        ];
    }

    public function defaultWebsiteDesign(): array
    {
        // Colour anchors MUST match resources/js/Theme/themeFamilies.js.
        return [
            'colors' => [
                'accent' => '#C6A75E',
                'text' => '#2D2515',
                'surface' => '#FFFCF4',
            ],
            'fonts' => [
                'heading' => 'system',
                'body' => 'system',
            ],
            'images' => [
                'nav_logo_path' => '',
                'footer_logo_path' => '',
                'hero_slide_paths' => [],
            ],
        ];
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
            'front_page_products' => $this->getFrontPageProducts(),
            'design' => $this->getPublicWebsiteDesign(),
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

    private function toBool(mixed $value, bool $fallback): bool
    {
        if ($value === null) {
            return $fallback;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return ((int) $value) === 1;
        }

        $normalized = strtolower(trim((string) $value));
        if ($normalized === '') {
            return $fallback;
        }

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
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
                'subtitle' => 'Size, chest, waist, and arm length measurements in cm.',
                'rows' => [
                    ['size' => 'XS', 'chest' => '84-89', 'length' => '71-76', 'sleeve' => '81'],
                    ['size' => 'S', 'chest' => '90-95', 'length' => '76-81', 'sleeve' => '83'],
                    ['size' => 'M', 'chest' => '96-101', 'length' => '81-86', 'sleeve' => '86'],
                    ['size' => 'L', 'chest' => '102-107', 'length' => '86-91', 'sleeve' => '89'],
                    ['size' => 'XL', 'chest' => '108-113', 'length' => '91-97', 'sleeve' => '91'],
                    ['size' => 'XXL', 'chest' => '114-119', 'length' => '97-102', 'sleeve' => '94'],
                    ['size' => '3XL', 'chest' => '120-125', 'length' => '102-107', 'sleeve' => '96'],
                ],
            ],
            'women' => [
                'heading' => "Women's Size Guide",
                'subtitle' => 'UK size conversion with chest, waist, and arm length in cm.',
                'rows' => [
                    ['size' => 'UK 4', 'chest' => '76-79', 'length' => '58-61', 'sleeve' => '74'],
                    ['size' => 'UK 6', 'chest' => '80-83', 'length' => '62-65', 'sleeve' => '75'],
                    ['size' => 'UK 8', 'chest' => '84-87', 'length' => '66-69', 'sleeve' => '76'],
                    ['size' => 'UK 10', 'chest' => '88-91', 'length' => '70-73', 'sleeve' => '77'],
                    ['size' => 'UK 12', 'chest' => '92-95', 'length' => '74-77', 'sleeve' => '78'],
                    ['size' => 'UK 14', 'chest' => '96-99', 'length' => '78-81', 'sleeve' => '79'],
                    ['size' => 'UK 16', 'chest' => '100-104', 'length' => '82-86', 'sleeve' => '80'],
                    ['size' => 'UK 18', 'chest' => '105-110', 'length' => '87-92', 'sleeve' => '81'],
                    ['size' => 'UK 20', 'chest' => '111-116', 'length' => '93-98', 'sleeve' => '82'],
                ],
            ],
            'kids' => [
                'heading' => "Kids' Size Guide",
                'subtitle' => 'Kids chest, waist, and arm length measurements in cm.',
                'rows' => [
                    ['size' => '1-2', 'chest' => '50-52', 'length' => '49-50', 'sleeve' => '38'],
                    ['size' => '2-3', 'chest' => '52-54', 'length' => '50-51', 'sleeve' => '40'],
                    ['size' => '3-4', 'chest' => '54-56', 'length' => '51-52', 'sleeve' => '42'],
                    ['size' => '4-5', 'chest' => '56-58', 'length' => '52-53', 'sleeve' => '44'],
                    ['size' => '5-6', 'chest' => '58-60', 'length' => '53-54', 'sleeve' => '46'],
                    ['size' => '6-7', 'chest' => '60-62', 'length' => '54-55', 'sleeve' => '48'],
                    ['size' => '7-8', 'chest' => '62-64', 'length' => '55-57', 'sleeve' => '50'],
                    ['size' => '9-10', 'chest' => '66-70', 'length' => '58-60', 'sleeve' => '53'],
                    ['size' => '11-12', 'chest' => '72-76', 'length' => '61-63', 'sleeve' => '56'],
                    ['size' => '13-14', 'chest' => '78-82', 'length' => '64-67', 'sleeve' => '60'],
                ],
            ],
        ];
    }

    private function defaultFrontPageProducts(): array
    {
        return [
            'featured_product_ids' => [],
            'premade_product_ids' => [],
            'premade_quotes' => [],
        ];
    }

    private function defaultAdminNotificationSettings(): array
    {
        $events = [];
        foreach ($this->getAdminNotificationCatalog() as $section) {
            foreach ((array) data_get($section, 'items', []) as $item) {
                $key = trim((string) data_get($item, 'key', ''));
                if ($key === '') {
                    continue;
                }

                $events[$key] = [
                    'in_app' => true,
                    'email' => true,
                ];
            }
        }

        return ['events' => $events];
    }
}
