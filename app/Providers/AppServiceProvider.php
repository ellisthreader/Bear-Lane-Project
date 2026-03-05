<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Observers\UserObserver;
use App\Services\UnsplashService;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind UnsplashService for dependency injection
        $this->app->singleton(UnsplashService::class, function ($app) {
            return new UnsplashService();
        });
    }

    public function boot(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        VerifyEmail::createUrlUsing(function (object $notifiable): string {
            $relativeSignedPath = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes((int) config('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
                absolute: false
            );

            $appUrl = rtrim((string) config('app.frontend_url', config('app.url', '')), '/');
            if ($appUrl !== '') {
                return $appUrl . $relativeSignedPath;
            }

            return URL::to($relativeSignedPath);
        });

        // Prefetch assets via Vite
        Vite::prefetch(concurrency: 3);

        // Register UserObserver
        User::observe(UserObserver::class);

        // Share auth.user with Inertia pages
        Inertia::share([
            'auth' => [
                'user' => function () {
                    $user = auth()->user();
                    if (!$user) return null;

                    return [
                        'id' => $user->id,
                        'username' => $user->username,
                        'name' => $user->name,
                        'is_admin' => (bool) ($user->is_admin ?? false),
                        'avatar_url' => $user->avatar_url ?? $user->avatar ?? '/images/default-avatar.png',
                        'created_at' => $user->created_at,
                    ];
                },
            ],
        ]);
    }
}
