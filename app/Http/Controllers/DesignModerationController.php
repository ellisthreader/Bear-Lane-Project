<?php

namespace App\Http\Controllers;

use App\Services\OpenAiModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class DesignModerationController extends Controller
{
    public function moderateText(Request $request, OpenAiModerationService $moderationService): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:1000'],
        ]);

        $text = trim((string) ($validated['text'] ?? ''));
        if ($text === '') {
            return response()->json([
                'allowed' => true,
            ]);
        }

        try {
            $moderation = $moderationService->moderate($text);
        } catch (\Throwable $exception) {
            Log::error('Design text moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'allowed' => false,
                'message' => 'Text moderation is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage($text, $moderation, [
                'endpoint' => '/design/moderate-text',
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'allowed' => false,
                'message' => "Text contains restricted content ({$reason}).",
                'reason' => $reason,
                'warning' => true,
            ], 422);
        }

        return response()->json([
            'allowed' => true,
        ]);
    }

    public function moderateImage(Request $request, OpenAiModerationService $moderationService): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'max:25600'],
        ]);

        $image = $request->file('image');
        if (!$image instanceof UploadedFile) {
            return response()->json([
                'allowed' => false,
                'message' => 'Could not process uploaded image.',
            ], 422);
        }

        $imageDataUrl = $this->uploadedImageToDataUrl($image);
        if (!$imageDataUrl) {
            return response()->json([
                'allowed' => false,
                'message' => 'Could not read uploaded image.',
            ], 422);
        }

        try {
            $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'Design editor upload');
        } catch (\Throwable $exception) {
            Log::error('Design image moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'allowed' => false,
                'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage('[design-image-upload-blocked]', $moderation, [
                'endpoint' => '/design/moderate-image',
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'allowed' => false,
                'message' => "Image contains restricted content ({$reason}). Please upload another image.",
                'reason' => $reason,
                'warning' => true,
            ], 422);
        }

        return response()->json([
            'allowed' => true,
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
            $mime = 'image/jpeg';
        }

        return 'data:' . $mime . ';base64,' . base64_encode($binary);
    }
}
