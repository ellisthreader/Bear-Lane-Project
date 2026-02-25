<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /**
     * Handle the email verification link.
     *
     * @param  \Illuminate\Foundation\Auth\EmailVerificationRequest  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $user = $request->user();

        // If already verified, just redirect
        if ($user->hasVerifiedEmail()) {
            return redirect()->route('profile.edit')->with('verified', 1);
        }

        // Mark email as verified and fire Verified event
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect()->route('profile.edit')->with('verified', 1);
    }
}
