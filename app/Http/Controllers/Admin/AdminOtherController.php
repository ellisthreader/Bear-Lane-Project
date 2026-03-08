<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Product;
use App\Services\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminOtherController extends Controller
{
    public function __construct(private readonly StoreSettingsService $settings)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Other/OtherIndex', [
            'sections' => [
                [
                    'title' => 'Prices',
                    'description' => 'Configure printing and embroidery pricing rules.',
                    'href' => '/admin/other/prices',
                ],
                [
                    'title' => 'Discount Codes',
                    'description' => 'Create, update, and deactivate checkout discount codes.',
                    'href' => '/admin/other/discount-codes',
                ],
                [
                    'title' => 'Site Settings',
                    'description' => 'Edit brand-level site details, assets, and maintenance mode.',
                    'href' => '/admin/other/site-settings',
                ],
                [
                    'title' => 'Tax Settings',
                    'description' => 'Set VAT/tax behaviour for checkout across the store.',
                    'href' => '/admin/other/tax-settings',
                ],
                [
                    'title' => 'Size Guide',
                    'description' => 'Maintain men, women, and kids measurement tables.',
                    'href' => '/admin/other/size-guide',
                ],
                [
                    'title' => 'Front Page',
                    'description' => 'Control featured products and pre-made design cards on the homepage.',
                    'href' => '/admin/other/front-page',
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
            'embroidery.text_price' => ['required', 'numeric', 'min:0'],
            'embroidery.clipart_price' => ['required', 'numeric', 'min:0'],
            'embroidery.image_price' => ['required', 'numeric', 'min:0'],
            'embroidery.per_side_price' => ['required', 'numeric', 'min:0'],
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
        return Inertia::render('Admin/Other/SizeGuide', [
            'sizeGuide' => $this->settings->getSizeGuide(),
        ]);
    }

    public function updateSizeGuide(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'men.heading' => ['required', 'string', 'max:160'],
            'men.subtitle' => ['nullable', 'string', 'max:400'],
            'men.rows' => ['required', 'array'],
            'men.rows.*.size' => ['nullable', 'string', 'max:60'],
            'men.rows.*.chest' => ['nullable', 'string', 'max:60'],
            'men.rows.*.length' => ['nullable', 'string', 'max:60'],
            'men.rows.*.sleeve' => ['nullable', 'string', 'max:60'],
            'women.heading' => ['required', 'string', 'max:160'],
            'women.subtitle' => ['nullable', 'string', 'max:400'],
            'women.rows' => ['required', 'array'],
            'women.rows.*.size' => ['nullable', 'string', 'max:60'],
            'women.rows.*.chest' => ['nullable', 'string', 'max:60'],
            'women.rows.*.length' => ['nullable', 'string', 'max:60'],
            'women.rows.*.sleeve' => ['nullable', 'string', 'max:60'],
            'kids.heading' => ['required', 'string', 'max:160'],
            'kids.subtitle' => ['nullable', 'string', 'max:400'],
            'kids.rows' => ['required', 'array'],
            'kids.rows.*.size' => ['nullable', 'string', 'max:60'],
            'kids.rows.*.chest' => ['nullable', 'string', 'max:60'],
            'kids.rows.*.length' => ['nullable', 'string', 'max:60'],
            'kids.rows.*.sleeve' => ['nullable', 'string', 'max:60'],
        ]);

        $sizeGuide = $this->settings->saveSizeGuide($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'size_guide' => $sizeGuide,
                'message' => 'Size guide updated.',
            ]);
        }

        return back()->with('success', 'Size guide updated.');
    }

    public function frontPage(): Response
    {
        $products = Product::query()
            ->with('images')
            ->orderBy('name')
            ->limit(600)
            ->get()
            ->map(function (Product $product) {
                $firstImage = $product->images->first();

                return [
                    'id' => $product->id,
                    'name' => (string) $product->name,
                    'slug' => (string) $product->slug,
                    'brand' => (string) ($product->brand ?? ''),
                    'price' => (float) ($product->price ?? 0),
                    'image_url' => (string) ($firstImage?->url ?? '/images/no-image.png'),
                    'is_premade_design' => (bool) ($product->is_premade_design ?? false),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Other/FrontPage', [
            'frontPage' => $this->settings->getFrontPageProducts(),
            'products' => $products,
        ]);
    }

    public function updateFrontPage(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'featured_product_ids' => ['required', 'array'],
            'featured_product_ids.*' => ['integer', 'exists:products,id'],
            'premade_product_ids' => ['required', 'array'],
            'premade_product_ids.*' => ['integer', 'exists:products,id'],
            'premade_quotes' => ['nullable', 'array'],
            'premade_quotes.*' => ['nullable', 'string', 'max:220'],
        ]);

        $frontPage = $this->settings->saveFrontPageProducts($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'front_page' => $frontPage,
                'message' => 'Front page product selections updated.',
            ]);
        }

        return back()->with('success', 'Front page product selections updated.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
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
