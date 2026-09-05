<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    private function resolveRedirectPath(?string $redirect, string $fallback = '/profile'): string
    {
        $target = trim((string) $redirect);
        if ($target === '' || !str_starts_with($target, '/')) {
            return $fallback;
        }
        return $target;
    }
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        try {
            $request->authenticate();
            $request->session()->regenerate();
            $redirectPath = $this->resolveRedirectPath($request->input('redirect'));

            Log::info('User logged in successfully.', [
                'user_id' => optional($request->user())->id,
                'ip' => $request->ip(),
            ]);

            return redirect()->intended($redirectPath);
        } catch (\Exception $e) {
            Log::warning('Failed login attempt.', [
                'email_hash' => hash('sha256', strtolower(trim((string) $request->email))),
                'ip' => $request->ip(),
                'error' => $e->getMessage(),
            ]);

            throw $e; // rethrow exception so Laravel can handle it
        }
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Log::info('User logged out.', [
            'user_id' => $user?->id,
            'ip' => $request->ip(),
        ]);

        return redirect('/');
    }
}
