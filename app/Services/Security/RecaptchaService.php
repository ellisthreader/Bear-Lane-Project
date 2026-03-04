<?php

namespace App\Services\Security;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class RecaptchaService
{
    public function isEnabled(): bool
    {
        return filled(config('services.recaptcha.secret'));
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

        $threshold = $minScore ?? (float) config('services.recaptcha.min_score', 0.5);
        $secret = (string) config('services.recaptcha.secret');

        $response = Http::asForm()
            ->timeout(8)
            ->post('https://www.google.com/recaptcha/api/siteverify', [
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
        $action = (string) ($payload['action'] ?? '');
        $score = isset($payload['score']) ? (float) $payload['score'] : 0.0;

        $actionMatches = $expectedAction === '' ? true : $action === $expectedAction;
        $scorePasses = $score >= $threshold;

        if (!$success || !$actionMatches || !$scorePasses) {
            Log::warning('reCAPTCHA verification rejected', [
                'ip' => $request->ip(),
                'expected_action' => $expectedAction,
                'actual_action' => $action,
                'score' => $score,
                'threshold' => $threshold,
                'error_codes' => $payload['error-codes'] ?? [],
            ]);

            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }
    }
}

