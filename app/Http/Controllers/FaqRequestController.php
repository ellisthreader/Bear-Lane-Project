<?php

namespace App\Http\Controllers;

use App\Models\FaqRequest;
use App\Services\AdminNotificationService;
use App\Services\OpenAiModerationService;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FaqRequestController extends Controller
{
    public function store(
        Request $request,
        OpenAiModerationService $moderationService,
        RecaptchaService $recaptchaService,
        AdminNotificationService $adminNotificationService
    ): JsonResponse
    {
        $recaptchaService->verifyOrFail($request, 'faq_request');

        $validated = $request->validate([
            'question' => ['required', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:5000'],
        ]);

        $content = trim((string) $validated['question'] . "\n" . (string) ($validated['details'] ?? ''));

        try {
            $moderation = $moderationService->moderate($content);
        } catch (\Throwable $exception) {
            Log::error('FAQ moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Content checks are temporarily unavailable. Please try again.',
            ], 503);
        }

        $publicPageViolations = $moderationService->detectPublicPageViolations($content);
        if (!empty($moderation['blocked']) || $publicPageViolations !== []) {
            $moderationService->logFlaggedMessage($content, [
                ...$moderation,
                'matched_categories' => array_values(array_unique([
                    ...($moderation['matched_categories'] ?? []),
                    ...$publicPageViolations,
                ])),
                'local_violations' => array_values(array_unique([
                    ...($moderation['local_violations'] ?? []),
                    ...$publicPageViolations,
                ])),
            ], [
                'endpoint' => '/help/faq-requests',
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your FAQ request could not be submitted because it contains restricted or personal information.',
                'warning' => true,
            ], 422);
        }

        $faqRequest = FaqRequest::create([
            'user_id' => $request->user()->id,
            'question' => $validated['question'],
            'details' => $validated['details'] ?? null,
            'status' => 'pending',
        ]);

        $adminNotificationService->sendAdminEventEmail(
            'faq_request_submitted',
            'New FAQ Request Submitted',
            'A customer submitted a new FAQ request',
            "Question: {$faqRequest->question}\nFrom user ID: {$faqRequest->user_id}"
        );

        return response()->json([
            'success' => true,
            'faq_request' => [
                'id' => $faqRequest->id,
                'question' => $faqRequest->question,
                'status' => $faqRequest->status,
                'created_at' => optional($faqRequest->created_at)?->toIso8601String(),
            ],
        ]);
    }
}
