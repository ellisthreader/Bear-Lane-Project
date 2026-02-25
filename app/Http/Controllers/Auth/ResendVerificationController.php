<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ResendVerificationController extends Controller
{
    private int $cooldownMinutes = 1;

    public function resend(Request $request)
    {
        $user = $request->user();

        $remaining = $this->getCooldownRemaining($user);

        if ($remaining > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Please wait before resending.',
                'remaining_seconds' => $remaining,
                'cooldown_ends_at' => now()->addSeconds($remaining)->toIso8601String(),
                'server_time' => now()->toIso8601String(),
            ], 429);
        }

        $user->sendEmailVerificationNotification();
        $user->update(['last_email_verification_sent_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent!',
        ]);
    }

    private function getCooldownRemaining($user): int
    {
        $last = $user->last_email_verification_sent_at;
        if (!$last) return 0;

        $expiresAt = $last->addMinutes($this->cooldownMinutes);
        $diff = $expiresAt->diffInSeconds(now());
        return $diff > 0 ? $diff : 0;
    }
}
