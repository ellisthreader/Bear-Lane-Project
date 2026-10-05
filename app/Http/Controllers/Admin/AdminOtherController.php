<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Services\HomepageEditorService;
use App\Services\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminOtherController extends Controller
{
    public function __construct(
        private readonly StoreSettingsService $settings,
        private readonly HomepageEditorService $homepageEditor,
    ) {
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Other/OtherIndex', [
            'sections' => [
                [
                    'title' => 'Edit homepage live',
                    'description' => 'Open the real homepage and click any text, image, colour or section to change it.',
                    'href' => '/?edit=1',
                    'group' => 'Storefront',
                ],
                [
                    'title' => 'Homepage',
                    'description' => 'Category circles, featured products and pre-made design rails on the homepage.',
                    'href' => '/admin/other/homepage',
                    'group' => 'Storefront',
                ],
                [
                    'title' => 'Personalise Products',
                    'description' => 'Choose which products customers can pick and personalise from the homepage.',
                    'href' => '/admin/other/personalise',
                    'group' => 'Storefront',
                ],
                [
                    'title' => 'Website Design',
                    'description' => 'Change storefront colours, fonts, and imagery with a live preview.',
                    'href' => '/admin/other/website-design',
                    'group' => 'Storefront',
                ],
                [
                    'title' => 'Delivery & Carriers',
                    'description' => 'Delivery methods, prices, carriers and parcel options.',
                    'href' => '/admin/other/delivery',
                    'group' => 'Products & Delivery',
                ],
                [
                    'title' => 'Measurements',
                    'description' => 'Size and measurement tables for clothing, kids and bags.',
                    'href' => '/admin/other/size-guide',
                    'group' => 'Products & Delivery',
                ],
                [
                    'title' => 'Prices',
                    'description' => 'Configure printing pricing rules.',
                    'href' => '/admin/other/prices',
                    'group' => 'Pricing',
                ],
                [
                    'title' => 'Discount Codes',
                    'description' => 'Create, update, and deactivate checkout discount codes.',
                    'href' => '/admin/other/discount-codes',
                    'group' => 'Pricing',
                ],
                [
                    'title' => 'Tax Settings',
                    'description' => 'Set VAT/tax behaviour for checkout across the store.',
                    'href' => '/admin/other/tax-settings',
                    'group' => 'Pricing',
                ],
                [
                    'title' => 'Site Settings',
                    'description' => 'Edit brand-level site details, assets, and maintenance mode.',
                    'href' => '/admin/other/site-settings',
                    'group' => 'Store',
                ],
                [
                    'title' => 'Notifications',
                    'description' => 'Configure which admin alerts appear on-site and which trigger email delivery.',
                    'href' => '/admin/other/notifications',
                    'group' => 'Store',
                ],
            ],
        ]);
    }

    public function prices(): Response
    {
        return Inertia::render('Admin/Other/Prices', [
            'pricing' => $this->settings->getDesignPricing(),
        ]);
    }

    public function updatePrices(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'printing.text_price' => ['required', 'numeric', 'min:0'],
            'printing.clipart_price' => ['required', 'numeric', 'min:0'],
            'printing.image_price' => ['required', 'numeric', 'min:0'],
            'printing.per_side_price' => ['required', 'numeric', 'min:0'],
        ]);

        $pricing = $this->settings->saveDesignPricing($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'pricing' => $pricing,
                'message' => 'Pricing rules updated.',
            ]);
        }

        return back()->with('success', 'Pricing rules updated.');
    }

    public function discountCodes(): Response
    {
        return Inertia::render('Admin/Other/DiscountCodes', [
            'discountCodes' => $this->discountCodesPayload(),
        ]);
    }

    public function storeDiscountCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:60', 'unique:coupons,code'],
            'discount_type' => ['required', 'in:percent,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0.01'],
            'expiry_date' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'minimum_order_value' => ['nullable', 'numeric', 'min:0'],
            'active' => ['required', 'boolean'],
        ]);

        $coupon = Coupon::query()->create([
            'code' => strtoupper(trim($validated['code'])),
            'type' => $validated['discount_type'],
            'value' => $validated['discount_type'] === 'percent'
                ? (int) round((float) $validated['discount_value'])
                : (int) round((float) $validated['discount_value'] * 100),
            'min_spend' => (int) round((float) ($validated['minimum_order_value'] ?? 0) * 100),
            'usage_limit' => $validated['usage_limit'] ?? null,
            'active' => (bool) $validated['active'],
            'expires_at' => $validated['expiry_date'] ?? null,
            'starts_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Discount code created.',
            'discount_code' => $this->mapCoupon($coupon),
        ]);
    }

    public function updateDiscountCode(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:60', 'unique:coupons,code,' . $coupon->id],
            'discount_type' => ['required', 'in:percent,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0.01'],
            'expiry_date' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'minimum_order_value' => ['nullable', 'numeric', 'min:0'],
            'active' => ['required', 'boolean'],
        ]);

        $coupon->fill([
            'code' => strtoupper(trim($validated['code'])),
            'type' => $validated['discount_type'],
            'value' => $validated['discount_type'] === 'percent'
                ? (int) round((float) $validated['discount_value'])
                : (int) round((float) $validated['discount_value'] * 100),
            'min_spend' => (int) round((float) ($validated['minimum_order_value'] ?? 0) * 100),
            'usage_limit' => $validated['usage_limit'] ?? null,
            'active' => (bool) $validated['active'],
            'expires_at' => $validated['expiry_date'] ?? null,
        ]);
        $coupon->save();

        return response()->json([
            'success' => true,
            'message' => 'Discount code updated.',
            'discount_code' => $this->mapCoupon($coupon->fresh()),
        ]);
    }

    public function deleteDiscountCode(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json([
            'success' => true,
            'message' => 'Discount code deleted.',
        ]);
    }

    public function siteSettings(): Response
    {
        return Inertia::render('Admin/Other/SiteSettings', [
            'siteSettings' => $this->settings->getSiteSettings(),
        ]);
    }

    public function updateSiteSettings(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:180'],
            'support_email' => ['nullable', 'email', 'max:180'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'business_address' => ['nullable', 'string', 'max:3000'],
            'maintenance_mode' => ['required', 'boolean'],
            'logo' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/svg+xml', 'max:8192'],
            'favicon' => ['nullable', 'file', 'mimetypes:image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml', 'max:4096'],
        ]);

        $existing = $this->settings->getSiteSettings();

        $logoPath = (string) ($existing['logo_path'] ?? '');
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('settings/site', 'public');
            $this->deleteStoredAssetIfNeeded((string) ($existing['logo_path'] ?? ''), $logoPath);
        }

        $faviconPath = (string) ($existing['favicon_path'] ?? '');
        if ($request->hasFile('favicon')) {
            $faviconPath = $request->file('favicon')->store('settings/site', 'public');
            $this->deleteStoredAssetIfNeeded((string) ($existing['favicon_path'] ?? ''), $faviconPath);
        }

        $siteSettings = $this->settings->saveSiteSettings([
            ...$validated,
            'logo_path' => $logoPath,
            'favicon_path' => $faviconPath,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'site_settings' => $siteSettings,
                'message' => 'Site settings updated.',
            ]);
        }

        return back()->with('success', 'Site settings updated.');
    }

    public function taxSettings(): Response
    {
        return Inertia::render('Admin/Other/TaxSettings', [
            'taxSettings' => $this->settings->getTaxSettings(),
        ]);
    }

    public function updateTaxSettings(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'rate_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'price_mode' => ['required', 'in:inclusive,exclusive'],
        ]);

        $taxSettings = $this->settings->saveTaxSettings($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'tax_settings' => $taxSettings,
                'message' => 'Tax settings updated.',
            ]);
        }

        return back()->with('success', 'Tax settings updated.');
    }

    public function sizeGuide(): Response
    {
        $categories = \App\Models\Category::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id'])
            ->map(fn (\App\Models\Category $category) => [
                'id' => (int) $category->id,
                'name' => (string) $category->name,
                'slug' => (string) $category->slug,
                'parent_id' => $category->parent_id ? (int) $category->parent_id : null,
            ])
            ->values()
            ->all();

        return Inertia::render('Admin/Other/SizeGuide', [
            'sizeGuide' => $this->settings->getSizeGuide(),
            'categories' => $categories,
        ]);
    }

    public function updateSizeGuide(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'groups' => ['required', 'array', 'min:1', 'max:20'],
            'groups.*.key' => ['nullable', 'string', 'max:60'],
            'groups.*.label' => ['required', 'string', 'max:80'],
            'groups.*.heading' => ['nullable', 'string', 'max:160'],
            'groups.*.subtitle' => ['nullable', 'string', 'max:400'],
            'groups.*.category_ids' => ['nullable', 'array', 'max:200'],
            'groups.*.category_ids.*' => ['integer'],
            'groups.*.keywords' => ['nullable', 'array', 'max:30'],
            'groups.*.keywords.*' => ['nullable', 'string', 'max:40'],
            'groups.*.columns' => ['required', 'array', 'min:1', 'max:8'],
            'groups.*.columns.*.key' => ['nullable', 'string', 'max:60'],
            'groups.*.columns.*.label' => ['required', 'string', 'max:60'],
            'groups.*.rows' => ['nullable', 'array', 'max:60'],
            'groups.*.rows.*' => ['nullable', 'array'],
            'groups.*.rows.*.*' => ['nullable', 'string', 'max:60'],
        ]);

        $sizeGuide = $this->settings->saveSizeGuide($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'size_guide' => $sizeGuide,
                'message' => 'Measurements saved.',
            ]);
        }

        return back()->with('success', 'Measurements saved.');
    }

    public function frontPage(Request $request): RedirectResponse
    {
        $tab = (string) $request->query('tab', '');
        $target = '/admin/other/homepage' . ($tab !== '' ? '?tab=' . urlencode($tab) : '');

        return redirect($target);
    }

    public function homepage(): Response
    {
        return Inertia::render('Admin/Other/Homepage', [
            'frontPage' => $this->settings->getFrontPageProducts(),
            'homepageCategories' => $this->settings->getHomepageCategories()['items'],
            'products' => $this->homepageEditor->productLibrary(),
            'categoryLinks' => $this->homepageEditor->categoryLinkOptions(),
            'maxCategories' => StoreSettingsService::HOMEPAGE_CATEGORY_MAX,
        ]);
    }

    /**
     * Saves the homepage category circles. Sent as multipart so new images can be
     * uploaded in the same request: `items` is a JSON list where an item may carry
     * `upload_key` pointing at a file in `uploads[<key>]`.
     */
    public function updateHomepageCategories(Request $request): JsonResponse
    {
        $request->validate([
            'items' => ['required', 'string', 'max:20000'],
            'uploads' => ['nullable', 'array', 'max:' . StoreSettingsService::HOMEPAGE_CATEGORY_MAX],
            'uploads.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,image/avif,image/gif', 'max:8192'],
        ]);

        $decoded = json_decode((string) $request->input('items'), true);
        if (!is_array($decoded)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'items' => 'The category list is invalid.',
            ]);
        }

        $existing = collect($this->settings->getHomepageCategories()['items'])->keyBy('id');
        $keptPaths = [];
        $items = [];

        foreach (array_slice($decoded, 0, StoreSettingsService::HOMEPAGE_CATEGORY_MAX) as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $id = trim((string) ($entry['id'] ?? ''));
            $name = trim((string) ($entry['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $current = $id !== '' ? $existing->get($id) : null;
            $imagePath = (string) ($current['image_path'] ?? '');

            $uploadKey = trim((string) ($entry['upload_key'] ?? ''));
            if ($uploadKey !== '' && $request->hasFile("uploads.{$uploadKey}")) {
                $file = $request->file("uploads.{$uploadKey}");
                if ($file) {
                    $imagePath = $file->store('settings/homepage', 'public');
                }
            } elseif (!empty($entry['image_path']) && is_string($entry['image_path'])) {
                // Allow re-pointing at a bundled image (e.g. images/Category/x.jpg) but never at arbitrary paths.
                $candidate = ltrim(trim($entry['image_path']), '/');
                if ($candidate === (string) ($current['image_path'] ?? '') || str_starts_with($candidate, 'images/')) {
                    $imagePath = $candidate;
                }
            }

            if ($imagePath !== '') {
                $keptPaths[] = $imagePath;
            }

            $items[] = [
                'id' => $id,
                'name' => $name,
                'href' => (string) ($entry['href'] ?? ''),
                'image_path' => $imagePath,
            ];
        }

        if ($items === []) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'items' => 'Add at least one category.',
            ]);
        }

        // Remove uploaded images that are no longer referenced.
        foreach ($existing as $old) {
            $oldPath = (string) ($old['image_path'] ?? '');
            if ($oldPath !== '' && !in_array($oldPath, $keptPaths, true)) {
                $this->deleteStoredAssetIfNeeded($oldPath, '');
            }
        }

        $saved = $this->settings->saveHomepageCategories($items);

        return response()->json([
            'success' => true,
            'homepage_categories' => $saved['items'],
            'message' => 'Homepage categories saved.',
        ]);
    }

    public function delivery(): Response
    {
        return Inertia::render('Admin/Other/Delivery', [
            'delivery' => $this->settings->getDeliverySettings(),
            'kinds' => StoreSettingsService::DELIVERY_METHOD_KINDS,
            'priceModes' => StoreSettingsService::DELIVERY_PRICE_MODES,
        ]);
    }

    /**
     * Carriers the admin can tick. Combines the carrier accounts connected to
     * Shippo with the UK carriers Shippo supports, so the list is useful even
     * before a Shippo key is configured.
     */
    public function shippoCarriers(\App\Services\ShippoRateService $shippo): JsonResponse
    {
        $catalogue = [
            ['key' => 'royal_mail', 'name' => 'Royal Mail', 'match' => ['royal mail', 'royalmail'], 'logo' => 'images/Admin/couriers/royal-mail.svg'],
            ['key' => 'evri', 'name' => 'Evri', 'match' => ['evri', 'hermes'], 'logo' => 'images/Admin/couriers/evri.svg'],
            ['key' => 'dpd', 'name' => 'DPD', 'match' => ['dpd'], 'logo' => 'images/Admin/couriers/dpd.svg'],
            ['key' => 'parcelforce', 'name' => 'Parcelforce', 'match' => ['parcelforce', 'parcel force'], 'logo' => ''],
            ['key' => 'ups', 'name' => 'UPS', 'match' => ['ups'], 'logo' => ''],
            ['key' => 'dhl_express', 'name' => 'DHL Express', 'match' => ['dhl'], 'logo' => ''],
            ['key' => 'fedex', 'name' => 'FedEx', 'match' => ['fedex'], 'logo' => ''],
            ['key' => 'yodel', 'name' => 'Yodel', 'match' => ['yodel'], 'logo' => ''],
            ['key' => 'collect_plus', 'name' => 'Collect+', 'match' => ['collect+', 'collectplus'], 'logo' => ''],
            ['key' => 'dhl_parcel_uk', 'name' => 'DHL Parcel UK', 'match' => ['dhl parcel'], 'logo' => ''],
        ];

        $connected = [];
        $shippoError = null;
        try {
            $connected = $shippo->getCarrierAccounts();
        } catch (\Throwable $exception) {
            $shippoError = $exception->getMessage();
        }

        $byKey = [];
        foreach ($catalogue as $entry) {
            $entry['connected'] = false;
            $byKey[$entry['key']] = $entry;
        }
        foreach ($connected as $account) {
            $key = str_replace('-', '_', (string) preg_replace('/[^a-z0-9]+/', '_', $account['carrier']));
            $key = trim($key, '_');
            if ($key === '') {
                continue;
            }
            $matched = null;
            foreach ($byKey as $candidateKey => $candidate) {
                if ($candidateKey === $key || str_contains($key, $candidateKey) || str_contains($candidateKey, $key)) {
                    $matched = $candidateKey;
                    break;
                }
            }
            if ($matched) {
                $byKey[$matched]['connected'] = (bool) $account['active'];
                continue;
            }
            $byKey[$key] = [
                'key' => $key,
                'name' => $account['name'],
                'match' => [strtolower($account['name']), str_replace('_', ' ', $key)],
                'logo' => '',
                'connected' => (bool) $account['active'],
            ];
        }

        $carriers = array_values($byKey);
        usort($carriers, fn ($a, $b) => [$b['connected'], $a['name']] <=> [$a['connected'], $b['name']]);

        return response()->json([
            'carriers' => array_map(function (array $carrier) {
                $carrier['logo_url'] = $carrier['logo'] !== '' ? $this->settings->resolveAssetUrl($carrier['logo']) : null;
                return $carrier;
            }, $carriers),
            'shippo_connected' => trim((string) config('services.shippo.token')) !== '' && $shippoError === null,
            'shippo_error' => $shippoError,
        ]);
    }

    public function updateDelivery(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'carriers' => ['required', 'array', 'max:20'],
            'carriers.*.key' => ['nullable', 'string', 'max:40'],
            'carriers.*.name' => ['required', 'string', 'max:60'],
            'carriers.*.enabled' => ['required', 'boolean'],
            'carriers.*.match' => ['nullable', 'array', 'max:10'],
            'carriers.*.match.*' => ['nullable', 'string', 'max:40'],
            'carriers.*.logo' => ['nullable', 'string', 'max:255'],
            'carriers.*.notes' => ['nullable', 'string', 'max:240'],
            'methods' => ['required', 'array', 'min:1', 'max:20'],
            'methods.*.key' => ['nullable', 'string', 'max:24'],
            'methods.*.label' => ['required', 'string', 'max:80'],
            'methods.*.description' => ['nullable', 'string', 'max:160'],
            'methods.*.kind' => ['required', Rule::in(StoreSettingsService::DELIVERY_METHOD_KINDS)],
            'methods.*.enabled' => ['required', 'boolean'],
            'methods.*.price' => ['required', 'numeric', 'min:0', 'max:999'],
            'methods.*.price_mode' => ['nullable', Rule::in(StoreSettingsService::DELIVERY_PRICE_MODES)],
            'methods.*.carrier_key' => ['nullable', 'string', 'max:40'],
            'methods.*.service_name' => ['nullable', 'string', 'max:120'],
            'methods.*.eta_min_days' => ['nullable', 'integer', 'min:0', 'max:60'],
            'methods.*.eta_max_days' => ['nullable', 'integer', 'min:0', 'max:60'],
            'methods.*.cutoff_hour' => ['nullable', 'integer', 'min:0', 'max:23'],
            'methods.*.free_for_members' => ['nullable', 'boolean'],
            'methods.*.require_carrier_service' => ['nullable', 'boolean'],
            'parcel_options' => ['nullable', 'array', 'max:60'],
            'parcel_options.*.key' => ['nullable', 'string', 'max:60'],
            'parcel_options.*.carrier_key' => ['required', 'string', 'max:40'],
            'parcel_options.*.label' => ['required', 'string', 'max:60'],
            'parcel_options.*.max_weight_kg' => ['required', 'numeric', 'min:0.01', 'max:200'],
            'parcel_options.*.length_cm' => ['required', 'numeric', 'min:0.1', 'max:500'],
            'parcel_options.*.width_cm' => ['required', 'numeric', 'min:0.1', 'max:500'],
            'parcel_options.*.height_cm' => ['required', 'numeric', 'min:0.1', 'max:500'],
            'parcel_options.*.price_label' => ['nullable', 'string', 'max:40'],
            'parcel_options.*.description' => ['nullable', 'string', 'max:160'],
        ]);

        $delivery = $this->settings->saveDeliverySettings($validated);

        if (collect($delivery['methods'])->where('enabled', true)->isEmpty()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'methods' => 'Keep at least one delivery method enabled so customers can check out.',
            ]);
        }

        return response()->json([
            'success' => true,
            'delivery' => $delivery,
            'message' => 'Delivery settings saved.',
        ]);
    }

    public function updateFrontPage(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'featured_product_ids' => ['nullable', 'array'],
            'featured_product_ids.*' => ['integer', 'exists:products,id'],
            'premade_product_ids' => ['nullable', 'array'],
            'premade_product_ids.*' => ['integer', 'exists:products,id'],
            'premade_quotes' => ['nullable', 'array'],
            'premade_quotes.*' => ['nullable', 'string', 'max:220'],
        ]);

        $frontPage = $this->settings->saveFrontPageProducts(array_merge(
            $this->settings->getFrontPageProducts(),
            $validated
        ));

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'front_page' => $frontPage,
                'message' => 'Front page product selections updated.',
            ]);
        }

        return back()->with('success', 'Front page product selections updated.');
    }

    public function notifications(): Response
    {
        return Inertia::render('Admin/Other/Notifications', [
            'notificationSettings' => $this->settings->getAdminNotificationSettings(),
            'notificationCatalog' => $this->settings->getAdminNotificationCatalog(),
        ]);
    }

    public function updateNotifications(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'events' => ['required', 'array'],
        ]);

        $settings = $this->settings->saveAdminNotificationSettings($request->all());

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'notification_settings' => $settings,
                'message' => 'Admin notification settings updated.',
            ]);
        }

        return back()->with('success', 'Admin notification settings updated.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function websiteDesign(): Response
    {
        return Inertia::render('Admin/Other/WebsiteDesign', [
            'design' => $this->settings->getWebsiteDesign(),
            'defaults' => $this->settings->defaultWebsiteDesign(),
            'maxHeroSlides' => StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES,
        ]);
    }

    public function updateWebsiteDesign(Request $request): JsonResponse|RedirectResponse
    {
        $hexRule = ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'];
        $imageRule = ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/svg+xml', 'max:8192'];
        $maxSlides = StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES;

        $validated = $request->validate([
            'colors' => ['required', 'array'],
            'colors.accent' => $hexRule,
            'colors.text' => $hexRule,
            'colors.surface' => $hexRule,
            'fonts' => ['required', 'array'],
            'fonts.heading' => ['required', 'string', Rule::in(StoreSettingsService::WEBSITE_DESIGN_FONTS)],
            'fonts.body' => ['required', 'string', Rule::in(StoreSettingsService::WEBSITE_DESIGN_FONTS)],
            'nav_logo' => $imageRule,
            'nav_logo_reset' => ['nullable', 'boolean'],
            'footer_logo' => $imageRule,
            'footer_logo_reset' => ['nullable', 'boolean'],
            'hero_order' => ['nullable', 'string', 'max:4000'],
            'hero_uploads' => ['nullable', 'array', "max:{$maxSlides}"],
            'hero_uploads.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:10240'],
        ]);

        $existing = $this->settings->getWebsiteDesign();
        $existingImages = (array) ($existing['images'] ?? []);

        $navLogoPath = $this->resolveDesignLogoPath($request, 'nav_logo', (string) ($existingImages['nav_logo_path'] ?? ''));
        $footerLogoPath = $this->resolveDesignLogoPath($request, 'footer_logo', (string) ($existingImages['footer_logo_path'] ?? ''));

        $existingHeroPaths = collect((array) ($existingImages['hero_slide_paths'] ?? []))
            ->map(fn ($path) => (string) $path)
            ->values();

        $heroPaths = $existingHeroPaths->all();
        if ($request->filled('hero_order')) {
            $order = json_decode((string) $request->input('hero_order'), true);
            if (!is_array($order)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'hero_order' => 'The hero slide order is invalid.',
                ]);
            }

            $heroPaths = [];
            foreach (array_slice($order, 0, $maxSlides) as $entry) {
                $entry = (string) $entry;
                if (Str::startsWith($entry, 'upload:')) {
                    $index = (int) Str::after($entry, 'upload:');
                    $file = $request->file("hero_uploads.{$index}");
                    if ($file) {
                        $heroPaths[] = $file->store('settings/design', 'public');
                    }
                    continue;
                }

                if ($existingHeroPaths->contains($entry)) {
                    $heroPaths[] = $entry;
                }
            }
            $heroPaths = array_values(array_unique($heroPaths));

            foreach ($existingHeroPaths as $oldPath) {
                if (!in_array($oldPath, $heroPaths, true)) {
                    $this->deleteStoredAssetIfNeeded($oldPath, '');
                }
            }
        }

        $design = $this->settings->saveWebsiteDesign([
            'colors' => $validated['colors'],
            'fonts' => $validated['fonts'],
            'images' => [
                'nav_logo_path' => $navLogoPath,
                'footer_logo_path' => $footerLogoPath,
                'hero_slide_paths' => $heroPaths,
            ],
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'design' => $design,
                'message' => 'Website design saved. The live site has been updated.',
            ]);
        }

        return back()->with('success', 'Website design saved.');
    }

    private function resolveDesignLogoPath(Request $request, string $field, string $currentPath): string
    {
        if ($request->hasFile($field)) {
            $newPath = $request->file($field)->store('settings/design', 'public');
            $this->deleteStoredAssetIfNeeded($currentPath, $newPath);

            return $newPath;
        }

        if ($request->boolean("{$field}_reset")) {
            $this->deleteStoredAssetIfNeeded($currentPath, '');

            return '';
        }

        return $currentPath;
    }

    private function discountCodesPayload(): array
    {
        return Coupon::query()
            ->whereIn('type', ['percent', 'fixed'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Coupon $coupon) => $this->mapCoupon($coupon))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapCoupon(Coupon $coupon): array
    {
        $type = in_array($coupon->type, ['percent', 'fixed'], true) ? $coupon->type : 'fixed';

        return [
            'id' => $coupon->id,
            'code' => strtoupper((string) $coupon->code),
            'discount_type' => $type,
            'discount_value' => $type === 'percent'
                ? (float) $coupon->value
                : round(((int) $coupon->value) / 100, 2),
            'expiry_date' => $coupon->expires_at ? $coupon->expires_at->format('Y-m-d') : null,
            'usage_limit' => $coupon->usage_limit,
            'times_used' => (int) ($coupon->times_used ?? 0),
            'minimum_order_value' => round(((int) ($coupon->min_spend ?? 0)) / 100, 2),
            'active' => (bool) $coupon->active,
            'created_at' => optional($coupon->created_at)?->toIso8601String(),
            'updated_at' => optional($coupon->updated_at)?->toIso8601String(),
        ];
    }

    private function deleteStoredAssetIfNeeded(string $oldPath, string $newPath): void
    {
        $old = trim($oldPath);
        if ($old === '' || $old === $newPath) {
            return;
        }

        if (Str::startsWith($old, ['http://', 'https://', '/'])) {
            return;
        }

        if (Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }
    }
}
