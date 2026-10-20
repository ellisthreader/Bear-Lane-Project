<?php

namespace App\Http\Middleware;

use App\Services\StoreSettingsService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $settingsService = app(StoreSettingsService::class);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user()
                    ? [
                        'id' => $request->user()->id,
                        'username' => $request->user()->username,
                        'name' => $request->user()->name,
                        'email' => $request->user()->email,
                        'phone' => $request->user()->phone,
                        'is_admin' => (bool) ($request->user()->is_admin ?? false),
                        'is_oauth' => (bool) ($request->user()->is_oauth ?? false),
                        'oauth_provider' => $request->user()->oauth_provider,
                        'avatar_url' => $request->user()->avatar_url ?? $request->user()->avatar ?? '/images/default-avatar.png',
                    ]
                    : null,
            ],
            'storeSettings' => fn () => $settingsService->getPublicSettings(),
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'verified' => fn () => $request->session()->get('verified'),
            ],
        ];
    }
}
