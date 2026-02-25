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
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return redirect()->intended($redirectPath);
        } catch (\Exception $e) {
            Log::warning('Failed login attempt.', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
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
            'email' => $user?->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect('/');
    }
}
