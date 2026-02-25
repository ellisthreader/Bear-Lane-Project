<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // If already verified, don’t send another
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Your email is already verified.',
            ], 400);
        }

        // Check cooldown (default 60 seconds)
        if (!$user->canSendVerificationEmail(60)) {
            $remaining = $user->last_verification_sent_at->diffInSeconds(now());
            return response()->json([
                'success' => false,
                'message' => 'Please wait before resending.',
                'remaining_seconds' => 60 - $remaining,
            ], 429);
        }

        // Send the email verification
        $user->sendEmailVerificationNotification();

        // Mark as sent for cooldown tracking
        $user->markVerificationEmailSent();

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent!',
            'remaining_seconds' => 60,
        ]);
    }
}
