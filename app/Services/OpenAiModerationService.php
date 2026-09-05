<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Client\ConnectionException;
use RuntimeException;

class OpenAiModerationService
{
    public const FLAGGED_WARNING_MESSAGE = "Please keep your language respectful. I’m here to help, but I cannot assist with abusive or inappropriate content.";
    public const IMAGE_FLAGGED_WARNING_PREFIX = 'Image was not appropraite:';

    /**
     * Categories required by chat policy.
     */
    private const POLICY_CATEGORY_KEYS = [
        'profanity',
        'harassment',
        'harassment/threatening',
        'hate',
        'hate/threatening',
        'sexual',
        'sexual/minors',
        'violence',
        'violence/graphic',
        'self-harm',
        'self-harm/intent',
        'self-harm/instructions',
        'illicit',
        'illicit/violent',
    ];

    /**
     * Heuristic local policy checks for spam, malicious links, and illegal/threat content.
     */
    private const LOCAL_POLICY_PATTERNS = [
        'spam/repeated-characters' => '/([a-z0-9])\1{7,}/i',
        'spam/repeated-punctuation' => '/([!?.,])\1{6,}/',
        'spam/repeated-words' => '/\b(\w{2,})\b(?:\s+\1\b){5,}/i',
        'spam/excessive-links' => '/(?:https?:\/\/|www\.)\S+(?:.*(?:https?:\/\/|www\.)\S+){2,}/i',
        'security/malicious-link-scheme' => '/(?:javascript:|data:text\/html|vbscript:)/i',
        'security/suspicious-link-keywords' => '/\b(?:phishing|credential\s*harvest|malware|trojan|ransomware|keylogger|botnet)\b/i',
        'illegal-content' => '/\b(?:how to make a bomb|buy illegal drugs|fake passport|counterfeit|human trafficking)\b/i',
        'violence/threatening-language' => '/\b(?:i will kill|i\'ll kill|shoot you|stab you|burn your house)\b/i',
        'drugs/illegal-substances' => '/\b(?:drug(?:s)?|cocaine|heroin|meth(?:amphetamine)?|fentanyl|crack|ecstasy|mdma|ketamine|lsd|weed|cannabis|marijuana|hash|shrooms|psilocybin)\b/i',
        'sexual/pornography' => '/\b(?:porn|pornography|xxx|nsfw|onlyfans|adult video|sex tape|nudes?)\b/i',
        'hate/racism' => '/\b(?:white power|racially inferior|ethnic cleansing|go back to your country|heil hitler|nazi propaganda)\b/i',
        'illegal-activities' => '/\b(?:money laundering|tax evasion|identity theft|fake id|forged documents|credit card fraud)\b/i',
    ];

    /**
     * Public page PII checks (FAQ/reviews etc. - not live chat).
     */
    private const PUBLIC_PAGE_PII_PATTERNS = [
        'pii/email' => '/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i',
        'pii/phone' => '/(?<!\d)(?:\+?\d[\d\-\s().]{7,}\d)(?!\d)/',
        'pii/payment-card' => '/\b(?:\d[ -]*?){13,19}\b/',
        'pii/ni-or-ssn' => '/\b(?:[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]?|\d{3}-\d{2}-\d{4})\b/i',
        'pii/address-cue' => '/\b(?:street|st\.|road|rd\.|avenue|ave\.|postcode|zip code|apartment|flat)\b/i',
    ];

    /**
     * Obfuscation-resilient term checks (dots, symbol substitution, omitted vowels).
     */
    private const OBFUSCATED_TERM_GROUPS = [
        'drugs/illegal-substances' => [
            'drug', 'drugs', 'cocaine', 'heroin', 'meth', 'methamphetamine', 'fentanyl', 'crack', 'ecstasy', 'mdma', 'ketamine', 'lsd',
            'weed', 'cannabis', 'marijuana', 'hash', 'shrooms', 'psilocybin',
        ],
        'illegal-activities' => [
            'money laundering', 'tax evasion', 'identity theft', 'fake passport', 'fake id', 'forged documents', 'counterfeit',
        ],
        'sexual/pornography' => [
            'porn', 'pornography', 'xxx', 'nsfw', 'adult video', 'nudes', 'sex tape', 'onlyfans',
        ],
        'hate/racism' => [
            'white power', 'racially inferior', 'ethnic cleansing', 'heil hitler', 'nazi propaganda',
        ],
    ];

