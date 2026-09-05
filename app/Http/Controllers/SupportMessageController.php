<?php

namespace App\Http\Controllers;

use App\Models\SupportMessage;
use App\Services\AdminNotificationService;
use App\Services\OpenAiModerationService;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupportMessageController extends Controller
{
    public function store(
        Request $request,
        OpenAiModerationService $moderationService,
        RecaptchaService $recaptchaService,
        AdminNotificationService $adminNotificationService,
    ): JsonResponse {
        $recaptchaService->verifyOrFail($request, 'support_message');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180'],
            'subject' => ['required', 'string', 'max:220'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $combinedContent = trim((string) $validated['subject']) . "\n" . trim((string) $validated['message']);

        try {
            $moderation = $moderationService->moderate($combinedContent);
        } catch (\Throwable $exception) {
            Log::error('Support message moderation failed', [
                'error' => $exception->getMessage(),
                'email' => (string) $validated['email'],
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Content checks are temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $moderationService->logFlaggedMessage($combinedContent, $moderation, [
                'endpoint' => '/support/messages',
                'email' => (string) $validated['email'],
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => OpenAiModerationService::FLAGGED_WARNING_MESSAGE,
                'warning' => true,
            ], 422);
        }

        $supportMessage = SupportMessage::query()->create([
            'user_id' => $request->user()?->id,
            'source_type' => 'support_form',
            'name' => trim((string) $validated['name']),
            'email' => trim((string) $validated['email']),
            'subject' => trim((string) $validated['subject']),
            'message' => trim((string) $validated['message']),
            'status' => 'new',
        ]);

        $adminNotificationService->sendAdminEventEmail(
            'support_message_submitted',
            'New Support Message',
            'A customer sent a support message',
            "From: {$supportMessage->name} <{$supportMessage->email}>\nSubject: {$supportMessage->subject}\n\n{$supportMessage->message}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Thanks, your message has been sent. Our team will get back to you shortly.',
            'support_message_id' => $supportMessage->id,
        ]);
    }
}
