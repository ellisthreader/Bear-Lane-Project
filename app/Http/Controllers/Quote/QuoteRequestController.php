<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use App\Services\OpenAiModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use App\Models\QuoteRequest;

class QuoteRequestController extends Controller
{
    public function store(Request $request, OpenAiModerationService $moderationService): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'required|string',
            'budget' => 'nullable|string',
            'details' => 'required|string',
            'images.*' => 'image|max:5120' // 5MB max per image
        ]);

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                if (!$image instanceof UploadedFile) {
                    continue;
                }

                $imageDataUrl = $this->uploadedImageToDataUrl($image);
                if (!$imageDataUrl) {
                    return response()->json([
                        'message' => 'One image could not be processed. Please upload a different image.',
                    ], 422);
                }

                try {
                    $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'Quote request image upload');
                } catch (\Throwable $exception) {
                    Log::error('Quote request image moderation failed', [
                        'error' => $exception->getMessage(),
                        'email' => (string) $request->input('email', ''),
                        'image_index' => $index,
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
                    ], 503);
                }

                if (!empty($moderation['blocked'])) {
                    $reason = $moderationService->summarizeViolationReason($moderation);
                    $moderationService->logFlaggedMessage('[quote-request-image-upload-blocked]', $moderation, [
                        'endpoint' => '/api/quote-request',
                        'email' => (string) $request->input('email', ''),
                        'image_index' => $index,
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => "One image was blocked by content checks ({$reason}). Please upload a different image.",
                        'warning' => true,
                    ], 422);
                }

                $path = $image->store('quote-requests', 'public');
                $imagePaths[] = $path;
            }
        }

        $quote = QuoteRequest::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'budget' => $request->budget,
            'details' => $request->details,
            'images' => $imagePaths,
        ]);

        return response()->json([
            'message' => 'Quote request submitted successfully',
            'data' => $quote
        ], 201);
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