    /**
     * Human-readable labels for moderation tags returned by OpenAI/local checks.
     */
    private const VIOLATION_REASON_LABELS = [
        'harassment' => 'harassment or abusive language',
        'harassment/threatening' => 'threatening or abusive language',
        'hate' => 'hate speech',
        'hate/threatening' => 'threatening hate speech',
        'sexual' => 'sexual content',
        'sexual/minors' => 'sexual content involving minors',
        'violence' => 'violent content',
        'violence/graphic' => 'graphic violence',
        'self-harm' => 'self-harm content',
        'self-harm/intent' => 'self-harm intent',
        'self-harm/instructions' => 'self-harm instructions',
        'illicit' => 'illicit or illegal content',
        'illicit/violent' => 'violent illicit or illegal content',
        'spam/repeated-characters' => 'spam-like repeated characters',
        'spam/repeated-punctuation' => 'spam-like repeated punctuation',
        'spam/repeated-words' => 'spam-like repeated words',
        'spam/excessive-links' => 'spam-like excessive links',
        'security/malicious-link-scheme' => 'malicious link patterns',
        'security/suspicious-link-keywords' => 'security threat keywords',
        'illegal-content' => 'illegal content',
        'violence/threatening-language' => 'violent threats',
        'drugs/illegal-substances' => 'drug-related content',
        'sexual/pornography' => 'pornographic content',
        'hate/racism' => 'hate speech or racism',
        'illegal-activities' => 'illegal activities',
        'pii/email' => 'personal email information',
        'pii/phone' => 'personal phone information',
        'pii/payment-card' => 'payment card information',
        'pii/ni-or-ssn' => 'personal identification information',
        'pii/address-cue' => 'personal address details',
    ];

    /**
     * @return array{
     *   blocked: bool,
     *   flagged: bool,
     *   matched_categories: array<int, string>,
     *   categories: array<string, mixed>,
     *   category_scores: array<string, mixed>
     * }
     */
    public function moderate(string $input): array
    {
        return $this->moderateInput($input, $input);
    }

    /**
     * Moderate uploaded image content using a data URL payload.
     *
     * @return array{
     *   blocked: bool,
     *   flagged: bool,
     *   matched_categories: array<int, string>,
     *   local_violations: array<int, string>,
     *   categories: array<string, mixed>,
     *   category_scores: array<string, mixed>
     * }
     */
    public function moderateImageDataUrl(string $imageDataUrl, ?string $context = null): array
    {
        $input = [[
            'type' => 'image_url',
            'image_url' => [
                'url' => $imageDataUrl,
            ],
        ]];

        if ($context !== null && trim($context) !== '') {
            $input[] = [
                'type' => 'text',
                'text' => trim($context),
            ];
        }

        return $this->moderateInput($input, $context ?? '');
    }

    /**
     * @param string|array<int, mixed> $input
     * @return array{
     *   blocked: bool,
     *   flagged: bool,
     *   matched_categories: array<int, string>,
     *   local_violations: array<int, string>,
     *   categories: array<string, mixed>,
     *   category_scores: array<string, mixed>
     * }
     */
    private function moderateInput(string|array $input, string $textForLocalChecks = ''): array
    {
        $apiKey = trim((string) config('services.openai.api_key'));
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API key is missing (OPENAI_API_KEY).');
        }

        $configuredModel = trim((string) config('services.openai.moderation_model', 'omni-moderation-latest'));
        $timeout = (int) config('services.openai.timeout', 10);

        $isImagePayload = is_array($input);
        $modelsToTry = $isImagePayload
            ? array_values(array_unique(array_filter([
                // Image moderation is most reliable on omni-moderation-latest.
                'omni-moderation-latest',
                $configuredModel !== '' ? $configuredModel : null,
            ])))
            : array_values(array_unique(array_filter([
                $configuredModel !== '' ? $configuredModel : null,
                // Resilient fallback if a configured model alias is unavailable.
                'omni-moderation-latest',
            ])));

