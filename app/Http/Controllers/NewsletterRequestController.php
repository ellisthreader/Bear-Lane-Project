<?php

namespace App\Http\Controllers;

use App\Models\SupportMessage;
use App\Services\AdminNotificationService;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterRequestController extends Controller
{
    public function store(Request $request, RecaptchaService $captcha, AdminNotificationService $notifications): JsonResponse
    {
        $captcha->verifyOrFail($request, 'newsletter_request');
        $data = $request->validate([
            'email' => ['required', 'email', 'max:180'],
            'consent' => ['required', 'accepted'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $message = SupportMessage::firstOrCreate(
            ['source_type' => 'newsletter_request', 'email' => $email],
            [
                'user_id' => $request->user()?->id,
                'name' => $request->user()?->name ?: 'Newsletter subscriber',
                'subject' => 'Newsletter subscription request',
                'message' => 'Please subscribe me to Bear Lane marketing emails.',
                'metadata' => ['marketing_consent' => true, 'consented_at' => now()->toIso8601String()],
                'status' => 'new',
            ]
        );
        if ($message->wasRecentlyCreated) {
            $notifications->sendAdminEventEmail(
                'newsletter_requested', 'Newsletter subscription request', 'New newsletter request',
                "Email: {$email}\nThe visitor agreed to receive Bear Lane marketing emails.\nRequest: #{$message->id}",
                replyTo: $email,
            );
        }

        return response()->json(['message' => 'Thanks, your subscription request has been received.']);
    }
}
