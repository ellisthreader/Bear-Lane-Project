<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class OAuthController extends Controller
{
    // -------------------
    // Google
    // -------------------
    public function redirectToGoogle()
    {
        Log::info("Redirecting user to Google OAuth");
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
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

            return redirect('/profile');
        } catch (\Exception $e) {
            Log::error("Google OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Google.']);
        }
    }

    // -------------------
    // Apple
    // -------------------
    public function redirectToApple()
    {
        Log::info("Redirecting user to Apple OAuth");
        return Socialite::driver('apple')->redirect();
    }

    public function handleAppleCallback()
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

            return redirect('/profile');
        } catch (\Exception $e) {
            Log::error("Apple OAuth login failed", ['error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['email' => 'Failed to login with Apple.']);
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
