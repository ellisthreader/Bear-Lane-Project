<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use App\Services\Security\RecaptchaService;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request, RecaptchaService $recaptchaService)
    {
        $recaptchaService->verifyOrFail($request, 'forgot_password');

        $request->validate([
            'email' => 'required|email',
        ]);

        $emailHash = hash('sha256', strtolower(trim((string) $request->email)));

        Log::info('Password reset request received.', [
            'email_hash' => $emailHash,
        ]);

        try {
            // Delete old tokens for this email
            $deleted = DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            Log::info("Old tokens deleted for email.", [
                'email_hash' => $emailHash,
                'deleted_rows' => $deleted
            ]);

            // Send reset link using Laravel's default broker
            $status = Password::broker('users')->sendResetLink(
                $request->only('email')
            );

            Log::info('Password broker status:', ['status' => $status]);

            if ($status === Password::RESET_LINK_SENT) {
                return response()->json([
                    'status' => 'Reset link sent successfully.',
                ], 200);
            }

            Log::warning('Failed to send reset link.', ['status' => $status]);

            return response()->json([
                'errors' => [
                    'email' => __($status)
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('Exception in password reset request.', [
                'message' => $e->getMessage(),
                'email_hash' => $emailHash,
            ]);

            return response()->json([
                'errors' => [
                    'email' => 'Something went wrong. Check logs for details.'
                ]
            ], 500);
        }
    }
}