        $lastError = 'Unknown moderation error.';
        foreach ($modelsToTry as $model) {
            try {
                $response = $this->requestModeration($apiKey, $model, $input, $timeout);
            } catch (ConnectionException $exception) {
                $lastError = 'network/connection failure: ' . $exception->getMessage();
                Log::warning('OpenAI moderation connection failed, trying fallback model', [
                    'attempted_model' => $model,
                    'error' => $exception->getMessage(),
                ]);
                continue;
            } catch (\Throwable $exception) {
                $lastError = $exception->getMessage();
                Log::warning('OpenAI moderation transport failed, trying fallback model', [
                    'attempted_model' => $model,
                    'error' => $exception->getMessage(),
                ]);
                continue;
            }

            if ($response->successful()) {
                return $this->parseModerationResult($response, $textForLocalChecks);
            }

            $status = $response->status();
            $errorMessage = (string) ($response->json('error.message') ?: '');
            $errorCode = (string) ($response->json('error.code') ?: '');
            $lastError = "status {$status}" . ($errorCode !== '' ? ", code {$errorCode}" : '') . ($errorMessage !== '' ? ", {$errorMessage}" : '');

            if (in_array($status, [401, 403], true)) {
                throw new RuntimeException(sprintf(
                    'OpenAI moderation authentication failed: %s',
                    $lastError
                ));
            }

            // Retry/fallback for transient provider failures.
            if ($status === 408 || $status === 409 || $status === 429 || $status >= 500) {
                Log::warning('OpenAI moderation transient failure, trying fallback model', [
                    'attempted_model' => $model,
                    'status' => $status,
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage,
                ]);
                continue;
            }

            $isModelIssue = $status === 400 && (
                str_contains(strtolower($errorCode), 'model')
                || str_contains(strtolower($errorMessage), 'model')
                || str_contains(strtolower($errorMessage), 'unavailable')
            );
            $isCompatibilityIssue = $status === 400 && (
                str_contains(strtolower($errorMessage), 'unsupported')
                || str_contains(strtolower($errorMessage), 'image')
                || str_contains(strtolower($errorMessage), 'input type')
                || str_contains(strtolower($errorMessage), 'invalid input')
            );

            if ($isModelIssue || $isCompatibilityIssue) {
                Log::warning('OpenAI moderation model unavailable/incompatible, trying fallback model', [
                    'attempted_model' => $model,
                    'status' => $status,
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage,
                ]);
                continue;
            }

            throw new RuntimeException(sprintf(
                'OpenAI moderation request failed: %s',
                $lastError
            ));
        }

