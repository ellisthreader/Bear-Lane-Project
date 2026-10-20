<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\HomepageEditorService;
use App\Services\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Backs the on-page "Edit page" mode on the storefront homepage. The page itself is rendered
 * by the normal public route; this controller only loads what an editor needs, accepts uploads
 * and saves the owner's changes in one request.
 */
class HomepageEditorController extends Controller
{
    private const PRUNE_AFTER_SECONDS = 86400;

    public function __construct(
        private readonly StoreSettingsService $settings,
        private readonly HomepageEditorService $editor,
    ) {
    }

    /** Everything the editor needs that public pages do not carry (stored paths, link choices). */
    public function state(): JsonResponse
    {
        return response()->json([
            'content' => $this->settings->getHomepageContent(),
            'design' => $this->settings->getWebsiteDesign(),
            'categories' => $this->settings->getHomepageCategories()['items'],
            'category_links' => $this->editor->categoryLinkOptions(),
            'max_categories' => StoreSettingsService::HOMEPAGE_CATEGORY_MAX,
            'max_hero_slides' => StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES,
        ]);
    }

    /** Product choices for the featured / pre-made pickers, loaded only when a picker opens. */
    public function products(): JsonResponse
    {
        return response()->json([
            'products' => $this->editor->productLibrary(),
            'front_page' => $this->settings->getFrontPageProducts(),
        ]);
    }

    /** Stores one image immediately so the editor can show it; it only goes live on save. */
    public function upload(Request $request): JsonResponse
    {
        $isLogo = $request->input('kind') === 'logo';
        $mimes = 'image/jpeg,image/png,image/webp,image/avif,image/gif' . ($isLogo ? ',image/svg+xml' : '');

        $request->validate([
            'image' => ['required', 'file', 'mimetypes:' . $mimes, 'max:8192'],
            'kind' => ['nullable', Rule::in(['image', 'logo'])],
        ]);

        $path = $request->file('image')->store(StoreSettingsService::HOMEPAGE_CONTENT_UPLOAD_DIR, 'public');

        return response()->json([
            'path' => $path,
            'url' => $this->settings->resolveAssetUrl($path),
        ]);
    }

