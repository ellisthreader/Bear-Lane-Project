<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class OAuthController extends Controller
{
    // -------------------
    // Google
    // -------------------
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        // Generate a unique username
        $baseUsername = Str::slug(explode('@', $googleUser->getEmail())[0]); // use email prefix
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Create or get the user
        $user = User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'username' => $username,
                'password' => bcrypt(Str::random(16)), // random password for OAuth user
            ]
        );

        Auth::login($user);

        return redirect('/profile/edit');
    }

    // -------------------
    // Apple
    // -------------------
    public function redirectToApple()
    {
        return Socialite::driver('apple')->redirect();
    }

    public function handleAppleCallback()
    {
        $appleUser = Socialite::driver('apple')->stateless()->user();

        // Generate a unique username
        $baseUsername = Str::slug(explode('@', $appleUser->getEmail())[0]); // use email prefix
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Create or get the user
        $user = User::firstOrCreate(
            ['email' => $appleUser->getEmail()],
            [
                'username' => $username,
                'password' => bcrypt(Str::random(16)), // random password for OAuth user
            ]
        );

        Auth::login($user);

        return redirect('/profile/edit');
    }
}
