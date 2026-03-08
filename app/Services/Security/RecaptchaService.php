<?php

namespace App\Services\Security;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class RecaptchaService
{
    private function provider(): string
    {
        $provider = strtolower(trim((string) config('services.recaptcha.provider', '')));
        if ($provider === 'turnstile') {
            return $provider;
        }

        return '';
    }

    private function hasTurnstileCredentials(): bool
    {
        return filled(config('services.recaptcha.secret'))
            && filled(config('services.recaptcha.site_key'));
    }

    public function isEnabled(): bool
    {
        return $this->provider() === 'turnstile' && $this->hasTurnstileCredentials();
    }

    public function verifyOrFail(Request $request, string $expectedAction, ?float $minScore = null): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $token = trim((string) $request->input('recaptcha_token', ''));
        if ($token === '') {
            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }

        $this->verifyTurnstileOrFail($request, $token, $expectedAction);
    }

    private function verifyTurnstileOrFail(
        Request $request,
        string $token,
        string $expectedAction
    ): void {
        $secret = (string) config('services.recaptcha.secret');

        $response = Http::asForm()
            ->timeout(8)
            ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);

        if (!$response->ok()) {
            Log::warning('reCAPTCHA verification request failed', [
                'status' => $response->status(),
                'ip' => $request->ip(),
                'expected_action' => $expectedAction,
            ]);

            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }

        $payload = $response->json();
        $success = (bool) ($payload['success'] ?? false);
        $action = isset($payload['action']) ? (string) $payload['action'] : null;

        $actionMatches = $expectedAction === '' || $action === null ? true : $action === $expectedAction;

        if (!$success || !$actionMatches) {
            Log::warning('Turnstile verification rejected', [
                'ip' => $request->ip(),
                'expected_action' => $expectedAction,
                'actual_action' => $action,
                'error_codes' => $payload['error-codes'] ?? [],
            ]);

            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }
    }
}