    /**
     * Saves any combination of: `content` (text, links, images, colours, lists, section order),
     * `design` (theme colours, fonts, logos, hero slides) and `categories` (the circles).
     * Omitted parts are left untouched. Images are referenced by the paths /upload returned.
     */
    public function save(Request $request): JsonResponse
    {
        $hex = ['required_with:design', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'];

        $validated = $request->validate([
            'content' => ['nullable', 'array'],
            'design' => ['nullable', 'array'],
            'design.colors' => ['required_with:design', 'array'],
            'design.colors.accent' => $hex,
            'design.colors.text' => $hex,
            'design.colors.surface' => $hex,
            'design.fonts' => ['required_with:design', 'array'],
            'design.fonts.heading' => ['required_with:design', 'string', Rule::in(StoreSettingsService::WEBSITE_DESIGN_FONTS)],
            'design.fonts.body' => ['required_with:design', 'string', Rule::in(StoreSettingsService::WEBSITE_DESIGN_FONTS)],
            'design.nav_logo_path' => ['nullable', 'string', 'max:255'],
            'design.footer_logo_path' => ['nullable', 'string', 'max:255'],
            'design.hero_slide_paths' => ['nullable', 'array', 'max:' . StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES],
            'design.hero_slide_paths.*' => ['string', 'max:255'],
            'categories' => ['nullable', 'array', 'min:1', 'max:' . StoreSettingsService::HOMEPAGE_CATEGORY_MAX],
            'categories.*.id' => ['nullable', 'string', 'max:60'],
            'categories.*.name' => ['required', 'string', 'max:60'],
            'categories.*.href' => ['nullable', 'string', 'max:255'],
            'categories.*.image_path' => ['nullable', 'string', 'max:255'],
        ]);

        $before = $this->settings->referencedImagePaths();

        DB::transaction(function () use ($validated) {
            if (array_key_exists('content', $validated) && $validated['content'] !== null) {
                $this->settings->saveHomepageContent($validated['content']);
            }

            if (!empty($validated['design'])) {
                $this->saveDesign($validated['design']);
            }

            if (!empty($validated['categories'])) {
                $this->saveCategories($validated['categories']);
            }
        });

        $after = $this->settings->referencedImagePaths();
        $this->removeUnusedFiles($before, $after);

        return response()->json([
            'success' => true,
            'message' => 'Homepage saved. Your changes are live.',
            'content' => $this->settings->getHomepageContent(),
            'design' => $this->settings->getWebsiteDesign(),
            'public_design' => $this->settings->getPublicWebsiteDesign(),
            'categories' => $this->settings->getHomepageCategories()['items'],
        ]);
    }

    /** @param array<string, mixed> $design */
    private function saveDesign(array $design): void
    {
        $existing = $this->settings->getWebsiteDesign();
        $existingPaths = $this->settings->referencedImagePaths();

        $logo = fn (string $field) => $this->acceptedPath(
            (string) ($design[$field] ?? ''),
            $existingPaths,
            "design.{$field}"
        );

        $slides = collect((array) ($design['hero_slide_paths'] ?? []))
            ->map(fn ($path) => $this->acceptedPath((string) $path, $existingPaths, 'design.hero_slide_paths'))
            ->filter()
            ->values()
            ->all();

        $this->settings->saveWebsiteDesign([
            'colors' => $design['colors'],
            'fonts' => $design['fonts'],
            'images' => [
                'nav_logo_path' => array_key_exists('nav_logo_path', $design) ? $logo('nav_logo_path') : data_get($existing, 'images.nav_logo_path', ''),
                'footer_logo_path' => array_key_exists('footer_logo_path', $design) ? $logo('footer_logo_path') : data_get($existing, 'images.footer_logo_path', ''),
                'hero_slide_paths' => array_key_exists('hero_slide_paths', $design) ? $slides : data_get($existing, 'images.hero_slide_paths', []),
            ],
        ]);
    }

    /** @param array<int, array<string, mixed>> $categories */
    private function saveCategories(array $categories): void
    {
        $existingPaths = $this->settings->referencedImagePaths();

        $items = array_map(fn (array $category) => [
            'id' => (string) ($category['id'] ?? ''),
            'name' => (string) $category['name'],
            'href' => $this->safeHref((string) ($category['href'] ?? '')),
            'image_path' => $this->acceptedPath((string) ($category['image_path'] ?? ''), $existingPaths, 'categories'),
        ], $categories);

        $this->settings->saveHomepageCategories($items);
    }

    /**
     * An image path is accepted when it is already in use (so an old, since-moved file never
     * blocks an unrelated save) or passes the allow-list. Empty means "use the built-in image".
     *
     * @param array<int, string> $inUse
     */
    private function acceptedPath(string $path, array $inUse, string $field): string
    {
        $relative = ltrim(trim($path), '/');
        if ($relative === '') {
            return '';
        }

        if (in_array($relative, $inUse, true) || $this->settings->isAllowedImagePath($relative)) {
            return $relative;
        }

        throw ValidationException::withMessages([$field => 'One of the images is no longer available. Please upload it again.']);
    }

    private function safeHref(string $href): string
    {
        $href = trim($href);

        return preg_match('#^(/(?!/)|https?://)[^\s\x00-\x1F]*$#i', $href) === 1 ? $href : '';
    }

    /**
     * Deletes uploaded files this save stopped using, plus stale editor uploads that were never
     * used (an image picked and then discarded). Bundled images in public/ are never touched.
     *
     * @param array<int, string> $before
     * @param array<int, string> $after
     */
    private function removeUnusedFiles(array $before, array $after): void
    {
        $disk = Storage::disk('public');

        foreach (array_diff($before, $after) as $path) {
            if (str_starts_with($path, 'settings/') && $disk->exists($path)) {
                $disk->delete($path);
            }
        }

        $cutoff = time() - self::PRUNE_AFTER_SECONDS;
        foreach ($disk->files(StoreSettingsService::HOMEPAGE_CONTENT_UPLOAD_DIR) as $file) {
            if (!in_array($file, $after, true) && $disk->lastModified($file) < $cutoff) {
                $disk->delete($file);
            }
        }
    }
}