        throw new RuntimeException(sprintf(
            'OpenAI moderation request failed after fallback attempts: %s',
            $lastError
        ));
    }

    /**
     * @param string|array<int, mixed> $input
     */
    private function requestModeration(string $apiKey, string $model, string|array $input, int $timeout): Response
    {
        return Http::retry(
            3,
            fn (int $attempt) => $attempt * 250,
            function (\Throwable $exception, $request) {
                if ($exception instanceof ConnectionException) {
                    return true;
                }

                $response = method_exists($exception, 'response') ? $exception->response : null;
                $status = $response?->status();
                return in_array($status, [408, 409, 429], true) || ($status !== null && $status >= 500);
            },
            throw: false
        )
            ->timeout(max($timeout, 1))
            ->acceptJson()
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/moderations', [
                'model' => $model,
                'input' => $input,
            ]);
    }

    /**
     * @return array{
     *   blocked: bool,
     *   flagged: bool,
     *   matched_categories: array<int, string>,
     *   local_violations: array<int, string>,
     *   categories: array<string, mixed>,
     *   category_scores: array<string, mixed>
     * }
     */
    private function parseModerationResult(Response $response, string $input): array
    {
        $result = $response->json('results.0');
        if (!is_array($result)) {
            throw new RuntimeException('OpenAI moderation response was missing results[0].');
        }

        $categories = is_array($result['categories'] ?? null) ? $result['categories'] : [];
        $categoryScores = is_array($result['category_scores'] ?? null) ? $result['category_scores'] : [];
        $flagged = (bool) ($result['flagged'] ?? false);

        $matchedCategories = [];
        foreach (self::POLICY_CATEGORY_KEYS as $key) {
            if (!empty($categories[$key])) {
                $matchedCategories[] = $key;
            }
        }
        $localViolations = $this->detectLocalPolicyViolations($input);
        $allMatchedCategories = array_values(array_unique([
            ...$matchedCategories,
            ...$localViolations,
        ]));

        return [
            'blocked' => $flagged || $allMatchedCategories !== [],
            'flagged' => $flagged,
            'matched_categories' => $allMatchedCategories,
            'local_violations' => $localViolations,
            'categories' => $categories,
            'category_scores' => $categoryScores,
        ];
    }

    /**
     * Public-page only checks (FAQ, reviews, etc.) for PII and unsafe text.
     *
     * @return array<int, string>
     */
    public function detectPublicPageViolations(string $input): array
    {
        $text = trim($input);
        if ($text === '') {
            return [];
        }

        $violations = $this->detectLocalPolicyViolations($text);
        foreach (self::PUBLIC_PAGE_PII_PATTERNS as $tag => $pattern) {
            if (preg_match($pattern, $text) === 1) {
                $violations[] = $tag;
            }
        }

        return array_values(array_unique($violations));
    }

    /**
     * @return array<int, string>
     */
    private function detectLocalPolicyViolations(string $input): array
    {
        $text = trim($input);
        if ($text === '') {
            return [];
        }

        $violations = [];
        foreach (self::LOCAL_POLICY_PATTERNS as $tag => $pattern) {
            if (preg_match($pattern, $text) === 1) {
                $violations[] = $tag;
            }
        }
        foreach ($this->detectObfuscatedTermViolations($text) as $tag) {
            $violations[] = $tag;
        }

        return array_values(array_unique($violations));
    }

    /**
     * @return array<int, string>
     */
    private function detectObfuscatedTermViolations(string $input): array
    {
        $normalized = $this->normalizeForEvasionDetection($input);
        if ($normalized === '') {
            return [];
        }

        $compact = preg_replace('/[^a-z0-9]+/', '', $normalized) ?: '';
        $compactNoVowels = preg_replace('/[aeiou]+/', '', $compact) ?: '';
        $violations = [];

        foreach (self::OBFUSCATED_TERM_GROUPS as $tag => $terms) {
            foreach ($terms as $term) {
                $termNormalized = $this->normalizeForEvasionDetection($term);
                $termCompact = preg_replace('/[^a-z0-9]+/', '', $termNormalized) ?: '';
                if ($termCompact === '') {
                    continue;
                }

                $termNoVowels = preg_replace('/[aeiou]+/', '', $termCompact) ?: '';

                if (
                    str_contains($compact, $termCompact)
                    || ($termNoVowels !== '' && str_contains($compactNoVowels, $termNoVowels))
                ) {
                    $violations[] = $tag;
                    break;
                }
            }
        }

        return array_values(array_unique($violations));
    }

    private function normalizeForEvasionDetection(string $input): string
    {
        $lower = strtolower(trim($input));
        if ($lower === '') {
            return '';
        }

        // Common leetspeak / character substitutions.
        $lower = strtr($lower, [
            '@' => 'a',
            '4' => 'a',
            '3' => 'e',
            '1' => 'i',
            '!' => 'i',
            '|' => 'i',
            '0' => 'o',
            '$' => 's',
            '5' => 's',
            '7' => 't',
            '+' => 't',
            '8' => 'b',
            '9' => 'g',
            '2' => 'z',
        ]);

        // Keep alnum/separators; flatten noisy punctuation used for bypass.
        $lower = preg_replace('/[^a-z0-9\s]+/', ' ', $lower) ?: '';
        $lower = preg_replace('/\s+/', ' ', $lower) ?: '';

        return trim($lower);
    }

    public function logFlaggedMessage(string $input, array $moderation, array $context = []): void
    {
        Log::warning('chat.moderation.flagged', [
            'message_hash' => hash('sha256', $input),
            'message_length' => mb_strlen($input),
            'matched_categories' => $moderation['matched_categories'] ?? [],
            'local_violations' => $moderation['local_violations'] ?? [],
            'categories' => $moderation['categories'] ?? [],
            'category_scores' => $moderation['category_scores'] ?? [],
            ...$context,
        ]);
    }

    public function summarizeViolationReason(array $moderation): string
    {
        $matched = array_values(array_unique(array_filter(
            $moderation['matched_categories'] ?? [],
            fn ($value) => is_string($value) && trim($value) !== ''
        )));

        if ($matched === []) {
            return 'content policy restrictions';
        }

        $first = $matched[0];
        return self::VIOLATION_REASON_LABELS[$first] ?? str_replace(['/', '-'], [' ', ' '], $first);
    }
}
