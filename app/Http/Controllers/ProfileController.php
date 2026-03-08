<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;
use App\Services\UnsplashService;
use App\Services\OpenAiModerationService;
use App\Services\StoreSettingsService;
use App\Models\Product;
use App\Models\SavedDesign;

class ProfileController extends Controller
{
    protected UnsplashService $unsplash;
    protected int $cooldownMinutes = 5;

    public function __construct(UnsplashService $unsplash)
    {
        $this->unsplash = $unsplash;
    }

    /**
     * Show profile (view mode)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $savedDesigns = SavedDesign::with(['product.images', 'product.variants'])
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->take(16)
            ->get()
            ->map(function (SavedDesign $design) {
                return [
                    'id' => $design->id,
                    'name' => $design->name,
                    'product_name' => $design->product?->name,
                    'product_slug' => $design->product?->slug,
                    'product_price' => $design->product?->price !== null ? (float) $design->product->price : null,
                    'product_sizes' => $design->product?->variants
                        ? $design->product->variants
                            ->pluck('size')
                            ->filter(fn ($size) => is_string($size) && trim($size) !== '')
                            ->unique()
                            ->values()
                            ->all()
                        : [],
                    'product_images' => $design->product?->images
                        ? $design->product->images->pluck('url')->values()->all()
                        : [],
                    'preview_image' => data_get($design->design_payload, 'compositePngByView.front')
                        ?: data_get(
                            $design->design_payload,
                            'compositePngByView.' . data_get($design->design_payload, 'currentViewKey')
                        )
                        ?: $design->product?->images?->first()?->url,
                    'updated_at' => optional($design->updated_at)?->toIso8601String(),
                    'payload' => $design->design_payload,
                ];
            })
            ->values();

        $recommendedProducts = Product::with('images')
            ->where('is_trending', true)
            ->latest('id')
            ->take(12)
            ->get();

        if ($recommendedProducts->isEmpty()) {
            $recommendedProducts = Product::with('images')
                ->latest('id')
                ->take(12)
                ->get();
        }

        $premadeQuotesById = collect((array) data_get(app(StoreSettingsService::class)->getFrontPageProducts(), 'premade_quotes', []))
            ->mapWithKeys(fn ($quote, $id) => [(int) $id => trim((string) $quote)])
            ->all();

        return inertia('Profile/ProfileView', [
            'auth' => [
                'user' => array_merge($user->toArray(), [
                    'avatar_url' => $user->avatar_url,
                    'remaining_seconds' => $this->getRemainingCooldown($user),
                    'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                    'server_time' => Carbon::now('UTC')->toIso8601String(),
                ]),
            ],
            'savedDesigns' => $savedDesigns,
            'recommendedProducts' => $recommendedProducts->map(function (Product $product) use ($premadeQuotesById) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'brand' => $product->brand,
                    'price' => $product->price !== null ? (float) $product->price : null,
                    'image' => $product->images->first()?->url,
                    'is_premade_design' => (bool) ($product->is_premade_design ?? false),
                    'premade_quote' => (string) ($premadeQuotesById[(int) $product->id] ?? ''),
                ];
            })->values(),
        ]);
    }

    /**
     * Show edit page
     */
    public function edit(Request $request)
    {
        $user = $request->user();

        return inertia('Profile/EditProfilePage', [
            'auth' => [
                'user' => array_merge($user->toArray(), [
                    'remaining_seconds' => $this->getRemainingCooldown($user),
                    'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                    'server_time' => Carbon::now('UTC')->toIso8601String(),
                ]),
            ],
        ]);
    }

    /**
     * Update profile (FIXED FOR INERTIA)
     */
    public function update(Request $request)
    {
        $user = $request->user();

        Log::info("Profile update for user {$user->id}");

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        // Handle profile photo
        if ($request->hasFile('profile_photo')) {
            $photo = $request->file('profile_photo');
            if ($photo instanceof UploadedFile) {
                $moderationFailure = $this->moderateAvatarUpload($photo, $request);
                if ($moderationFailure !== null) {
                    $message = (string) ($moderationFailure->getData(true)['message'] ?? 'Avatar image upload failed moderation checks.');
                    return back()->withErrors(['profile_photo' => $message]);
                }
            }

            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            $path = $request->file('profile_photo')->store('avatars', 'public');

            $validated['avatar'] = $path;
        }

        $user->update($validated);

        return redirect()
            ->route('profile')
            ->with('success', 'Profile updated successfully.');
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'profile_photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($request->hasFile('profile_photo')) {
            $photo = $request->file('profile_photo');
            if ($photo instanceof UploadedFile) {
                $moderationFailure = $this->moderateAvatarUpload($photo, $request);
                if ($moderationFailure !== null) {
                    return $moderationFailure;
                }
            }

            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            $path = $request->file('profile_photo')->store('avatars', 'public');
            $user->update(['avatar' => $path]);
        }

        return response()->json([
            'success' => true,
            'avatar_url' => $user->fresh()->avatar_url,
        ]);
    }

    /**
     * Generate random avatar (STAYS JSON FOR AXIOS)
     */
    public function generateRandomAvatar(Request $request)
    {
        $user = $request->user();
        $remaining = $this->getRemainingCooldown($user);
        $unsplashAccessKey = trim((string) config('services.unsplash.access_key', ''));

        if ($remaining > 0) {
            return response()->json([
                'success' => false,
                'message' => "You can only generate a new avatar once every {$this->cooldownMinutes} minutes.",
                'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ], 429);
        }

        if ($unsplashAccessKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'Avatar generator is not configured. Missing UNSPLASH_ACCESS_KEY.',
            ], 503);
        }

        $randomAvatarUrl = $this->unsplash->getRandomMushroomImage();

        if (!$randomAvatarUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Could not fetch avatar.',
            ], 500);
        }

        $contents = Http::get($randomAvatarUrl)->body();
        $filename = 'avatars/' . uniqid() . '.jpg';
        Storage::disk('public')->put($filename, $contents);

        $user->update([
            'avatar' => $filename,
            'last_avatar_generated_at' => Carbon::now('UTC'),
        ]);

        $user->refresh();

        return response()->json([
            'success' => true,
            'user' => array_merge($user->toArray(), [
                'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ]),
        ]);
    }

    private function getRemainingCooldown($user): int
    {
        if (!$user->last_avatar_generated_at) return 0;

        $last = Carbon::parse($user->last_avatar_generated_at, 'UTC');
        $elapsed = $last->diffInSeconds(Carbon::now('UTC'));

        return max(0, ($this->cooldownMinutes * 60) - $elapsed);
    }

    private function getCooldownEndsAt($user): ?string
    {
        if (!$user->last_avatar_generated_at) return null;

        return Carbon::parse($user->last_avatar_generated_at, 'UTC')
            ->addMinutes($this->cooldownMinutes)
            ->toIso8601String();
    }

    private function moderateAvatarUpload(UploadedFile $file, Request $request): ?JsonResponse
    {
        $imageDataUrl = $this->uploadedImageToDataUrl($file);
        if (!$imageDataUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Could not process uploaded avatar image.',
            ], 422);
        }

        $moderationService = app(OpenAiModerationService::class);
        try {
            $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'User avatar upload');
        } catch (\Throwable $exception) {
            Log::error('Profile avatar moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage('[profile-avatar-upload-blocked]', $moderation, [
                'endpoint' => '/profile/avatar',
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => "Avatar image was blocked by content checks ({$reason}). Please upload a different image.",
                'warning' => true,
            ], 422);
        }

        return null;
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
}
