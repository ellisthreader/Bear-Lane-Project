<?php

namespace Tests\Unit;

use App\Services\Security\RecaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RecaptchaServiceTest extends TestCase
{
    public function test_it_falls_back_to_standard_verification_when_enterprise_rejects(): void
    {
        config()->set('services.recaptcha.provider', 'enterprise');
        config()->set('services.recaptcha.site_key', 'test-site-key');
        config()->set('services.recaptcha.enterprise_project_id', 'test-project');
        config()->set('services.recaptcha.enterprise_api_key', 'test-api-key');
        config()->set('services.recaptcha.secret', 'test-secret');
        config()->set('services.recaptcha.min_score', 0.5);

        Http::fake([
            'https://recaptchaenterprise.googleapis.com/*' => Http::response([
                'tokenProperties' => [
                    'valid' => false,
                    'invalidReason' => 'INVALID_REASON_UNSPECIFIED',
                    'action' => '',
                ],
                'riskAnalysis' => [
                    'score' => 0.0,
                    'reasons' => ['AUTOMATION'],
                ],
            ], 200),
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([
                'success' => true,
                'action' => 'signup',
                'score' => 0.9,
            ], 200),
        ]);

        $request = Request::create('/register', 'POST', ['recaptcha_token' => 'token-value']);
        $request->server->set('REMOTE_ADDR', '127.0.0.1');

        $service = app(RecaptchaService::class);
        $service->verifyOrFail($request, 'signup');

        Http::assertSentCount(2);
    }

    public function test_it_rejects_when_enterprise_fails_and_standard_fallback_is_unavailable(): void
    {
        $this->expectException(ValidationException::class);

        config()->set('services.recaptcha.provider', 'enterprise');
        config()->set('services.recaptcha.site_key', 'test-site-key');
        config()->set('services.recaptcha.enterprise_project_id', 'test-project');
        config()->set('services.recaptcha.enterprise_api_key', 'test-api-key');
        config()->set('services.recaptcha.secret', null);
        config()->set('services.recaptcha.min_score', 0.5);

        Http::fake([
            'https://recaptchaenterprise.googleapis.com/*' => Http::response([
                'tokenProperties' => [
                    'valid' => false,
                    'invalidReason' => 'INVALID_REASON_UNSPECIFIED',
                    'action' => '',
                ],
                'riskAnalysis' => [
                    'score' => 0.0,
                ],
            ], 200),
        ]);

        $request = Request::create('/register', 'POST', ['recaptcha_token' => 'token-value']);
        $request->server->set('REMOTE_ADDR', '127.0.0.1');

        $service = app(RecaptchaService::class);
        $service->verifyOrFail($request, 'signup');
    }
}
