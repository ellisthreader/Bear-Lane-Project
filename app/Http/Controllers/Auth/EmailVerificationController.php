<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\User;
use App\Models\EmailVerification;
use App\Mail\OAuthCodeMail;

class EmailVerificationController extends Controller
{
    // -----------------------
    // SEND CODE
    // -----------------------
    public function sendCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['success' => false]);
        }

        // Rate limit (5 per 10 minutes per email)
        $key = 'otp-send:' . $request->email;

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Try again later.'
            ], 429);
        }

        RateLimiter::hit($key, 600);

        // Delete old codes for this email
        EmailVerification::where('email', $request->email)->delete();

        // Generate 6-digit code
        $rawCode = random_int(100000, 999999);

        EmailVerification::create([
            'email' => $request->email,
            'code' => Hash::make($rawCode),
            'expires_at' => Carbon::now()->addMinutes(10),
            'attempts' => 0,
            'ip_address' => $request->ip(),
        ]);

        Mail::to($request->email)->queue(new OAuthCodeMail($rawCode));

        return response()->json(['success' => true]);
    }

    // -----------------------
    // VERIFY CODE
    // -----------------------
    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|digits:6'
        ]);

        $verification = EmailVerification::where('email', $request->email)->first();

        if (!$verification) {
            return response()->json(['success' => false]);
        }

        // Expired
        if (Carbon::now()->gt($verification->expires_at)) {
            $verification->delete();
            return response()->json(['success' => false]);
        }

        // Too many attempts
        if ($verification->attempts >= 5) {
            $verification->delete();
            return response()->json(['success' => false]);
        }

        // Check code
        if (!Hash::check($request->code, $verification->code)) {
            $verification->increment('attempts');
            return response()->json(['success' => false]);
        }

        // Success — login user
        $user = User::where('email', $request->email)->first();

        Auth::login($user);

        // Delete verification record
        $verification->delete();

        return response()->json(['success' => true]);
    }

    // -----------------------
    // RESEND
    // -----------------------
    public function resendCode(Request $request)
    {
        return $this->sendCode($request);
    }
}
