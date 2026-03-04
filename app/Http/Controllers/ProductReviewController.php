<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductReview;
use App\Models\ProductReviewImage;
use App\Services\OpenAiModerationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProductReviewController extends Controller
{
    private const POLITICAL_CONTENT_PATTERN = '/\b(?:election|elections|politics|political|government|parliament|mp\b|prime minister|president|senator|congress|campaign|conservative|labour party|democrat|republican|left wing|right wing|vote|voting|manifesto|policy debate)\b/i';

    public function store(Request $request, Order $order, OrderItem $orderItem, OpenAiModerationService $moderationService): JsonResponse
    {
        $user = $request->user();
        if (!$user || (int) $order->user_id !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorised to review this order.',
            ], 403);
        }

        if ((int) $orderItem->order_id !== (int) $order->id) {
            return response()->json([
                'success' => false,
                'message' => 'That order item does not belong to this order.',
            ], 422);
        }

        if (!$this->isDelivered($order)) {
            return response()->json([
                'success' => false,
                'message' => 'Reviews can only be submitted after delivery is confirmed.',
            ], 422);
        }

        if (!$orderItem->product_id) {
            return response()->json([
                'success' => false,
                'message' => 'This item cannot be reviewed because the product reference is missing.',
            ], 422);
        }

        if (ProductReview::query()->where('order_item_id', $orderItem->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'You have already submitted a review for this delivered item.',
            ], 422);
        }

        $validated = $request->validate([
            'rating' => [
                'required',
                'numeric',
                'min:0.5',
                'max:5',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $rating = (float) $value;
                    if (abs(($rating * 2) - round($rating * 2)) > 0.0001) {
                        $fail('Rating must be in 0.5 increments.');
                    }
                },
            ],
            'message' => ['required', 'string', 'min:6', 'max:3000'],
            'images' => ['nullable', 'array', 'max:4'],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $rating = round((float) $validated['rating'] * 2) / 2;
        $message = trim((string) $validated['message']);

        if ($this->containsPoliticalContent($message)) {
            return response()->json([
                'success' => false,
                'message' => 'Political content is not allowed in reviews.',
                'warning' => true,
            ], 422);
        }

        try {
            $textModeration = $moderationService->moderate($message);
        } catch (\Throwable $exception) {
            Log::error('Review text moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => $user->id,
                'order_id' => $order->id,
                'order_item_id' => $orderItem->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Content checks are temporarily unavailable. Please try again in a moment.',
            ], 503);
        }

        $publicViolations = $moderationService->detectPublicPageViolations($message);
        if (!empty($textModeration['blocked']) || $publicViolations !== []) {
            $moderationService->logFlaggedMessage($message, [
                ...$textModeration,
                'matched_categories' => array_values(array_unique([
                    ...($textModeration['matched_categories'] ?? []),
                    ...$publicViolations,
                ])),
            ], [
                'endpoint' => '/orders/{order}/items/{orderItem}/reviews',
                'user_id' => $user->id,
                'order_id' => $order->id,
                'order_item_id' => $orderItem->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your review contains restricted content and could not be submitted.',
                'warning' => true,
            ], 422);
        }

        $imageFiles = collect($request->file('images', []))
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->values();

        foreach ($imageFiles as $index => $imageFile) {
            $imageDataUrl = $this->uploadedImageToDataUrl($imageFile);
            if (!$imageDataUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'One of the selected images could not be processed. Please try another image.',
                ], 422);
            }

            try {
                $imageModeration = $moderationService->moderateImageDataUrl($imageDataUrl, 'Product review image upload');
            } catch (\Throwable $exception) {
                Log::error('Review image moderation failed', [
                    'error' => $exception->getMessage(),
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'order_item_id' => $orderItem->id,
                    'image_index' => $index,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Image checks are temporarily unavailable. Please try again shortly.',
                ], 503);
            }

            if (!empty($imageModeration['blocked'])) {
                $reason = $moderationService->summarizeViolationReason($imageModeration);
                $moderationService->logFlaggedMessage('[review-image-upload-blocked]', $imageModeration, [
                    'endpoint' => '/orders/{order}/items/{orderItem}/reviews',
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'order_item_id' => $orderItem->id,
                    'image_index' => $index,
                    'ip' => $request->ip(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "One image was blocked by content checks ({$reason}). Please upload a different image.",
                    'warning' => true,
                ], 422);
            }
        }

        $review = DB::transaction(function () use ($order, $orderItem, $user, $rating, $message, $imageFiles) {
            $review = ProductReview::query()->create([
                'product_id' => (int) $orderItem->product_id,
                'order_id' => $order->id,
                'order_item_id' => $orderItem->id,
                'user_id' => $user->id,
                'rating' => $rating,
                'title' => Str::limit(preg_replace('/\s+/', ' ', $message) ?: $message, 110, ''),
                'message' => $message,
                'images_count' => $imageFiles->count(),
                'moderation_status' => 'approved',
                'reviewed_at' => now(),
                'is_visible' => true,
                'username_snapshot' => trim((string) ($user->username ?: $user->name ?: 'Customer')),
                'avatar_url_snapshot' => $user->avatar_url,
                'delivered_at' => $this->resolveDeliveredAt($order),
            ]);

            foreach ($imageFiles as $index => $imageFile) {
                $path = $imageFile->store('reviews/' . ($order->order_number ?: ('order-' . $order->id)), 'public');
                ProductReviewImage::query()->create([
                    'product_review_id' => $review->id,
                    'image_path' => $path,
                    'sort_order' => $index,
                ]);
            }

            return $review;
        });

        $review->loadMissing([
            'user:id,username,name,avatar',
            'images',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thanks. Your review has been published.',
            'review' => $this->mapReview($review),
        ]);
    }

    private function resolveDeliveredAt(Order $order): Carbon
    {
        if ($order->delivered_at) {
            return Carbon::parse($order->delivered_at, 'Europe/London');
        }

        return Carbon::parse($order->updated_at ?: now(), 'Europe/London');
    }

    private function isDelivered(Order $order): bool
    {
        if ($order->delivered_at) {
            return true;
        }

        $status = strtolower(trim((string) $order->status));
        return str_contains($status, 'deliver');
    }

    private function containsPoliticalContent(string $value): bool
    {
        return preg_match(self::POLITICAL_CONTENT_PATTERN, $value) === 1;
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

    private function mapReview(ProductReview $review): array
    {
        $username = trim((string) ($review->user?->username ?: $review->user?->name ?: $review->username_snapshot ?: 'Customer'));

        $avatarUrl = null;
        if ($review->user && $review->user->avatar_url) {
            $avatarUrl = $review->user->avatar_url;
        } elseif (is_string($review->avatar_url_snapshot) && trim($review->avatar_url_snapshot) !== '') {
            $snapshot = trim($review->avatar_url_snapshot);
            $avatarUrl = str_starts_with($snapshot, 'http://') || str_starts_with($snapshot, 'https://')
                ? $snapshot
                : asset('storage/' . ltrim($snapshot, '/'));
        }

        return [
            'id' => $review->id,
            'rating' => (float) ($review->rating ?? 0),
            'message' => (string) ($review->message ?? ''),
            'title' => (string) ($review->title ?? ''),
            'created_at' => optional($review->created_at)->toIso8601String(),
            'is_verified_purchase' => true,
            'user' => [
                'username' => $username,
                'avatar_url' => $avatarUrl,
            ],
            'images' => $review->images
                ->map(fn (ProductReviewImage $image) => $image->image_url)
                ->filter(fn ($url) => is_string($url) && trim($url) !== '')
                ->values()
                ->all(),
        ];
    }
}
