<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\AdminActivityLogService;
use App\Services\OpenAiModerationService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function __construct(private readonly AdminActivityLogService $activityLogService)
    {
    }

    public function index()
    {
        $this->normalizeCategorySlugs();

        $categories = Category::query()
            ->with(['products:id,name,slug,price,brand'])
            ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('name')
            ->get();

        $products = Product::query()
            ->with(['images' => fn ($query) => $query->orderBy('id')])
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'brand' => $product->brand,
                'price' => $product->price,
                'image' => optional($product->images->first())->url,
            ])
            ->values();

        return inertia('Admin/Products', [
            'categories' => $categories,
            'products' => $products,
        ]);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $parent = !empty($validated['parent_id'])
            ? Category::query()->find($validated['parent_id'])
            : null;

        $leaf = Str::slug((string) $validated['name']);
        $baseSlug = $parent ? $this->rootSlugFromPath($parent->slug) . "/{$leaf}" : $leaf;
        $slug = $this->uniqueSlug($baseSlug);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'parent_id' => $parent?->id,
            'section' => $parent?->section ?: $validated['name'],
            'subsection' => $parent?->name,
        ]);

        $this->activityLogService->logFromRequest(
            $request,
            'category_created',
            'Category created',
            "Created category '{$category->name}'",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($category, $category->name),
                'metadata' => [
                    'category_name' => $category->name,
                    'category_slug' => $category->slug,
                    'parent_category' => $parent?->name,
                ],
            ]
        );

        return response()->json(['success' => true]);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $parent = $category->parent_id
            ? Category::query()->find($category->parent_id)
            : null;

        $leaf = Str::slug((string) $validated['name']);
        $baseSlug = $parent ? $this->rootSlugFromPath($parent->slug) . "/{$leaf}" : $leaf;
        $slug = $this->uniqueSlug($baseSlug, $category->id);

        $before = $category->only(['name', 'slug', 'parent_id']);

        $category->update([
            'name' => $validated['name'],
            'slug' => $slug,
        ]);

        $this->refreshDescendantSlugs($category->fresh());

        $category->refresh();
        $changes = $this->activityLogService->extractChanges($before, $category->only(['name', 'slug', 'parent_id']));

        $this->activityLogService->logFromRequest(
            $request,
            'category_updated',
            'Category edited',
            "Updated category '{$category->name}'. " . $this->activityLogService->summarizeChanges($changes),
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($category, $category->name),
                'metadata' => [
                    'changes' => $changes,
                ],
            ]
        );

        return response()->json(['success' => true]);
    }

    public function deleteCategory(Request $request, Category $category)
    {
        $label = $category->name ?: "Category #{$category->id}";
        $context = $this->activityLogService->modelContext($category, $label);
        $category->delete();

        $this->activityLogService->logFromRequest(
            $request,
            'category_deleted',
            'Category deleted',
            "Deleted category '{$label}'",
            [
                'icon' => 'package',
                ...$context,
            ]
        );

        return response()->json(['success' => true]);
    }

    public function attachProduct(Request $request, Category $category)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $category->products()->syncWithoutDetaching([(int) $validated['product_id']]);

        $product = Product::query()->find((int) $validated['product_id']);
        $this->activityLogService->logFromRequest(
            $request,
            'category_product_attached',
            'Product linked to category',
            "Linked product '" . ($product?->name ?: "Product #{$validated['product_id']}") . "' to category '{$category->name}'",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($category, $category->name),
                'metadata' => [
                    'product_id' => (int) $validated['product_id'],
                    'product_name' => $product?->name,
                    'category_id' => $category->id,
                    'category_name' => $category->name,
                ],
            ]
        );

        return response()->json(['success' => true]);
    }

    public function detachProduct(Request $request, Category $category, Product $product)
    {
        $category->products()->detach($product->id);

        $this->activityLogService->logFromRequest(
            $request,
            'category_product_detached',
            'Product removed from category',
            "Removed product '{$product->name}' from category '{$category->name}'",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($category, $category->name),
                'metadata' => [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'category_id' => $category->id,
                    'category_name' => $category->name,
                ],
            ]
        );

        return response()->json(['success' => true]);
    }

    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $baseSlug = Str::slug((string) $validated['name']);
        $slug = $this->uniqueProductSlug($baseSlug);

        $product = Product::create([
            'name' => $validated['name'],
            'brand' => $validated['brand'] ?? 'Brand',
            'slug' => $slug,
            'price' => (float) $validated['price'],
            'original_price' => null,
            'description' => null,
            'is_trending' => false,
            'is_sale' => false,
            'category_id' => null,
        ]);

        if (!empty($validated['category_id'])) {
            $product->categories()->syncWithoutDetaching([(int) $validated['category_id']]);
        }

        $this->activityLogService->logFromRequest(
            $request,
            'product_created',
            'Product created',
            "Created product '{$product->name}'",
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($product, $product->name),
                'metadata' => [
                    'product_name' => $product->name,
                    'price' => (float) $product->price,
                    'category_id' => !empty($validated['category_id']) ? (int) $validated['category_id'] : null,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'brand' => $product->brand,
                'slug' => $product->slug,
                'price' => $product->price,
            ],
        ]);
    }

    public function updateProduct(Request $request, Product $product)
    {
        $before = $product->only([
            'name',
            'brand',
            'price',
            'original_price',
            'description',
            'category_id',
            'length',
            'width',
            'height',
            'dimension_unit',
            'is_sale',
            'slug',
        ]);

        $isFullLayoutUpdate = $request->has('colours');
        if ($isFullLayoutUpdate) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'brand' => 'required|string|max:255',
                'price' => 'required|numeric|min:0.01',
                'description' => 'required|string',
                'category_id' => 'required|exists:categories,id',
                'dimensions' => 'required|array',
                'dimensions.length' => 'required|numeric|min:0.01',
                'dimensions.width' => 'required|numeric|min:0.01',
                'dimensions.height' => 'required|numeric|min:0.01',
                'dimensions.unit' => 'required|in:cm,in',
                'colours' => 'required|array|min:1',
                'colours.*.name' => 'required|string|max:100',
                'colours.*.images' => 'required|array|min:1',
                'colours.*.images.*' => 'required|string|max:2048',
                'colours.*.image_boxes' => 'required|array',
                'colours.*.variants' => 'required|array|min:1',
                'colours.*.variants.*.size' => 'required|string|max:20',
                'colours.*.variants.*.stock' => 'required|integer|min:0',
                'colours.*.variants.*.weight' => 'required|numeric|min:0.01',
            ]);
        } else {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'brand' => 'nullable|string|max:255',
                'price' => 'required|numeric|min:0',
            ]);
        }

        $baseSlug = Str::slug((string) $validated['name']);
        $slug = $this->uniqueProductSlug($baseSlug, $product->id);
        $nextPrice = (float) $validated['price'];
        $currentPrice = (float) ($product->price ?? 0);
        $currentOriginalPrice = $product->original_price !== null ? (float) $product->original_price : null;
        $baselinePrice = $currentOriginalPrice !== null && $currentOriginalPrice > 0 ? $currentOriginalPrice : $currentPrice;
        $isSale = $baselinePrice > 0 && $nextPrice < $baselinePrice;

        if (!$isFullLayoutUpdate) {
            $product->update([
                'name' => $validated['name'],
                'brand' => $validated['brand'] ?? $product->brand,
                'price' => $nextPrice,
                'original_price' => $isSale ? $baselinePrice : null,
                'is_sale' => $isSale,
                'slug' => $slug,
            ]);

            $product->refresh();
            $changes = $this->activityLogService->extractChanges(
                $before,
                $product->only(['name', 'brand', 'price', 'original_price', 'is_sale', 'slug']),
                [
                    'name' => 'Name',
                    'brand' => 'Brand',
                    'price' => 'Price',
                    'original_price' => 'Original price',
                    'is_sale' => 'On sale',
                    'slug' => 'Slug',
                ]
            );

            $this->activityLogService->logFromRequest(
                $request,
                'product_edited',
                'Product edited',
                "Updated product '{$product->name}'. " . $this->activityLogService->summarizeChanges($changes),
                [
                    'icon' => 'package',
                    ...$this->activityLogService->modelContext($product, $product->name),
                    'metadata' => [
                        'changes' => $changes,
                    ],
                ]
            );

            return response()->json([
                'success' => true,
                'slug' => (string) $product->slug,
                'name' => (string) $product->name,
            ]);
        }

        $colourNames = collect($validated['colours'])
            ->map(fn (array $colour) => mb_strtolower(trim((string) $colour['name'])))
            ->filter()
            ->values();
        if ($colourNames->count() !== $colourNames->unique()->count()) {
            throw ValidationException::withMessages([
                'colours' => 'Colour names must be unique.',
            ]);
        }

        foreach ($validated['colours'] as $colourIndex => $colour) {
            $sizeSeen = [];
            foreach ($colour['variants'] as $variantIndex => $variant) {
                $size = mb_strtoupper(trim((string) $variant['size']));
                if (in_array($size, $sizeSeen, true)) {
                    throw ValidationException::withMessages([
                        "colours.{$colourIndex}.variants.{$variantIndex}.size" => "Duplicate size '{$size}' in colour '{$colour['name']}'.",
                    ]);
                }
                $sizeSeen[] = $size;
            }
        }

        DB::transaction(function () use ($validated, $product, $slug, $nextPrice, $baselinePrice, $isSale) {
            $product->update([
                'name' => trim((string) $validated['name']),
                'brand' => trim((string) $validated['brand']),
                'slug' => $slug,
                'price' => $nextPrice,
                'original_price' => $isSale ? $baselinePrice : null,
                'is_sale' => $isSale,
                'description' => trim((string) $validated['description']),
                'category_id' => (int) $validated['category_id'],
                'length' => (float) $validated['dimensions']['length'],
                'width' => (float) $validated['dimensions']['width'],
                'height' => (float) $validated['dimensions']['height'],
                'dimension_unit' => (string) $validated['dimensions']['unit'],
            ]);

            $product->categories()->sync([(int) $validated['category_id']]);

            foreach ($product->variants()->with('images')->get() as $variant) {
                $variant->images()->delete();
            }
            $product->variants()->delete();
            $product->images()->delete();

            $allImagePaths = [];
            $productImageBoxByPath = [];
            foreach ($validated['colours'] as $colourIndex => $colour) {
                $colourName = trim((string) $colour['name']);
                $imagePaths = collect($colour['images'])
                    ->map(fn ($value) => trim((string) $value))
                    ->filter()
                    ->values()
                    ->all();
                $imageBoxes = is_array($colour['image_boxes'] ?? null)
                    ? $colour['image_boxes']
                    : [];

                if (count($imagePaths) === 0) {
                    throw ValidationException::withMessages([
                        'colours' => "Colour '{$colourName}' must have at least one picture.",
                    ]);
                }

                $restrictedBoxesByImagePath = [];
                foreach ($imagePaths as $imageIndex => $path) {
                    $boxPayload = $imageBoxes[$path] ?? null;
                    if (!$this->isValidRestrictedBoxPayload($boxPayload)) {
                        throw ValidationException::withMessages([
                            "colours.{$colourIndex}.image_boxes.{$imageIndex}" => "Colour '{$colourName}' image " . ($imageIndex + 1) . " is missing a valid restricted box.",
                        ]);
                    }
                    $normalizedBox = $this->normalizeRestrictedBoxPayload($boxPayload);
                    $restrictedBoxesByImagePath[$path] = $normalizedBox;
                    if (!isset($productImageBoxByPath[$path])) {
                        $productImageBoxByPath[$path] = $normalizedBox;
                    }
                }

                $allImagePaths = [...$allImagePaths, ...$imagePaths];

                foreach ($colour['variants'] as $variantData) {
                    $size = mb_strtoupper(trim((string) $variantData['size']));
                    $sku = $this->uniqueVariantSku($product, $colourName, $size);

                    $variant = $product->variants()->create([
                        'sku' => $sku,
                        'colour' => $colourName,
                        'size' => $size,
                        'price' => null,
                        'original_price' => null,
                        'stock' => (int) $variantData['stock'],
                        'weight' => (float) $variantData['weight'],
                    ]);

                    foreach ($imagePaths as $path) {
                        $box = $restrictedBoxesByImagePath[$path];
                        $variant->images()->create([
                            'path' => $path,
                            'restricted_left' => $box['left'],
                            'restricted_top' => $box['top'],
                            'restricted_width' => $box['width'],
                            'restricted_height' => $box['height'],
                        ]);
                    }
                }
            }

            $uniqueImagePaths = collect($allImagePaths)
                ->map(fn ($path) => trim((string) $path))
                ->filter()
                ->unique()
                ->values();

            foreach ($uniqueImagePaths as $path) {
                $box = $productImageBoxByPath[$path] ?? null;
                $product->images()->create([
                    'path' => $path,
                    'restricted_left' => $box['left'] ?? null,
                    'restricted_top' => $box['top'] ?? null,
                    'restricted_width' => $box['width'] ?? null,
                    'restricted_height' => $box['height'] ?? null,
                ]);
            }
        });

        $product->refresh();
        $changes = $this->activityLogService->extractChanges(
            $before,
            $product->only([
                'name',
                'brand',
                'price',
                'original_price',
                'description',
                'category_id',
                'length',
                'width',
                'height',
                'dimension_unit',
                'is_sale',
                'slug',
            ]),
            [
                'name' => 'Name',
                'brand' => 'Brand',
                'price' => 'Price',
                'original_price' => 'Original price',
                'description' => 'Description',
                'category_id' => 'Category',
                'length' => 'Length',
                'width' => 'Width',
                'height' => 'Height',
                'dimension_unit' => 'Dimension unit',
                'is_sale' => 'On sale',
                'slug' => 'Slug',
            ]
        );

        $this->activityLogService->logFromRequest(
            $request,
            'product_edited',
            'Product edited',
            "Updated product '{$product->name}' (full layout update). " . $this->activityLogService->summarizeChanges($changes),
            [
                'icon' => 'package',
                ...$this->activityLogService->modelContext($product, $product->name),
                'metadata' => [
                    'changes' => $changes,
                    'colours_count' => count($validated['colours'] ?? []),
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'slug' => (string) $product->slug,
            'name' => (string) $product->name,
        ]);
    }

    public function createLayout(Request $request)
    {
        $categoryId = (int) $request->integer('category_id');
        $categorySlug = trim((string) $request->input('category_slug', ''));

        $category = null;
        if ($categoryId > 0) {
            $category = Category::query()->find($categoryId);
        }
        if (!$category && $categorySlug !== '') {
            $category = Category::query()->where('slug', $categorySlug)->first();
        }

        if (!$category) {
            abort(404, 'Category not found.');
        }

        $trail = $this->buildCategoryTrail($category);
        $breadcrumbs = collect($trail)
            ->map(fn (Category $item) => [
                'label' => (string) $item->name,
                'href' => '/category/' . ltrim((string) $item->slug, '/'),
            ])
            ->values()
            ->all();

        return inertia('Product/ProductLayout', [
            'product' => [
                'id' => 'draft',
                'brand' => '',
                'name' => 'New Product',
                'slug' => 'draft-product',
                'price' => 0,
                'original_price' => null,
                'description' => '',
                'images' => [],
                'image_boxes' => [],
                'sizes' => [],
                'colourProducts' => [
                    [
                        'colour' => 'Primary',
                        'slug' => 'draft-primary',
                        'sizes' => [],
                        'size_stock' => [],
                        'images' => [],
                        'image_boxes' => [],
                    ],
                ],
                'breadcrumbs' => $breadcrumbs,
                'length' => null,
                'width' => null,
                'height' => null,
                'dimension_unit' => 'cm',
            ],
            'recommendedProducts' => [],
            'adminEditor' => [
                'enabled' => true,
                'categoryId' => (int) $category->id,
                'categorySlug' => (string) $category->slug,
                'categoryName' => (string) $category->name,
            ],
        ]);
    }

    public function storeProductFromLayout(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'brand' => 'required|string|max:255',
            'price' => 'required|numeric|min:0.01',
            'description' => 'required|string',
            'category_id' => 'required|exists:categories,id',
            'dimensions' => 'required|array',
            'dimensions.length' => 'required|numeric|min:0.01',
            'dimensions.width' => 'required|numeric|min:0.01',
            'dimensions.height' => 'required|numeric|min:0.01',
            'dimensions.unit' => 'required|in:cm,in',
            'colours' => 'required|array|min:1',
            'colours.*.name' => 'required|string|max:100',
            'colours.*.images' => 'required|array|min:1',
            'colours.*.images.*' => 'required|string|max:2048',
            'colours.*.image_boxes' => 'required|array',
            'colours.*.variants' => 'required|array|min:1',
            'colours.*.variants.*.size' => 'required|string|max:20',
            'colours.*.variants.*.stock' => 'required|integer|min:0',
            'colours.*.variants.*.weight' => 'required|numeric|min:0.01',
        ]);

        $colourNames = collect($validated['colours'])
            ->map(fn (array $colour) => mb_strtolower(trim((string) $colour['name'])))
            ->filter()
            ->values();
        if ($colourNames->count() !== $colourNames->unique()->count()) {
            throw ValidationException::withMessages([
                'colours' => 'Colour names must be unique.',
            ]);
        }

        foreach ($validated['colours'] as $colourIndex => $colour) {
            $sizeSeen = [];
            foreach ($colour['variants'] as $variantIndex => $variant) {
                $size = mb_strtoupper(trim((string) $variant['size']));
                if (in_array($size, $sizeSeen, true)) {
                    throw ValidationException::withMessages([
                        "colours.{$colourIndex}.variants.{$variantIndex}.size" => "Duplicate size '{$size}' in colour '{$colour['name']}'.",
                    ]);
                }
                $sizeSeen[] = $size;
            }
        }

        $baseSlug = Str::slug((string) $validated['name']);
        $slug = $this->uniqueProductSlug($baseSlug);

        $product = null;

        DB::transaction(function () use ($validated, $slug, &$product) {
            $product = Product::query()->create([
                'name' => trim((string) $validated['name']),
                'brand' => trim((string) $validated['brand']),
                'slug' => $slug,
                'price' => (float) $validated['price'],
                'original_price' => null,
                'description' => trim((string) $validated['description']),
                'is_trending' => false,
                'is_sale' => false,
                'category_id' => (int) $validated['category_id'],
                'length' => (float) $validated['dimensions']['length'],
                'width' => (float) $validated['dimensions']['width'],
                'height' => (float) $validated['dimensions']['height'],
                'dimension_unit' => (string) $validated['dimensions']['unit'],
            ]);

            $product->categories()->syncWithoutDetaching([(int) $validated['category_id']]);

            $allImagePaths = [];
            $productImageBoxByPath = [];
            foreach ($validated['colours'] as $colourIndex => $colour) {
                $colourName = trim((string) $colour['name']);
                $imagePaths = collect($colour['images'])
                    ->map(fn ($value) => trim((string) $value))
                    ->filter()
                    ->values()
                    ->all();
                $imageBoxes = is_array($colour['image_boxes'] ?? null)
                    ? $colour['image_boxes']
                    : [];

                if (count($imagePaths) === 0) {
                    throw ValidationException::withMessages([
                        'colours' => "Colour '{$colourName}' must have at least one picture.",
                    ]);
                }

                $restrictedBoxesByImagePath = [];
                foreach ($imagePaths as $imageIndex => $path) {
                    $boxPayload = $imageBoxes[$path] ?? null;
                    if (!$this->isValidRestrictedBoxPayload($boxPayload)) {
                        throw ValidationException::withMessages([
                            "colours.{$colourIndex}.image_boxes.{$imageIndex}" => "Colour '{$colourName}' image " . ($imageIndex + 1) . " is missing a valid restricted box.",
                        ]);
                    }
                    $normalizedBox = $this->normalizeRestrictedBoxPayload($boxPayload);
                    $restrictedBoxesByImagePath[$path] = $normalizedBox;
                    if (!isset($productImageBoxByPath[$path])) {
                        $productImageBoxByPath[$path] = $normalizedBox;
                    }
                }

                $allImagePaths = [...$allImagePaths, ...$imagePaths];

                foreach ($colour['variants'] as $variantData) {
                    $size = mb_strtoupper(trim((string) $variantData['size']));
                    $sku = $this->uniqueVariantSku($product, $colourName, $size);

                    $variant = $product->variants()->create([
                        'sku' => $sku,
                        'colour' => $colourName,
                        'size' => $size,
                        'price' => null,
                        'original_price' => null,
                        'stock' => (int) $variantData['stock'],
                        'weight' => (float) $variantData['weight'],
                    ]);

                    foreach ($imagePaths as $path) {
                        $box = $restrictedBoxesByImagePath[$path];
                        $variant->images()->create([
                            'path' => $path,
                            'restricted_left' => $box['left'],
                            'restricted_top' => $box['top'],
                            'restricted_width' => $box['width'],
                            'restricted_height' => $box['height'],
                        ]);
                    }
                }
            }

            $uniqueImagePaths = collect($allImagePaths)
                ->map(fn ($path) => trim((string) $path))
                ->filter()
                ->unique()
                ->values();

            foreach ($uniqueImagePaths as $path) {
                $box = $productImageBoxByPath[$path] ?? null;
                $product->images()->create([
                    'path' => $path,
                    'restricted_left' => $box['left'] ?? null,
                    'restricted_top' => $box['top'] ?? null,
                    'restricted_width' => $box['width'] ?? null,
                    'restricted_height' => $box['height'] ?? null,
                ]);
            }
        });

        if ($product) {
            $this->activityLogService->logFromRequest(
                $request,
                'product_created',
                'Product created',
                "Created product '{$product->name}' from layout builder",
                [
                    'icon' => 'package',
                    ...$this->activityLogService->modelContext($product, $product->name),
                    'metadata' => [
                        'price' => (float) $product->price,
                        'category_id' => (int) ($validated['category_id'] ?? 0),
                        'colours_count' => count($validated['colours'] ?? []),
                    ],
                ]
            );
        }

        return response()->json([
            'success' => true,
            'product' => [
                'id' => (int) $product->id,
                'name' => (string) $product->name,
                'brand' => (string) $product->brand,
                'slug' => (string) $product->slug,
                'price' => (float) $product->price,
            ],
        ]);
    }

    public function uploadImage(Request $request, OpenAiModerationService $moderationService)
    {
        $validated = $request->validate([
            'image' => 'required|image|max:8192',
        ]);

        $image = $validated['image'];
        if (!$image instanceof UploadedFile) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid image upload.',
            ], 422);
        }

        $imageDataUrl = $this->uploadedImageToDataUrl($image);
        if (!$imageDataUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Could not process uploaded image.',
            ], 422);
        }

        try {
            $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'Admin product image upload');
        } catch (\Throwable $exception) {
            Log::error('Admin product image moderation failed', [
                'error' => $exception->getMessage(),
                'admin_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage('[admin-product-image-upload-blocked]', $moderation, [
                'endpoint' => '/admin/products/upload-image',
                'admin_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => "Image was blocked by content checks ({$reason}). Please upload a different image.",
                'warning' => true,
            ], 422);
        }

        $path = $image->store('products/admin', 'public');

        return response()->json([
            'success' => true,
            'path' => '/storage/' . ltrim($path, '/'),
        ]);
    }

    private function uploadedImageToDataUrl(UploadedFile $file): ?string
    {
        $binary = @file_get_contents($file->getRealPath());
        if ($binary === false) {
            return null;
        }

        $mime = strtolower(trim((string) ($file->getMimeType() ?: 'image/jpeg')));
        if (!str_starts_with($mime, 'image/')) {
            return null;
        }

        return 'data:' . $mime . ';base64,' . base64_encode($binary);
    }

    public function deleteProduct(Request $request, Product $product)
    {
        $label = $product->name ?: "Product #{$product->id}";
        $context = $this->activityLogService->modelContext($product, $label);

        foreach ($product->variants()->with('images')->get() as $variant) {
            $variant->images()->delete();
        }

        $product->images()->delete();
        $product->categories()->detach();
        $product->delete();

        $this->activityLogService->logFromRequest(
            $request,
            'product_deleted',
            'Product deleted',
            "Deleted product '{$label}'",
            [
                'icon' => 'package',
                ...$context,
            ]
        );

        return response()->json(['success' => true]);
    }

    private function uniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = $baseSlug !== '' ? $baseSlug : 'category';
        $attempt = $slug;
        $i = 2;

        while (
            Category::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $attempt)
                ->exists()
        ) {
            $attempt = "{$slug}-{$i}";
            $i++;
        }

        return $attempt;
    }

    private function refreshDescendantSlugs(Category $category): void
    {
        $children = Category::query()->where('parent_id', $category->id)->get();

        foreach ($children as $child) {
            $leaf = Str::slug((string) $child->name);
            $newBase = $this->rootSlugFromPath($category->slug) . "/{$leaf}";
            $newSlug = $this->uniqueSlug($newBase, $child->id);

            if ($child->slug !== $newSlug) {
                $child->update(['slug' => $newSlug]);
            }

            $this->refreshDescendantSlugs($child->fresh());
        }
    }

    private function normalizeCategorySlugs(): void
    {
        $categories = Category::query()->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')->get();

        foreach ($categories as $category) {
            $leaf = Str::slug((string) $category->name);
            if (!$category->parent_id) {
                $desired = $leaf;
            } else {
                $parent = $categories->firstWhere('id', $category->parent_id) ?: Category::query()->find($category->parent_id);
                if (!$parent) {
                    $desired = $leaf;
                } else {
                    $root = $this->rootSlugFromPath((string) $parent->slug);
                    $desired = "{$root}/{$leaf}";
                }
            }

            $desired = $this->uniqueSlug($desired, $category->id);
            if ($category->slug !== $desired) {
                $category->update(['slug' => $desired]);
            }
        }
    }

    private function rootSlugFromPath(string $slug): string
    {
        $parts = explode('/', strtolower($slug));
        return trim((string) ($parts[0] ?? 'category')) ?: 'category';
    }

    private function uniqueProductSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = $baseSlug !== '' ? $baseSlug : 'product';
        $attempt = $slug;
        $i = 2;

        while (
            Product::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $attempt)
                ->exists()
        ) {
            $attempt = "{$slug}-{$i}";
            $i++;
        }

        return $attempt;
    }

    private function isValidRestrictedBoxPayload(mixed $payload): bool
    {
        if (!is_array($payload)) {
            return false;
        }

        foreach (['left', 'top', 'width', 'height'] as $field) {
            if (!array_key_exists($field, $payload) || !is_numeric($payload[$field])) {
                return false;
            }
        }

        $left = (float) $payload['left'];
        $top = (float) $payload['top'];
        $width = (float) $payload['width'];
        $height = (float) $payload['height'];

        if ($left < 0 || $top < 0 || $width <= 0 || $height <= 0) {
            return false;
        }

        if ($left >= 1 || $top >= 1 || $width > 1 || $height > 1) {
            return false;
        }

        if ($left + $width > 1 || $top + $height > 1) {
            return false;
        }

        return true;
    }

    private function normalizeRestrictedBoxPayload(array $payload): array
    {
        $left = max(0.0, min(1.0, (float) ($payload['left'] ?? 0)));
        $top = max(0.0, min(1.0, (float) ($payload['top'] ?? 0)));
        $width = max(0.01, min(1.0 - $left, (float) ($payload['width'] ?? 0.01)));
        $height = max(0.01, min(1.0 - $top, (float) ($payload['height'] ?? 0.01)));

        return [
            'left' => round($left, 6),
            'top' => round($top, 6),
            'width' => round($width, 6),
            'height' => round($height, 6),
        ];
    }

    private function uniqueVariantSku(Product $product, string $colour, string $size): string
    {
        $base = strtoupper(trim(preg_replace('/[^A-Za-z0-9]+/', '', "{$product->slug}{$colour}{$size}")));
        $base = $base !== '' ? $base : 'SKU';
        $attempt = $base;
        $suffix = 1;

        while (ProductVariant::query()->where('sku', $attempt)->exists()) {
            $suffix++;
            $attempt = "{$base}{$suffix}";
        }

        return $attempt;
    }

    private function buildCategoryTrail(Category $leaf): array
    {
        $trail = [];
        $seen = [];
        $current = $leaf;

        while ($current instanceof Category && !in_array($current->id, $seen, true)) {
            array_unshift($trail, $current);
            $seen[] = $current->id;
            $current = $current->parent;
        }

        return $trail;
    }
}
