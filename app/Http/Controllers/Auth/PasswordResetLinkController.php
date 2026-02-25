<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        Log::info('Password reset request received.', [
            'email' => $request->email,
        ]);

        try {
            // Delete old tokens for this email
            $deleted = DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            Log::info("Old tokens deleted for email.", [
                'email' => $request->email,
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
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'errors' => [
                    'email' => 'Something went wrong. Check logs for details.'
                ]
            ], 500);
        }
    }
}
