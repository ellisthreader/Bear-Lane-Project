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
    public const KEY_HOMEPAGE_CATEGORIES = 'homepage_categories';
    public const KEY_DELIVERY_SETTINGS = 'delivery_settings';
    public const KEY_HOMEPAGE_CONTENT = 'homepage_content';

    /** Section ids must match resources/js/Components/SiteEditor/sections.ts. Owner-made blank sections are "custom-xxxx". */
    public const HOMEPAGE_SECTIONS = ['hero', 'categories', 'idea', 'how', 'featured', 'premade', 'reviews', 'trust'];
    public const HOMEPAGE_CUSTOM_SECTION_PATTERN = '/^custom-[a-z0-9]{3,12}$/';
    public const HOMEPAGE_CONTENT_MAX_ENTRIES = 1000;
    /** Furthest (px) an element may be dragged from where the layout put it, and the allowed font sizes. */
    public const HOMEPAGE_MAX_OFFSET = 4000;
    public const HOMEPAGE_FONT_SIZE_RANGE = [8, 200];
    public const HOMEPAGE_CONTENT_UPLOAD_DIR = 'settings/homepage-content';

    public const HOMEPAGE_CATEGORY_MAX = 12;
    public const DELIVERY_METHOD_KINDS = ['standard', 'next_day', 'timed', 'collection'];
    public const DELIVERY_PRICE_MODES = ['fixed', 'live'];

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

    /**
     * Measurement guide. Stored as a list of groups so any product family (men,
     * women, kids, bags, ...) can carry its own columns. Legacy records that only
     * held men/women/kids with fixed columns are upgraded on read.
     *
     * @return array{groups: array<int, array<string, mixed>>}
     */
    public function getSizeGuide(): array
    {
        $stored = $this->get(self::KEY_SIZE_GUIDE, []);
        $stored = is_array($stored) ? $stored : [];

        $groups = isset($stored['groups']) && is_array($stored['groups'])
            ? $stored['groups']
            : $this->upgradeLegacySizeGuide($stored);

        $normalized = $this->normalizeSizeGuideGroups($groups);

        // Make sure the built-in groups always exist so product pages never lose their guide.
        $existingKeys = array_map(fn (array $group) => $group['key'], $normalized);
        foreach ($this->defaultSizeGuideGroups() as $default) {
            if (!in_array($default['key'], $existingKeys, true)) {
                $normalized[] = $default;
            }
        }

        return ['groups' => array_values($normalized)];
    }

    /**
     * Returns the group whose keywords best match the supplied haystack, or null.
     */
    public function findSizeGuideGroup(string $haystack): ?array
    {
        $needle = mb_strtolower($haystack);
        $best = null;
        $bestScore = 0;

        foreach ($this->getSizeGuide()['groups'] as $group) {
            $score = 0;
            foreach ((array) ($group['keywords'] ?? []) as $keyword) {
                $keyword = mb_strtolower(trim((string) $keyword));
                if ($keyword === '') {
                    continue;
                }
                // Whole-word match so "men" does not claim "women" or "mens beanie".
                $pattern = '/(?<![\\p{L}\\p{N}])' . preg_quote($keyword, '/') . '(?![\\p{L}\\p{N}])/u';
                if (preg_match($pattern, $needle) === 1) {
                    $score += mb_strlen($keyword);
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $group;
            }
        }

        return $best;
    }

    /**
     * Picks the measurement group assigned to a product's categories. The product's
     * own category wins, then its parent, and so on up the tree. Returns null when
     * no group has been assigned so callers can fall back to keyword matching.
     *
     * @param array<int, int> $categoryIds
     */
    public function findSizeGuideGroupForCategories(array $categoryIds): ?array
    {
        $categoryIds = array_values(array_filter(array_map('intval', $categoryIds)));
        if ($categoryIds === []) {
            return null;
        }

        $groups = $this->getSizeGuide()['groups'];
        $assigned = [];
        foreach ($groups as $group) {
            foreach ((array) ($group['category_ids'] ?? []) as $id) {
                $assigned[(int) $id] ??= $group;
            }
        }
        if ($assigned === []) {
            return null;
        }

        $parents = \App\Models\Category::query()->pluck('parent_id', 'id')->all();

        foreach ($categoryIds as $start) {
            $current = $start;
            $guard = 0;
            while ($current && $guard++ < 20) {
                if (isset($assigned[$current])) {
                    return $assigned[$current];
                }
                $current = isset($parents[$current]) ? (int) $parents[$current] : 0;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $legacy
     * @return array<int, array<string, mixed>>
     */
    private function upgradeLegacySizeGuide(array $legacy): array
    {
        $groups = [];
        foreach ($this->defaultSizeGuideGroups() as $default) {
            $section = $legacy[$default['key']] ?? null;
            if (!is_array($section)) {
                $groups[] = $default;
                continue;
            }

            $rows = [];
            foreach ((array) ($section['rows'] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $rows[] = [
                    'size' => trim((string) ($row['size'] ?? '')),
                    'chest' => trim((string) ($row['chest'] ?? '')),
                    'length' => trim((string) ($row['length'] ?? '')),
                    'sleeve' => trim((string) ($row['sleeve'] ?? '')),
                ];
            }

            $groups[] = [
                ...$default,
                'heading' => (string) ($section['heading'] ?? $default['heading']),
                'subtitle' => (string) ($section['subtitle'] ?? $default['subtitle']),
                'rows' => $rows !== [] ? $rows : $default['rows'],
            ];
        }

        return $groups;
    }

    /**
     * @param array<int, mixed> $groups
     * @return array<int, array<string, mixed>>
     */
    private function normalizeSizeGuideGroups(array $groups): array
    {
        $normalized = [];
        $seenKeys = [];

        foreach ($groups as $index => $group) {
            if (!is_array($group)) {
                continue;
            }

            $label = trim((string) ($group['label'] ?? ''));
            $key = $this->slugKey((string) ($group['key'] ?? $label), 'group-' . ($index + 1));
            if ($label === '') {
                $label = ucwords(str_replace('-', ' ', $key));
            }
            if (in_array($key, $seenKeys, true)) {
                $key .= '-' . ($index + 1);
            }
            $seenKeys[] = $key;

            $columns = [];
            $seenColumnKeys = [];
            foreach ((array) ($group['columns'] ?? []) as $columnIndex => $column) {
                $columnLabel = is_array($column) ? trim((string) ($column['label'] ?? '')) : trim((string) $column);
                if ($columnLabel === '') {
                    continue;
                }
                $columnKey = $this->slugKey(is_array($column) ? (string) ($column['key'] ?? $columnLabel) : $columnLabel, 'col-' . ($columnIndex + 1));
                if (in_array($columnKey, $seenColumnKeys, true)) {
                    $columnKey .= '-' . ($columnIndex + 1);
                }
                $seenColumnKeys[] = $columnKey;
                $columns[] = ['key' => $columnKey, 'label' => mb_substr($columnLabel, 0, 60)];
            }
            if ($columns === []) {
                $columns = [['key' => 'size', 'label' => 'Size']];
            }

            $rows = [];
            foreach ((array) ($group['rows'] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $normalizedRow = [];
                $hasValue = false;
                foreach ($columns as $column) {
                    $value = trim((string) ($row[$column['key']] ?? ''));
                    $normalizedRow[$column['key']] = mb_substr($value, 0, 60);
                    if ($value !== '') {
                        $hasValue = true;
                    }
                }
                if ($hasValue) {
                    $rows[] = $normalizedRow;
                }
            }

            $keywords = collect((array) ($group['keywords'] ?? []))
                ->map(fn ($keyword) => mb_strtolower(trim((string) $keyword)))
                ->filter()
                ->unique()
                ->take(30)
                ->values()
                ->all();
            if ($keywords === []) {
                // No admin-facing keyword box any more: match products on the table's own name
                // (e.g. "Men's Shirts" → men, mens, shirt, shirts).
                $keywords = collect(preg_split('/[^\\p{L}\\p{N}]+/u', mb_strtolower($label)) ?: [])
                    ->map(fn ($word) => trim((string) $word, "'"))
                    ->filter(fn ($word) => mb_strlen($word) >= 3 && !in_array($word, ['and', 'the', 'for', 'size', 'guide', 'table', 'measurements'], true))
                    ->flatMap(fn ($word) => [$word, rtrim($word, 's'), $word . 's'])
                    ->unique()
                    ->values()
                    ->all();
            }

            $categoryIds = collect((array) ($group['category_ids'] ?? []))
                ->map(fn ($id) => (int) $id)
                ->filter(fn (int $id) => $id > 0)
                ->unique()
                ->values()
                ->all();

            $normalized[] = [
                'key' => $key,
                'label' => mb_substr($label, 0, 80),
                'category_ids' => $categoryIds,
                'heading' => mb_substr(trim((string) ($group['heading'] ?? $label . ' Size Guide')), 0, 160) ?: $label . ' Size Guide',
                'subtitle' => mb_substr(trim((string) ($group['subtitle'] ?? '')), 0, 400),
                'keywords' => $keywords,
                'columns' => $columns,
                'rows' => $rows,
                'is_default' => in_array($key, ['men', 'women', 'kids', 'bags'], true),
            ];
        }

        return $normalized;
    }

    private function slugKey(string $value, string $fallback): string
    {
        $key = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $value) ?? ''));
        $key = trim($key, '-');

        return $key !== '' ? mb_substr($key, 0, 60) : $fallback;
    }

    public function getHomepageCategories(): array
    {
        $stored = $this->get(self::KEY_HOMEPAGE_CATEGORIES, []);
        $items = is_array($stored) && isset($stored['items']) && is_array($stored['items'])
            ? $stored['items']
            : $this->defaultHomepageCategories();

        $normalized = $this->normalizeHomepageCategories($items);

        return ['items' => array_map(function (array $item) {
            $item['image_url'] = $this->resolveAssetUrl((string) $item['image_path']) ?? asset('images/placeholder.jpg');
            return $item;
        }, $normalized)];
    }

    /**
     * @param array<int, mixed> $items
     */
    public function saveHomepageCategories(array $items): array
    {
        $this->put(self::KEY_HOMEPAGE_CATEGORIES, ['items' => $this->normalizeHomepageCategories($items)]);

        return $this->getHomepageCategories();
    }

    /**
     * @param array<int, mixed> $items
     * @return array<int, array{id: string, name: string, href: string, image_path: string}>
     */
    private function normalizeHomepageCategories(array $items): array
    {
        $normalized = [];
        $seen = [];
        foreach ($items as $index => $item) {
            if (!is_array($item)) {
                continue;
            }
            $name = mb_substr(trim((string) ($item['name'] ?? '')), 0, 60);
            if ($name === '') {
                continue;
            }
            $id = $this->slugKey((string) ($item['id'] ?? ''), '');
            if ($id === '' || in_array($id, $seen, true)) {
                $id = $this->slugKey($name, 'category-' . ($index + 1));
                $suffix = 2;
                while (in_array($id, $seen, true)) {
                    $id = $this->slugKey($name, 'category') . '-' . $suffix++;
                }
            }
            $seen[] = $id;

            $href = trim((string) ($item['href'] ?? ''));
            if ($href === '') {
                $href = '/category/' . $this->slugKey($name, 'all');
            } elseif (!preg_match('#^(https?://|/)#i', $href)) {
                $href = '/category/' . ltrim($href, '/');
            }

            $normalized[] = [
                'id' => $id,
                'name' => $name,
                'href' => mb_substr($href, 0, 255),
                'image_path' => mb_substr(trim((string) ($item['image_path'] ?? '')), 0, 255),
            ];

            if (count($normalized) >= self::HOMEPAGE_CATEGORY_MAX) {
                break;
            }
        }

        return $normalized;
    }

    private function defaultHomepageCategories(): array
    {
        return [
            ['id' => 'new-in', 'name' => 'New In', 'href' => '/category/new-in', 'image_path' => 'images/Category/new-in.jpg'],
            ['id' => 'pre-made', 'name' => 'Pre made', 'href' => '/category/pre-made', 'image_path' => 'images/Category/premade.jpg'],
            ['id' => 'sale', 'name' => 'Sale', 'href' => '/category/sale', 'image_path' => 'images/Category/sale.jpeg'],
            ['id' => 'kids-clothing', 'name' => 'Kids Clothing', 'href' => '/category/kids-clothing', 'image_path' => 'images/Category/kids.jpeg'],
            ['id' => 'teddies', 'name' => 'Teddies', 'href' => '/category/teddies', 'image_path' => 'images/Category/teddies.jpg'],
            ['id' => 't-shirts', 'name' => 'T-Shirts', 'href' => '/category/t-shirts', 'image_path' => 'images/Category/tshirts.jpeg'],
        ];
    }

    /**
     * Owner-editable homepage copy. Everything is an override of a default that lives in the
     * React components, keyed by element id (e.g. "idea.title"), so an empty store means
     * "show the site as built".
     *
     * @return array{texts: array|object, links: array|object, images: array|object, styles: array|object, lists: array|object, hidden: array|object, sections: array{order: array}}
     */
    public function getHomepageContent(): array
    {
        $stored = $this->get(self::KEY_HOMEPAGE_CONTENT, []);
        $content = $this->normalizeHomepageContent(is_array($stored) ? $stored : [], verifyImages: false);

        $content['images'] = array_map(fn (string $path) => [
            'path' => $path,
            'url' => $this->resolveAssetUrl($path),
        ], $content['images']);

        foreach (['texts', 'links', 'images', 'styles', 'lists', 'hidden'] as $map) {
            // Empty PHP arrays encode as [] — the client expects JSON objects for these maps.
            $content[$map] = $content[$map] === [] ? new \stdClass() : $content[$map];
        }

        return $content;
    }

    public function saveHomepageContent(array $payload): array
    {
        $this->put(self::KEY_HOMEPAGE_CONTENT, $this->normalizeHomepageContent($payload, verifyImages: true));

        return $this->getHomepageContent();
    }

    /**
     * Image paths the editor may point at: files bundled in public/images (or the hero) and
     * anything uploaded to the public disk under settings/. Never arbitrary paths or URLs.
     */
    public function isAllowedImagePath(string $path): bool
    {
        $relative = ltrim(trim($path), '/');
        if ($relative === '' || preg_match('/\.\.|\\\\|[\x00-\x1F]/', $relative) === 1) {
            return false;
        }

        if (preg_match('#^(images/|hero\.webp$)#', $relative) === 1) {
            return is_file(public_path($relative));
        }

        if (str_starts_with($relative, 'settings/')) {
            return Storage::disk('public')->exists($relative);
        }

        return false;
    }

    /**
     * Every stored image path the homepage currently points at (content, design, categories).
     *
     * @return array<int, string>
     */
    public function referencedImagePaths(): array
    {
        $paths = array_values(
            $this->normalizeHomepageContent((array) $this->get(self::KEY_HOMEPAGE_CONTENT, []), verifyImages: false)['images']
        );

        $design = $this->getWebsiteDesign();
        $paths = array_merge(
            $paths,
            (array) data_get($design, 'images.hero_slide_paths', []),
            [(string) data_get($design, 'images.nav_logo_path', ''), (string) data_get($design, 'images.footer_logo_path', '')],
            array_map(fn (array $item) => (string) ($item['image_path'] ?? ''), $this->getHomepageCategories()['items'])
        );

        return array_values(array_unique(array_filter(array_map(
            fn ($path) => ltrim(trim((string) $path), '/'),
            $paths
        ))));
    }

    /** Plain text only: no tags (a lone "<" as in "I <3 bears" is left alone), no line breaks, single spaces. */
    private function plainText(mixed $value, int $max): string
    {
        $text = preg_replace('#</?[a-z][^<>]*>#i', '', (string) $value) ?? '';
        $text = preg_replace('/[\x00-\x1F\x7F\s]+/u', ' ', $text) ?? '';

        return mb_substr(trim($text), 0, $max);
    }

    /**
     * @param array<string, mixed> $raw
     * @return array{texts: array, links: array, images: array, styles: array, lists: array, hidden: array, sections: array{order: array}}
     */
    private function normalizeHomepageContent(array $raw, bool $verifyImages): array
    {
        $validId = static fn (mixed $id): bool => is_string($id) && preg_match('/^[a-z0-9][a-z0-9._-]{0,99}$/i', $id) === 1;
        $map = static fn (mixed $value): array => is_array($value) ? $value : [];
        $cap = self::HOMEPAGE_CONTENT_MAX_ENTRIES;

        $texts = [];
        foreach (array_slice($map($raw['texts'] ?? []), 0, $cap, true) as $id => $value) {
            // Empty strings arrive as null (ConvertEmptyStringsToNull); a cleared text is a valid override.
            if (!$validId($id) || !(is_scalar($value) || $value === null)) {
                continue;
            }
            // The storefront also escapes it when rendering.
            $texts[$id] = $this->plainText($value, 2000);
        }

        $links = [];
        foreach (array_slice($map($raw['links'] ?? []), 0, $cap, true) as $id => $value) {
            if (!$validId($id) || !(is_scalar($value) || $value === null)) {
                continue;
            }
            $href = trim((string) $value);
            // An empty link is meaningful (it hides a social icon), anything else must be a safe scheme.
            if ($href === '' || (strlen($href) <= 255 && preg_match('#^(/(?!/)|https?://|mailto:|tel:|\#)[^\s\x00-\x1F]*$#i', $href) === 1)) {
                $links[$id] = $href;
            }
        }

        $images = [];
        foreach (array_slice($map($raw['images'] ?? []), 0, $cap, true) as $id => $value) {
            $path = is_array($value) ? ($value['path'] ?? '') : $value;
            if (!$validId($id) || !is_string($path)) {
                continue;
            }
            $path = ltrim(trim($path), '/');
            if ($path === '' || strlen($path) > 255) {
                continue;
            }
            if (!$verifyImages || $this->isAllowedImagePath($path)) {
                $images[$id] = $path;
            }
        }

        // Per element: colours, plus where it was dragged to (x/y, px) and its font size (px).
        [$minSize, $maxSize] = self::HOMEPAGE_FONT_SIZE_RANGE;
        $maxOffset = self::HOMEPAGE_MAX_OFFSET;
        $styles = [];
        foreach (array_slice($map($raw['styles'] ?? []), 0, $cap, true) as $id => $value) {
            if (!$validId($id) || !is_array($value)) {
                continue;
            }
            $entry = [];
            foreach (['color', 'background'] as $property) {
                $colour = strtoupper(trim((string) ($value[$property] ?? '')));
                if (preg_match('/^#[0-9A-F]{6}$/', $colour) === 1) {
                    $entry[$property] = $colour;
                }
            }
            foreach (['x', 'y'] as $axis) {
                if (isset($value[$axis]) && is_numeric($value[$axis]) && (int) round((float) $value[$axis]) !== 0) {
                    $entry[$axis] = max(-$maxOffset, min($maxOffset, (int) round((float) $value[$axis])));
                }
            }
            if (isset($value['size']) && is_numeric($value['size'])) {
                $entry['size'] = max($minSize, min($maxSize, (int) round((float) $value['size'])));
            }
            if ($entry !== []) {
                $styles[$id] = $entry;
            }
        }

        $lists = [];
        foreach (array_slice($map($raw['lists'] ?? []), 0, 80, true) as $id => $items) {
            if (!$validId($id) || !is_array($items)) {
                continue;
            }
            $lists[$id] = collect($items)
                ->filter(fn ($item) => is_string($item) && preg_match('/^[a-z0-9_-]{1,40}$/i', $item) === 1)
                ->unique()
                ->take(100)
                ->values()
                ->all();
        }

        // Elements the owner deleted, with a short readable name so they can be brought back later.
        $hidden = [];
        foreach (array_slice($map($raw['hidden'] ?? []), 0, $cap, true) as $id => $label) {
            if ($validId($id) && (is_scalar($label) || $label === null)) {
                $hidden[$id] = $this->plainText($label, 80);
            }
        }

        $sections = $map($raw['sections'] ?? []);
        $knownSection = fn (mixed $id): bool => is_string($id)
            && (in_array($id, self::HOMEPAGE_SECTIONS, true) || preg_match(self::HOMEPAGE_CUSTOM_SECTION_PATTERN, $id) === 1);

        // Earlier versions kept deleted sections in sections.hidden; fold them into the general list.
        foreach ((array) ($sections['hidden'] ?? []) as $legacyId) {
            if (is_string($legacyId) && in_array($legacyId, self::HOMEPAGE_SECTIONS, true)) {
                $hidden["section.{$legacyId}"] ??= 'Section: ' . ucfirst($legacyId);
            }
        }

        return [
            'texts' => $texts,
            'links' => $links,
            'images' => $images,
            'styles' => $styles,
            'lists' => $lists,
            'hidden' => $hidden,
            'sections' => [
                'order' => collect(is_array($sections['order'] ?? null) ? $sections['order'] : [])
                    ->filter($knownSection)
                    ->unique()
                    ->take(40)
                    ->values()
                    ->all(),
            ],
        ];
    }

    /**
     * Delivery configuration: carriers, delivery methods and parcel presets.
     *
     * @return array{carriers: array, methods: array, parcel_options: array}
     */
    public function getDeliverySettings(): array
    {
        $stored = $this->get(self::KEY_DELIVERY_SETTINGS, []);
        $stored = is_array($stored) ? $stored : [];
        $defaults = $this->defaultDeliverySettings();

        $carriers = $this->normalizeCarriers(isset($stored['carriers']) && is_array($stored['carriers']) ? $stored['carriers'] : $defaults['carriers']);
        $methods = $this->normalizeDeliveryMethods(isset($stored['methods']) && is_array($stored['methods']) ? $stored['methods'] : $defaults['methods'], $carriers);
        $parcelOptions = $this->normalizeParcelOptions(
            isset($stored['parcel_options']) && is_array($stored['parcel_options']) ? $stored['parcel_options'] : $defaults['parcel_options'],
            $carriers
        );

        return [
            'carriers' => $carriers,
            'methods' => $methods,
            'parcel_options' => $parcelOptions,
        ];
    }

    public function saveDeliverySettings(array $payload): array
    {
        $current = $this->getDeliverySettings();
        $carriers = $this->normalizeCarriers(isset($payload['carriers']) && is_array($payload['carriers']) ? $payload['carriers'] : $current['carriers']);
        $methods = $this->normalizeDeliveryMethods(isset($payload['methods']) && is_array($payload['methods']) ? $payload['methods'] : $current['methods'], $carriers);
        $parcelOptions = $this->normalizeParcelOptions(
            isset($payload['parcel_options']) && is_array($payload['parcel_options']) ? $payload['parcel_options'] : $current['parcel_options'],
            $carriers
        );

        $this->put(self::KEY_DELIVERY_SETTINGS, [
            'carriers' => $carriers,
            'methods' => $methods,
            'parcel_options' => $parcelOptions,
        ]);

        return $this->getDeliverySettings();
    }

    /**
     * Enabled delivery methods only, in display order.
     */
    public function getEnabledDeliveryMethods(): array
    {
        return array_values(array_filter(
            $this->getDeliverySettings()['methods'],
            fn (array $method) => (bool) $method['enabled']
        ));
    }

    public function getEnabledCarriers(): array
    {
        return array_values(array_filter(
            $this->getDeliverySettings()['carriers'],
            fn (array $carrier) => (bool) $carrier['enabled']
        ));
    }

    /**
     * Parcel presets and carriers in the shape the product editor needs.
     */
    public function getParcelOptionsForEditor(): array
    {
        $settings = $this->getDeliverySettings();
        $enabledCarrierKeys = array_map(fn (array $carrier) => $carrier['key'], array_filter($settings['carriers'], fn ($c) => (bool) $c['enabled']));

        return [
            'carriers' => array_values(array_map(fn (array $carrier) => [
                'key' => $carrier['key'],
                'name' => $carrier['name'],
                'enabled' => (bool) $carrier['enabled'],
                'logo_url' => $carrier['logo_url'],
            ], $settings['carriers'])),
            'parcel_options' => array_values(array_filter(
                $settings['parcel_options'],
                fn (array $option) => in_array($option['carrier_key'], $enabledCarrierKeys, true)
            )),
        ];
    }

    /**
     * @param array<int, mixed> $carriers
     */
    private function normalizeCarriers(array $carriers): array
    {
        $normalized = [];
        $seen = [];
        foreach ($carriers as $index => $carrier) {
            if (!is_array($carrier)) {
                continue;
            }
            $name = mb_substr(trim((string) ($carrier['name'] ?? '')), 0, 60);
            if ($name === '') {
                continue;
            }
            $key = str_replace('-', '_', $this->slugKey((string) ($carrier['key'] ?? $name), 'carrier_' . ($index + 1)));
            if (in_array($key, $seen, true)) {
                $key .= '_' . ($index + 1);
            }
            $seen[] = $key;

            $match = collect((array) ($carrier['match'] ?? []))
                ->map(fn ($term) => mb_strtolower(trim((string) $term)))
                ->filter()
                ->unique()
                ->values()
                ->all();
            if ($match === []) {
                $match = [mb_strtolower($name)];
            }

            $logo = mb_substr(trim((string) ($carrier['logo'] ?? '')), 0, 255);

            $normalized[] = [
                'key' => $key,
                'name' => $name,
                'enabled' => $this->toBool($carrier['enabled'] ?? true, true),
                'match' => $match,
                'logo' => $logo,
                'logo_url' => $logo !== '' ? $this->resolveAssetUrl($logo) : null,
                'notes' => mb_substr(trim((string) ($carrier['notes'] ?? '')), 0, 240),
            ];
        }

        return $normalized;
    }

    /**
     * @param array<int, mixed> $methods
     * @param array<int, array<string, mixed>> $carriers
     */
    private function normalizeDeliveryMethods(array $methods, array $carriers): array
    {
        $carrierKeys = array_map(fn (array $carrier) => $carrier['key'], $carriers);
        $normalized = [];
        $seen = [];
        $timedSeen = false;

        foreach ($methods as $index => $method) {
            if (!is_array($method)) {
                continue;
            }
            $label = mb_substr(trim((string) ($method['label'] ?? '')), 0, 80);
            if ($label === '') {
                continue;
            }

            $kind = strtolower(trim((string) ($method['kind'] ?? 'standard')));
            if (!in_array($kind, self::DELIVERY_METHOD_KINDS, true)) {
                $kind = 'standard';
            }
            if ($kind === 'timed') {
                // Slot reservations are keyed on TIMED throughout checkout, so only one timed method is allowed.
                if ($timedSeen) {
                    $kind = 'standard';
                } else {
                    $timedSeen = true;
                }
            }

            $rawKey = strtoupper(trim((string) ($method['key'] ?? '')));
            $key = $kind === 'timed' ? 'TIMED' : preg_replace('/[^A-Z0-9_]+/', '_', $rawKey !== '' ? $rawKey : strtoupper($label));
            $key = trim((string) $key, '_');
            if ($key === '' || $key === 'TIMED' && $kind !== 'timed') {
                $key = 'METHOD_' . ($index + 1);
            }
            $key = mb_substr($key, 0, 24);
            $suffix = 2;
            $base = mb_substr($key, 0, 21);
            while (in_array($key, $seen, true)) {
                $key = $base . '_' . $suffix++;
            }
            $seen[] = $key;

            $carrierKey = str_replace('-', '_', $this->slugKey((string) ($method['carrier_key'] ?? ''), ''));
            if ($carrierKey !== '' && !in_array($carrierKey, $carrierKeys, true)) {
                $carrierKey = '';
            }

            $priceMode = strtolower(trim((string) ($method['price_mode'] ?? 'fixed')));
            if (!in_array($priceMode, self::DELIVERY_PRICE_MODES, true)) {
                $priceMode = 'fixed';
            }

            $etaMin = max(0, (int) ($method['eta_min_days'] ?? 0));
            $etaMax = max($etaMin, (int) ($method['eta_max_days'] ?? $etaMin));
            $cutoff = (int) ($method['cutoff_hour'] ?? 22);
            $cutoff = max(0, min(23, $cutoff));

            $normalized[] = [
                'key' => $key,
                'label' => $label,
                'description' => mb_substr(trim((string) ($method['description'] ?? '')), 0, 160),
                'kind' => $kind,
                'enabled' => $this->toBool($method['enabled'] ?? true, true),
                'price' => $this->toMoney($method['price'] ?? 0, 0),
                'price_mode' => $priceMode,
                'carrier_key' => $carrierKey,
                'service_name' => mb_substr(trim((string) ($method['service_name'] ?? '')), 0, 120),
                'eta_min_days' => $etaMin,
                'eta_max_days' => $etaMax,
                'cutoff_hour' => $cutoff,
                'free_for_members' => $this->toBool($method['free_for_members'] ?? true, true),
                'require_carrier_service' => $this->toBool($method['require_carrier_service'] ?? ($kind === 'next_day'), $kind === 'next_day'),
                'sort_order' => count($normalized),
            ];
        }

        return $normalized;
    }

    /**
     * @param array<int, mixed> $options
     * @param array<int, array<string, mixed>> $carriers
     */
    private function normalizeParcelOptions(array $options, array $carriers): array
    {
        $carrierKeys = array_map(fn (array $carrier) => $carrier['key'], $carriers);
        $normalized = [];
        $seen = [];

        foreach ($options as $index => $option) {
            if (!is_array($option)) {
                continue;
            }
            $label = mb_substr(trim((string) ($option['label'] ?? '')), 0, 60);
            $carrierKey = str_replace('-', '_', $this->slugKey((string) ($option['carrier_key'] ?? ''), ''));
            if ($label === '' || $carrierKey === '' || !in_array($carrierKey, $carrierKeys, true)) {
                continue;
            }

            $key = str_replace('-', '_', $this->slugKey((string) ($option['key'] ?? ($carrierKey . '_' . $label)), 'parcel_' . ($index + 1)));
            $suffix = 2;
            $base = $key;
            while (in_array($key, $seen, true)) {
                $key = $base . '_' . $suffix++;
            }
            $seen[] = $key;

            $normalized[] = [
                'key' => $key,
                'carrier_key' => $carrierKey,
                'label' => $label,
                'max_weight_kg' => max(0.01, round((float) ($option['max_weight_kg'] ?? 1), 2)),
                'length_cm' => max(0.1, round((float) ($option['length_cm'] ?? 30), 1)),
                'width_cm' => max(0.1, round((float) ($option['width_cm'] ?? 20), 1)),
                'height_cm' => max(0.1, round((float) ($option['height_cm'] ?? 5), 1)),
                'price_label' => mb_substr(trim((string) ($option['price_label'] ?? '')), 0, 40),
                'description' => mb_substr(trim((string) ($option['description'] ?? '')), 0, 160),
            ];
        }

        return $normalized;
    }

    private function defaultDeliverySettings(): array
    {
        $pricing = (array) config('delivery.pricing', []);

        $parcel = fn (string $carrier, string $tier, string $label, float $weight, float $l, float $w, float $h, string $price, string $description) => [
            'key' => "{$carrier}_{$tier}",
            'carrier_key' => $carrier,
            'label' => $label,
            'max_weight_kg' => $weight,
            'length_cm' => $l,
            'width_cm' => $w,
            'height_cm' => $h,
            'price_label' => $price,
            'description' => $description,
        ];

        return [
            'carriers' => [
                ['key' => 'royal_mail', 'name' => 'Royal Mail', 'enabled' => true, 'match' => ['royal mail', 'royalmail'], 'logo' => 'images/Admin/couriers/royal-mail.svg', 'notes' => ''],
                ['key' => 'evri', 'name' => 'Evri', 'enabled' => true, 'match' => ['evri', 'hermes'], 'logo' => 'images/Admin/couriers/evri.svg', 'notes' => ''],
                ['key' => 'dpd', 'name' => 'DPD', 'enabled' => true, 'match' => ['dpd'], 'logo' => 'images/Admin/couriers/dpd.svg', 'notes' => ''],
            ],
            'methods' => [
                [
                    'key' => 'STANDARD',
                    'label' => 'Standard Delivery',
                    'description' => 'Delivered within 2-3 days',
                    'kind' => 'standard',
                    'enabled' => true,
                    'price' => (float) ($pricing['STANDARD'] ?? 5.95),
                    'price_mode' => 'fixed',
                    'carrier_key' => '',
                    'service_name' => '',
                    'eta_min_days' => 2,
                    'eta_max_days' => 3,
                    'cutoff_hour' => 22,
                    'free_for_members' => true,
                    'require_carrier_service' => false,
                ],
                [
                    'key' => 'NEXT_DAY',
                    'label' => 'Next Day Delivery',
                    'description' => 'Delivered within 1 working day',
                    'kind' => 'next_day',
                    'enabled' => true,
                    'price' => (float) ($pricing['NEXT_DAY'] ?? 7.95),
                    'price_mode' => 'fixed',
                    'carrier_key' => '',
                    'service_name' => '',
                    'eta_min_days' => 1,
                    'eta_max_days' => 1,
                    'cutoff_hour' => 22,
                    'free_for_members' => true,
                    'require_carrier_service' => true,
                ],
                [
                    'key' => 'TIMED',
                    'label' => 'Timed Delivery',
                    'description' => 'Choose a delivery date',
                    'kind' => 'timed',
                    'enabled' => true,
                    'price' => (float) ($pricing['TIMED'] ?? 10.95),
                    'price_mode' => 'fixed',
                    'carrier_key' => '',
                    'service_name' => '',
                    'eta_min_days' => 1,
                    'eta_max_days' => 14,
                    'cutoff_hour' => 22,
                    'free_for_members' => true,
                    'require_carrier_service' => false,
                ],
            ],
            'parcel_options' => [
                $parcel('evri', 'very_small', 'Very Small', 1, 35, 25, 2.5, '£2.62', 'Size 35 x 25 x 2.5 cm, under 1kg.'),
                $parcel('evri', 'small', 'Small', 2, 45, 35, 16, '£2.62 - £3.20', 'Typical small parcel, usually 1-2kg.'),
                $parcel('evri', 'medium', 'Medium', 5, 60, 50, 50, '£2.62 - £5.87', 'Up to 60 x 50 x 50 cm, 2-5kg.'),
                $parcel('evri', 'large', 'Large', 15, 120, 63, 63, '£5.87 - £9.01', 'Up to 120cm length / 245cm girth, 5-15kg.'),
                $parcel('royal_mail', 'very_small', 'Very Small', 0.75, 35, 25, 2.5, '£1.55 - £3.60', 'Large Letter format, up to 750g.'),
                $parcel('royal_mail', 'small', 'Small', 2, 45, 35, 16, '£3.90 - £4.99', 'Small parcel up to 2kg.'),
                $parcel('royal_mail', 'medium', 'Medium', 20, 61, 46, 46, '£6.29+', 'Tracked/courier parcel up to 20kg.'),
                $parcel('royal_mail', 'large', 'Large', 20, 70, 50, 50, '£7+', 'Larger courier parcels, price varies.'),
                $parcel('dpd', 'very_small', 'Very Small', 1, 30, 30, 30, '£4.79 - £6', 'Compact parcel under 1kg.'),
                $parcel('dpd', 'small', 'Small', 5, 45, 35, 35, '£5 - £7', 'Up to 45 x 35 x 35 cm, 1-5kg.'),
                $parcel('dpd', 'medium', 'Medium', 20, 70, 50, 50, '£6 - £10', 'Up to 70 x 50 x 50 cm, 5-20kg.'),
                $parcel('dpd', 'large', 'Large', 30, 175, 63, 63, '£10+', 'Up to 175cm length / 300cm girth, 20-30kg.'),
            ],
        ];
    }

    /**
     * Resolves an image path that may live in public/ (e.g. images/Category/x.jpg)
     * or on the public storage disk (e.g. settings/homepage/x.jpg).
     */
    public function resolveAssetUrl(string $path): ?string
    {
        $trimmed = trim($path);
        if ($trimmed === '') {
            return null;
        }
        if (preg_match('/^https?:\/\//i', $trimmed) === 1) {
            return $trimmed;
        }
        $relative = ltrim($trimmed, '/');
        if (str_starts_with($relative, 'storage/')) {
            return asset($relative);
        }
        if (file_exists(public_path($relative))) {
            return asset($relative);
        }

        return Storage::disk('public')->url($relative);
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

    /**
     * Accepts either the new `{groups: [...]}` shape or the legacy men/women/kids map.
     */
    public function saveSizeGuide(array $payload): array
    {
        $groups = isset($payload['groups']) && is_array($payload['groups'])
            ? $payload['groups']
            : $this->upgradeLegacySizeGuide($payload);

        $this->put(self::KEY_SIZE_GUIDE, ['groups' => $this->normalizeSizeGuideGroups($groups)]);

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
            'homepage_categories' => $this->getHomepageCategories()['items'],
            'homepage_content' => $this->getHomepageContent(),
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

    /** Uploaded files live on the public disk; bundled ones (images/…, hero.webp) live in public/. */
    private function publicUrlForPath(string $path): ?string
    {
        return $this->resolveAssetUrl($path);
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

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultSizeGuideGroups(): array
    {
        $garmentColumns = [
            ['key' => 'size', 'label' => 'Size'],
            ['key' => 'chest', 'label' => 'Chest CM'],
            ['key' => 'length', 'label' => 'Waist CM'],
            ['key' => 'sleeve', 'label' => 'Arm Length CM'],
        ];
        $row = fn (string $size, string $chest, string $length, string $sleeve) => [
            'size' => $size, 'chest' => $chest, 'length' => $length, 'sleeve' => $sleeve,
        ];

        return [
            [
                'key' => 'men',
                'label' => 'Men',
                'heading' => "Men's Size Guide",
                'subtitle' => 'Size, chest, waist, and arm length measurements in cm.',
                'keywords' => ['men', 'mens', "men's", 'man', 'male', 'unisex'],
                'columns' => $garmentColumns,
                'rows' => [
                    $row('XS', '84-89', '71-76', '81'),
                    $row('S', '90-95', '76-81', '83'),
                    $row('M', '96-101', '81-86', '86'),
                    $row('L', '102-107', '86-91', '89'),
                    $row('XL', '108-113', '91-97', '91'),
                    $row('XXL', '114-119', '97-102', '94'),
                    $row('3XL', '120-125', '102-107', '96'),
                ],
                'is_default' => true,
            ],
            [
                'key' => 'women',
                'label' => 'Women',
                'heading' => "Women's Size Guide",
                'subtitle' => 'UK size conversion with chest, waist, and arm length in cm.',
                'keywords' => ['women', 'womens', "women's", 'woman', 'ladies', 'lady', 'female'],
                'columns' => $garmentColumns,
                'rows' => [
                    $row('UK 4', '76-79', '58-61', '74'),
                    $row('UK 6', '80-83', '62-65', '75'),
                    $row('UK 8', '84-87', '66-69', '76'),
                    $row('UK 10', '88-91', '70-73', '77'),
                    $row('UK 12', '92-95', '74-77', '78'),
                    $row('UK 14', '96-99', '78-81', '79'),
                    $row('UK 16', '100-104', '82-86', '80'),
                    $row('UK 18', '105-110', '87-92', '81'),
                    $row('UK 20', '111-116', '93-98', '82'),
                ],
                'is_default' => true,
            ],
            [
                'key' => 'kids',
                'label' => 'Kids',
                'heading' => "Kids' Size Guide",
                'subtitle' => 'Kids chest, waist, and arm length measurements in cm.',
                'keywords' => ['kids', 'kid', 'child', 'children', 'boys', 'boy', 'girls', 'girl', 'baby', 'babies', 'toddler', 'junior', 'bodysuit'],
                'columns' => $garmentColumns,
                'rows' => [
                    $row('1-2', '50-52', '49-50', '38'),
                    $row('2-3', '52-54', '50-51', '40'),
                    $row('3-4', '54-56', '51-52', '42'),
                    $row('4-5', '56-58', '52-53', '44'),
                    $row('5-6', '58-60', '53-54', '46'),
                    $row('6-7', '60-62', '54-55', '48'),
                    $row('7-8', '62-64', '55-57', '50'),
                    $row('9-10', '66-70', '58-60', '53'),
                    $row('11-12', '72-76', '61-63', '56'),
                    $row('13-14', '78-82', '64-67', '60'),
                ],
                'is_default' => true,
            ],
            [
                'key' => 'bags',
                'label' => 'Bags',
                'heading' => 'Bag Measurements',
                'subtitle' => 'Width, height, depth and handle drop in cm for bags and tote bags.',
                'keywords' => ['bag', 'bags', 'tote', 'totes', 'tote bag', 'shopper', 'backpack', 'pouch'],
                'columns' => [
                    ['key' => 'size', 'label' => 'Style'],
                    ['key' => 'width', 'label' => 'Width CM'],
                    ['key' => 'height', 'label' => 'Height CM'],
                    ['key' => 'depth', 'label' => 'Depth CM'],
                    ['key' => 'handle', 'label' => 'Handle Drop CM'],
                ],
                'rows' => [
                    ['size' => 'Tote Bag', 'width' => '38', 'height' => '42', 'depth' => '10', 'handle' => '25'],
                    ['size' => 'Mini Tote', 'width' => '30', 'height' => '32', 'depth' => '8', 'handle' => '20'],
                    ['size' => 'Shopper', 'width' => '45', 'height' => '40', 'depth' => '15', 'handle' => '30'],
                ],
                'is_default' => true,
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
