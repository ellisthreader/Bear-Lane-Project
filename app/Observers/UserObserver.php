<?php

namespace App\Observers;

use App\Models\User;
use App\Services\UnsplashService;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    protected UnsplashService $unsplash;

    public function __construct(UnsplashService $unsplash)
    {
        $this->unsplash = $unsplash;
    }

    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        Log::info("UserObserver: Created event fired for User ID {$user->id}");

        // If avatar_url is already set, do nothing
        if ($user->avatar_url) {
            Log::info("UserObserver: User ID {$user->id} already has an avatar_url.");
            return;
        }

        // Fetch a random mushroom image
        $imageUrl = $this->unsplash->getRandomMushroomImage();

        if ($imageUrl) {
            Log::info("UserObserver: Setting avatar for User ID {$user->id}: {$imageUrl}");

            // Save both avatar and avatar_url
            $user->avatar = $imageUrl;      // could be a local path if downloaded
            $user->avatar_url = $imageUrl;  // frontend will use this
            $user->save();
        } else {
            Log::warning("UserObserver: Unsplash returned null for User ID {$user->id}");
        }
    }
}
