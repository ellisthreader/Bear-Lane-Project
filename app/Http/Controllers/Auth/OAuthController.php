<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class OAuthController extends Controller
{
    private function resolveRedirectPath(?string $redirect, string $fallback = '/profile'): string
    {
        $target = trim((string) $redirect);
        if ($target === '' || !str_starts_with($target, '/')) {
            return $fallback;
        }
        return $target;
    }

    private function oauthSuccessRedirect(Request $request): string
    {
        $target = $this->resolveRedirectPath($request->session()->pull('oauth_redirect', '/profile'));
        return $target;
    }

    // -------------------
    // Google
    // -------------------
    public function redirectToGoogle(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Google OAuth");
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        Log::info("Google OAuth callback triggered");

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
            Log::info("Google user data received", [
                'email' => $googleUser->getEmail(),
                'id' => $googleUser->getId(),
                'name' => $googleUser->getName(),
            ]);

            $user = $this->findOrCreateOAuthUser($googleUser);

            Auth::login($user);

            Log::info("User logged in via Google OAuth", [
                'id' => $user->id,
                'email' => $user->email,
                'is_oauth' => $user->is_oauth,
            ]);

            return redirect($this->oauthSuccessRedirect($request));
        } catch (\Exception $e) {
            Log::error("Google OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Google.']);
        }
    }

    // -------------------
    // Apple
    // -------------------
    public function redirectToApple(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Apple OAuth");
        return Socialite::driver('apple')->redirect();
    }

    public function handleAppleCallback(Request $request)
    {
        Log::info("Apple OAuth callback triggered");

        try {
            $appleUser = Socialite::driver('apple')->stateless()->user();
            Log::info("Apple user data received", [
                'email' => $appleUser->getEmail(),
                'id' => $appleUser->getId(),
                'name' => $appleUser->getName(),
            ]);

            $user = $this->findOrCreateOAuthUser($appleUser);

            Auth::login($user);

            Log::info("User logged in via Apple OAuth", [
                'id' => $user->id,
                'email' => $user->email,
                'is_oauth' => $user->is_oauth,
            ]);

            return redirect($this->oauthSuccessRedirect($request));
        } catch (\Exception $e) {
            Log::error("Apple OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Apple.']);
        }
    }

    // -------------------
    // Facebook
    // -------------------
    public function redirectToFacebook(Request $request)
    {
        $request->session()->put('oauth_redirect', $this->resolveRedirectPath($request->query('redirect')));
        Log::info("Redirecting user to Facebook OAuth");
        return Socialite::driver('facebook')->redirect();
    }

    public function handleFacebookCallback(Request $request)
    {
        Log::info("Facebook OAuth callback triggered");

        try {
            $facebookUser = Socialite::driver('facebook')->stateless()->user();
            Log::info("Facebook user data received", [
                'email' => $facebookUser->getEmail(),
                'id' => $facebookUser->getId(),
                'name' => $facebookUser->getName(),
            ]);

            $user = $this->findOrCreateOAuthUser($facebookUser);
            Auth::login($user);

            Log::info("User logged in via Facebook OAuth", [
                'id' => $user->id,
                'email' => $user->email,
                'is_oauth' => $user->is_oauth,
            ]);

            return redirect($this->oauthSuccessRedirect($request));
        } catch (\Exception $e) {
            Log::error("Facebook OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Facebook.']);
        }
    }

    // -------------------
    // Helper: Find or create user via OAuth
    // -------------------
    private function findOrCreateOAuthUser($oauthUser): User
    {
        Log::info("findOrCreateOAuthUser called", [
            'email' => $oauthUser->getEmail(),
        ]);

        $user = User::where('email', $oauthUser->getEmail())->first();

        if ($user) {
            if (!$user->is_oauth) {
                $user->is_oauth = true;
                $user->save();
                Log::info("Existing user marked as OAuth", [
                    'id' => $user->id,
                    'email' => $user->email,
                    'is_oauth' => $user->is_oauth,
                ]);
            }
            return $user;
        }

        // Generate unique username from email
        $baseUsername = Str::slug(explode('@', $oauthUser->getEmail())[0]);
        $username = $baseUsername;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Create new OAuth user
        $user = User::create([
            'username' => $username,
            'email'    => $oauthUser->getEmail(),
            'password' => bcrypt(Str::random(16)), // random password
            'is_oauth' => true,
        ]);

        Log::info("New OAuth user created", [
            'id' => $user->id,
            'email' => $user->email,
            'is_oauth' => $user->is_oauth,
        ]);

        return $user;
    }
}
