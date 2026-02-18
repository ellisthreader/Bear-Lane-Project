<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Events\Registered;

class AuthController extends Controller
{
    // -----------------------
    // REGISTER
    // -----------------------
    public function register(Request $request)
    {
        $messages = [
            'username.unique' => 'Username already exists',
            'password.confirmed' => 'Passwords do not match',
        ];

        $request->validate([
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], $messages);

        $user = User::create([
            'username' => $request->username,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        Log::info("AuthController: User registered: {$user->email}");

        Auth::login($user);

        event(new Registered($user));

        return redirect()->route('profile.edit');
    }

    // -----------------------
    // LOGIN
    // -----------------------
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            $email = Auth::user()->email;

            if (Auth::user()->is_admin) {
                Log::info("AuthController: Admin logged in.", ['email' => $email]);
                return redirect('/admin/dashboard');
            }

            Log::info("AuthController: Normal user logged in.", ['email' => $email]);
            return redirect()->intended(route('profile.edit'));
        }

        Log::warning("AuthController: Failed login attempt.", ['email' => $credentials['email']]);

        return back()->withErrors([
            'email' => 'Incorrect email or password.'
        ])->onlyInput('email');
    }

    // -----------------------
    // LOGOUT
    // -----------------------
    public function logout(Request $request)
    {
        Log::info("AuthController: User logged out.", [
            'email' => Auth::check() ? Auth::user()->email : null
        ]);

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    // -----------------------
    // FORGOT PASSWORD
    // -----------------------
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        \DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('status', 'Reset link sent successfully.');
        }

        return back()->withErrors(['email' => __($status)]);
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

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()->route('login')
                ->with('status', 'Password reset successful. You can now log in.');
        }

        return back()->withErrors(['email' => 'Invalid or expired link.']);
    }

    // -----------------------
    // CHECK EMAIL
    // -----------------------
    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $exists = User::where('email', $request->email)->exists();

        // Optional: Suggest usernames based on email prefix if taken
        $suggestions = [];
        if ($exists) {
            $prefix = explode('@', $request->email)[0];
            for ($i = 1; $i <= 3; $i++) {
                $suggestions[] = $prefix . $i;
            }
        }

        return response()->json([
            'exists' => $exists,
            'suggestions' => $suggestions,
        ]);
    }
}
