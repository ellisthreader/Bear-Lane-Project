<?php

namespace Tests\Unit;

use App\Services\OpenAiModerationService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAiModerationServiceTest extends TestCase
{
    public function test_it_blocks_clean_openai_result_when_local_spam_rule_matches(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => false,
                    'categories' => [],
                    'category_scores' => [],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('spam spam spam spam spam spam spam');

        $this->assertTrue($result['blocked']);
        $this->assertContains('spam/repeated-words', $result['matched_categories']);
        $this->assertContains('spam/repeated-words', $result['local_violations']);
    }

    public function test_it_retries_with_fallback_model_when_primary_model_is_unavailable(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'gpt-4o-mini-moderation');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::sequence()
                ->push([
                    'error' => [
                        'message' => 'The model `gpt-4o-mini-moderation` does not exist',
                        'code' => 'model_not_found',
                    ],
                ], 400)
                ->push([
                    'results' => [[
                        'flagged' => false,
                        'categories' => [],
                        'category_scores' => [],
                    ]],
                ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('Hello support');

        $this->assertFalse($result['blocked']);
        Http::assertSentCount(2);
    }

    public function test_it_detects_public_page_pii_violations(): void
    {
        $service = app(OpenAiModerationService::class);

        $violations = $service->detectPublicPageViolations(
            'Contact me at test@example.com or +44 7700 900123, I live on 10 High Street.'
        );

        $this->assertContains('pii/email', $violations);
        $this->assertContains('pii/phone', $violations);
        $this->assertContains('pii/address-cue', $violations);
    }

    public function test_it_blocks_obfuscated_drug_terms(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => false,
                    'categories' => [],
                    'category_scores' => [],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('I can source c0c.a!ne tonight.');

        $this->assertTrue($result['blocked']);
        $this->assertContains('drugs/illegal-substances', $result['matched_categories']);
    }

    public function test_it_blocks_obfuscated_hate_speech_terms(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => false,
                    'categories' => [],
                    'category_scores' => [],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('w.h1te p0wer forever');

        $this->assertTrue($result['blocked']);
        $this->assertContains('hate/racism', $result['matched_categories']);
    }

    public function test_it_blocks_pornography_terms(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => false,
                    'categories' => [],
                    'category_scores' => [],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('show me p0rn links');

        $this->assertTrue($result['blocked']);
        $this->assertContains('sexual/pornography', $result['matched_categories']);
    }

    public function test_it_blocks_common_drug_terms(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => false,
                    'categories' => [],
                    'category_scores' => [],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderate('where can i buy weed nearby');

        $this->assertTrue($result['blocked']);
        $this->assertContains('drugs/illegal-substances', $result['matched_categories']);
    }

    public function test_it_blocks_nsfw_image_content(): void
    {
        config()->set('services.openai.api_key', 'test-key');
        config()->set('services.openai.moderation_model', 'omni-moderation-latest');

        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [[
                    'flagged' => true,
                    'categories' => [
                        'sexual' => true,
                        'violence' => false,
                        'self-harm' => false,
                    ],
                    'category_scores' => [
                        'sexual' => 0.99,
                    ],
                ]],
            ], 200),
        ]);

        $service = app(OpenAiModerationService::class);
        $result = $service->moderateImageDataUrl('data:image/png;base64,ZmFrZQ==');

        $this->assertTrue($result['blocked']);
        $this->assertContains('sexual', $result['matched_categories']);

        Http::assertSent(function ($request) {
            $input = $request['input'] ?? [];
            return is_array($input)
                && (($input[0]['type'] ?? null) === 'image_url')
                && isset($input[0]['image_url']['url'])
                && str_starts_with((string) $input[0]['image_url']['url'], 'data:image/png;base64,');
        });
    }
}
