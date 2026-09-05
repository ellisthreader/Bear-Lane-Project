<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UnsplashService
{
    protected string $baseUrl = 'https://api.unsplash.com';

    /**
     * Get a random popular mushroom image URL.
     */
    public function getRandomMushroomImage(): ?string
    {
        $accessKey = trim((string) config('services.unsplash.access_key', ''));
        if ($accessKey === '') {
            Log::warning('UnsplashService: UNSPLASH_ACCESS_KEY is missing.');
            return null;
        }

        Log::info('UnsplashService: Fetching popular mushroom images.');

        $response = Http::get("{$this->baseUrl}/search/photos", [
            'client_id' => $accessKey,
            'query'     => 'beautiful bears',
            'order_by'  => 'popular',
            'per_page'  => 30,
            'orientation' => 'squarish',
        ]);

        if (!$response->successful()) {
            Log::error('UnsplashService: Failed to fetch mushroom images.', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return null;
        }

        $photos = $response->json()['results'] ?? [];

        if (empty($photos)) {
            Log::warning('UnsplashService: No mushroom photos found.');
            return null;
        }

        // Pick a random photo
        $chosen = $photos[array_rand($photos)];
        $url = $chosen['urls']['regular'] ?? null;

        Log::info('UnsplashService: Selected mushroom image.', ['url' => $url]);

        return $url;
    }
}
