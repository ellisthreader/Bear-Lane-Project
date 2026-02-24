<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Events\Registered;
use App\Models\User;

class AuthController extends Controller
{
private function resolveRedirectPath(?string $redirect, string $fallback = '/profile'): string
{
    $target = trim((string) $redirect);
    if ($target === '' || !str_starts_with($target, '/')) {
        return $fallback;
    }
    return $target;
}

// -----------------------
// REGISTER
// -----------------------
public function register(Request $request)
{
    $request->validate([
        'username' => ['required', 'string', 'max:255', 'unique:users,username'],
        'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ], [
        'username.unique' => 'Username already exists',
        'password.confirmed' => 'Passwords do not match',
    ]);

    $user = User::create([
        'username' => $request->username,
        'email'    => $request->email,
        'password' => Hash::make($request->password),
    ]);

    Auth::login($user);

    // Fire registered event (important for email verification)
    event(new Registered($user));

    // Explicitly send verification email (safe even with event)
    $user->sendEmailVerificationNotification();

    // Redirect to verification notice page
    return redirect()
        ->route('verification.notice')
        ->with('just_signed_up', true);
}


    // -----------------------
    // LOGIN
    // -----------------------
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            'redirect' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        // Block OAuth users from password login
        if ($user && $user->is_oauth) {
            $provider = ucfirst($user->oauth_provider ?? 'Google');

            return back()->withErrors([
                'email' => "This email is linked to {$provider} login. Please use the {$provider} button."
            ])->onlyInput('email');
        }

        if (Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {

            $request->session()->regenerate();
            $redirectPath = $this->resolveRedirectPath($request->input('redirect'));

            if (Auth::user()->is_admin) {
                return redirect('/admin/dashboard');
            }

            return redirect()->intended($redirectPath);
        }

        return back()->withErrors([
            'email' => 'Incorrect email or password.'
        ])->onlyInput('email');
    }

    // -----------------------
    // LOGOUT
    // -----------------------
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    // -----------------------
    // CHECK EMAIL (for frontend step logic)
    // -----------------------
    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        $exists = (bool) $user;
        $oauth = $user && $user->is_oauth
            ? ($user->oauth_provider ?? 'Google')
            : null;

        $suggestions = [];

        if ($exists) {
            $prefix = explode('@', $request->email)[0];
            for ($i = 1; $i <= 3; $i++) {
                $suggestions[] = $prefix . $i;
            }
        }

        return response()->json([
            'exists' => $exists,
            'oauth' => $oauth,
            'suggestions' => $suggestions,
        ]);
    }

    // -----------------------
    // FORGOT PASSWORD
    // -----------------------
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $request->email)->first();

        if ($user && $user->is_oauth) {
            $provider = ucfirst($user->oauth_provider ?? 'Google');

            return back()->withErrors([
                'email' => "This email is linked to {$provider} login."
            ]);
        }

        \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', 'Reset link sent successfully.')
            : back()->withErrors(['email' => __($status)]);
    }

    // -----------------------
    // RESET PASSWORD
    // -----------------------
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user && $user->is_oauth) {
            return back()->withErrors([
                'email' => 'This account uses OAuth login.'
            ]);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', 'Password reset successful.')
            : back()->withErrors(['email' => 'Invalid or expired link.']);
    }
}
