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
        return strtolower((string) config('services.recaptcha.provider', 'standard'));
    }

    private function isEnterpriseEnabled(): bool
    {
        return $this->provider() === 'enterprise'
            && filled(config('services.recaptcha.enterprise_project_id'))
            && filled(config('services.recaptcha.enterprise_api_key'))
            && filled(config('services.recaptcha.site_key'));
    }

    public function isEnabled(): bool
    {
        if ($this->isEnterpriseEnabled()) {
            return true;
        }

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
        if ($this->isEnterpriseEnabled()) {
            $this->verifyEnterpriseOrFail($request, $token, $expectedAction, $threshold);
            return;
        }

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

    private function verifyEnterpriseOrFail(
        Request $request,
        string $token,
        string $expectedAction,
        float $threshold
    ): void {
        $projectId = (string) config('services.recaptcha.enterprise_project_id');
        $apiKey = (string) config('services.recaptcha.enterprise_api_key');
        $siteKey = (string) config('services.recaptcha.site_key');

        $endpoint = sprintf(
            'https://recaptchaenterprise.googleapis.com/v1/projects/%s/assessments?key=%s',
            rawurlencode($projectId),
            rawurlencode($apiKey)
        );

        $response = Http::timeout(8)->post($endpoint, [
            'event' => [
                'token' => $token,
                'siteKey' => $siteKey,
                'expectedAction' => $expectedAction,
                'userIpAddress' => $request->ip(),
                'userAgent' => (string) $request->userAgent(),
            ],
        ]);

        if (!$response->ok()) {
            Log::warning('reCAPTCHA Enterprise verification request failed', [
                'status' => $response->status(),
                'ip' => $request->ip(),
                'expected_action' => $expectedAction,
                'response' => $response->body(),
            ]);

            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }

        $payload = $response->json() ?? [];
        $tokenProperties = $payload['tokenProperties'] ?? [];
        $riskAnalysis = $payload['riskAnalysis'] ?? [];

        $valid = (bool) ($tokenProperties['valid'] ?? false);
        $actualAction = (string) ($tokenProperties['action'] ?? '');
        $score = isset($riskAnalysis['score']) ? (float) $riskAnalysis['score'] : 0.0;
        $invalidReason = (string) ($tokenProperties['invalidReason'] ?? '');

        $actionMatches = $expectedAction === '' ? true : $actualAction === $expectedAction;
        $scorePasses = $score >= $threshold;

        if (!$valid || !$actionMatches || !$scorePasses) {
            Log::warning('reCAPTCHA Enterprise verification rejected', [
                'ip' => $request->ip(),
                'expected_action' => $expectedAction,
                'actual_action' => $actualAction,
                'score' => $score,
                'threshold' => $threshold,
                'invalid_reason' => $invalidReason,
                'reasons' => $riskAnalysis['reasons'] ?? [],
            ]);

            throw ValidationException::withMessages([
                'captcha' => 'Captcha verification failed. Please try again.',
            ]);
        }
    }
}
