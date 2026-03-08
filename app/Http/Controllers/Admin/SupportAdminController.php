<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\FaqRequest;
use App\Models\HelpArticle;
use App\Models\InstantQuote;
use App\Services\AdminActivityLogService;
use App\Services\AdminSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupportAdminController extends Controller
{
    private const IMAGE_PREFIX = '[image]';

    private const ARTICLE_CATEGORIES = [
        'general',
        'orders',
        'returns',
        'account',
        'payments',
        'technical',
        'privacy',
    ];

    public function __construct(
        private readonly AdminSummaryService $adminSummaryService,
        private readonly AdminActivityLogService $activityLogService
    )
    {
    }

    public function dashboard(): Response
    {
        return Inertia::render('Admin/AdminDashboard', [
            'summary' => $this->adminSummaryService->getSummary(),
        ]);
    }

    public function lookupQuote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'quote_number' => ['required', 'string', 'max:40'],
        ]);

        $quoteNumber = trim((string) $validated['quote_number']);

        $quote = InstantQuote::query()
            ->where('quote_number', $quoteNumber)
            ->latest('id')
            ->first();

        if (!$quote) {
            return response()->json([
                'success' => false,
                'message' => 'No quote found for that quote number.',
            ], 404);
        }

        $items = $quote->items;
        if (is_string($items) && $items !== '') {
            $decoded = json_decode($items, true);
            $items = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($items)) {
            $items = [];
        }

        return response()->json([
            'success' => true,
            'quote' => [
                'id' => $quote->id,
                'quote_number' => (string) $quote->quote_number,
                'name' => (string) $quote->name,
                'email' => (string) $quote->email,
                'total' => (float) ($quote->total ?? 0),
                'items' => $items,
                'created_at' => optional($quote->created_at)?->toIso8601String(),
            ],
        ]);
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Support/SupportDashboard', [
            'summary' => $this->adminSummaryService->getSummary(),
        ]);
    }

    public function data(): JsonResponse
    {
        $articles = collect();
        try {
            if (Schema::hasTable('help_articles')) {
                $articles = HelpArticle::query()
                    ->latest('updated_at')
                    ->limit(100)
                    ->get()
                    ->map(fn (HelpArticle $article) => $this->mapArticle($article))
                    ->values();
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        $faqRequests = collect();
        try {
            if (Schema::hasTable('faq_requests')) {
                $faqRequestQuery = FaqRequest::query()
                    ->with(['user:id,username,name', 'answerer:id,username,name'])
                    ->latest('created_at')
                    ->limit(150);

                if (
                    !Schema::hasColumn('faq_requests', 'answer')
                    || !Schema::hasColumn('faq_requests', 'answered_by')
                    || !Schema::hasColumn('faq_requests', 'answered_at')
                    || !Schema::hasColumn('faq_requests', 'is_public')
                ) {
                    $faqRequestQuery->select(['id', 'user_id', 'question', 'details', 'status', 'created_at', 'updated_at']);
                }

                $faqRequests = $faqRequestQuery
                    ->get()
                    ->map(fn (FaqRequest $faqRequest) => $this->mapFaqRequest($faqRequest))
                    ->values();
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        $chats = collect();
        try {
            if (Schema::hasTable('chats')) {
                $chats = Chat::query()
                    ->whereNotNull('title')
                    ->where('title', '!=', '')
                    ->with([
                        'user:id,username,name,email,avatar',
                        'latestMessage',
                    ])
                    ->withCount('messages')
                    ->latest('updated_at')
                    ->limit(120)
                    ->get()
                    ->map(fn (Chat $chat) => $this->mapChat($chat))
                    ->values();
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        return response()->json([
            'articles' => $articles,
            'faq_requests' => $faqRequests,
            'chats' => $chats,
            'summary' => $this->adminSummaryService->getSummary(),
        ]);
    }

    public function storeArticle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', 'string', 'in:' . implode(',', self::ARTICLE_CATEGORIES)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string', 'max:20000'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $isPublished = (bool) ($validated['is_published'] ?? true);
        $slug = $this->uniqueSlug((string) $validated['title']);

        $article = HelpArticle::query()->create([
            'title' => (string) $validated['title'],
            'slug' => $slug,
            'category' => (string) $validated['category'],
            'excerpt' => $validated['excerpt'] ?? null,
            'body' => (string) $validated['body'],
            'is_published' => $isPublished,
            'published_at' => $isPublished ? now() : null,
            'author_id' => $request->user()->id,
        ]);

        $this->activityLogService->logFromRequest(
            $request,
            'article_created',
            'New article made',
            "Created article '{$article->title}'",
            [
                'icon' => 'article',
                ...$this->activityLogService->modelContext($article, $article->title),
                'metadata' => [
                    'category' => $article->category,
                    'is_published' => (bool) $article->is_published,
                ],
            ]
        );

        return response()->json([
            'article' => $this->mapArticle($article),
        ], 201);
    }

    public function updateArticle(Request $request, HelpArticle $article): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'category' => ['sometimes', 'required', 'string', 'in:' . implode(',', self::ARTICLE_CATEGORIES)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['sometimes', 'required', 'string', 'max:20000'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $title = array_key_exists('title', $validated)
            ? (string) $validated['title']
            : $article->title;

        $isPublished = array_key_exists('is_published', $validated)
            ? (bool) $validated['is_published']
            : (bool) $article->is_published;

        $before = $article->only(['title', 'slug', 'category', 'excerpt', 'body', 'is_published']);

        $article->fill([
            'title' => $title,
            'slug' => $title !== $article->title ? $this->uniqueSlug($title, $article->id) : $article->slug,
            'category' => (string) ($validated['category'] ?? $article->category),
            'excerpt' => array_key_exists('excerpt', $validated) ? ($validated['excerpt'] ?: null) : $article->excerpt,
            'body' => (string) ($validated['body'] ?? $article->body),
            'is_published' => $isPublished,
            'published_at' => $isPublished
                ? ($article->published_at ?: now())
                : null,
            'author_id' => $request->user()->id,
        ]);
        $article->save();

        $changes = $this->activityLogService->extractChanges(
            $before,
            $article->only(['title', 'slug', 'category', 'excerpt', 'body', 'is_published']),
            [
                'title' => 'Title',
                'slug' => 'Slug',
                'category' => 'Category',
                'excerpt' => 'Excerpt',
                'body' => 'Body',
                'is_published' => 'Published',
            ]
        );

        $this->activityLogService->logFromRequest(
            $request,
            'article_edited',
            'Article edited',
            "'{$article->title}' article edited. " . $this->activityLogService->summarizeChanges($changes),
            [
                'icon' => 'article',
                ...$this->activityLogService->modelContext($article, $article->title),
                'metadata' => [
                    'changes' => $changes,
                ],
            ]
        );

        return response()->json([
            'article' => $this->mapArticle($article->fresh()),
        ]);
    }

    public function destroyArticle(Request $request, HelpArticle $article): JsonResponse
    {
        $label = $article->title ?: "Article #{$article->id}";
        $context = $this->activityLogService->modelContext($article, $label);
        $article->delete();

        $this->activityLogService->logFromRequest(
            $request,
            'article_deleted',
            'Article deleted',
            "Deleted article '{$label}'",
            [
                'icon' => 'article',
                ...$context,
            ]
        );

        return response()->json(['success' => true]);
    }

    public function answerFaq(Request $request, FaqRequest $faqRequest): JsonResponse
    {
        $before = $faqRequest->only(['status', 'answer', 'answered_by', 'answered_at', 'is_public']);

        $validated = $request->validate([
            'answer' => ['required', 'string', 'max:8000'],
            'is_public' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:pending,answered,rejected'],
        ]);

        $faqRequest->update([
            'answer' => (string) $validated['answer'],
            'answered_by' => $request->user()->id,
            'answered_at' => now(),
            'status' => (string) ($validated['status'] ?? 'answered'),
            'is_public' => (bool) ($validated['is_public'] ?? true),
        ]);

        $faqRequest->load(['user:id,username,name', 'answerer:id,username,name']);

        $changes = $this->activityLogService->extractChanges(
            $before,
            $faqRequest->only(['status', 'answer', 'answered_by', 'answered_at', 'is_public']),
            [
                'status' => 'Status',
                'answer' => 'Answer',
                'answered_by' => 'Answered by',
                'answered_at' => 'Answered at',
                'is_public' => 'Public',
            ]
        );

        $this->activityLogService->logFromRequest(
            $request,
            'faq_question_answered',
            'FAQ question answered',
            "Answered FAQ: '{$faqRequest->question}'. " . $this->activityLogService->summarizeChanges($changes),
            [
                'icon' => 'faq',
                ...$this->activityLogService->modelContext($faqRequest, $faqRequest->question),
                'metadata' => [
                    'changes' => $changes,
                    'asked_by_user_id' => $faqRequest->user_id,
                ],
            ]
        );

        return response()->json([
            'faq_request' => $this->mapFaqRequest($faqRequest),
        ]);
    }

    public function destroyFaq(Request $request, FaqRequest $faqRequest): JsonResponse
    {
        $label = $faqRequest->question ?: "FAQ #{$faqRequest->id}";
        $context = $this->activityLogService->modelContext($faqRequest, $label);
        $faqRequest->delete();

        $this->activityLogService->logFromRequest(
            $request,
            'faq_deleted',
            'FAQ question deleted',
            "Deleted FAQ question '{$label}'",
            [
                'icon' => 'faq',
                ...$context,
            ]
        );

        return response()->json(['success' => true]);
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        if ($base === '') {
            $base = 'help-article';
        }

        $slug = $base;
        $suffix = 1;

        while (
            HelpArticle::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function mapArticle(HelpArticle $article): array
    {
        return [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'category' => $article->category,
            'excerpt' => $article->excerpt,
            'body' => $article->body,
            'is_published' => (bool) $article->is_published,
            'published_at' => optional($article->published_at)?->toIso8601String(),
            'updated_at' => optional($article->updated_at)?->toIso8601String(),
        ];
    }

    private function mapFaqRequest(FaqRequest $faqRequest): array
    {
        $askerName = $faqRequest->user?->name ?: $faqRequest->user?->username ?: 'Unknown user';
        $answererName = $faqRequest->answerer?->name ?: $faqRequest->answerer?->username;
        $hasAnswerColumns = Schema::hasColumn('faq_requests', 'answer')
            && Schema::hasColumn('faq_requests', 'is_public')
            && Schema::hasColumn('faq_requests', 'answered_by')
            && Schema::hasColumn('faq_requests', 'answered_at');

        return [
            'id' => $faqRequest->id,
            'question' => $faqRequest->question,
            'details' => $faqRequest->details,
            'answer' => $hasAnswerColumns ? $faqRequest->answer : null,
            'status' => $faqRequest->status,
            'is_public' => $hasAnswerColumns ? (bool) $faqRequest->is_public : false,
            'asked_by' => [
                'id' => $faqRequest->user_id,
                'name' => $askerName,
            ],
            'answered_by' => $hasAnswerColumns && $faqRequest->answered_by
                ? [
                    'id' => $faqRequest->answered_by,
                    'name' => $answererName,
                ]
                : null,
            'created_at' => optional($faqRequest->created_at)?->toIso8601String(),
            'answered_at' => $hasAnswerColumns ? optional($faqRequest->answered_at)?->toIso8601String() : null,
        ];
    }

    private function mapChat(Chat $chat): array
    {
        $participantName = $chat->user?->name ?: $chat->user?->username ?: 'Guest';
        $latestMessage = $chat->latestMessage;
        $latestImageUrl = null;
        if ($latestMessage) {
            $trimmed = trim((string) $latestMessage->content);
            if (str_starts_with($trimmed, self::IMAGE_PREFIX)) {
                $candidate = trim(substr($trimmed, strlen(self::IMAGE_PREFIX)));
                if ($candidate !== '') {
                    $latestImageUrl = $candidate;
                }
            }
        }
        $title = trim((string) ($chat->title ?? ''));

        if ($title === '' && $latestMessage && in_array($latestMessage->sender_type, ['guest', 'user'], true)) {
            $title = 'Customer: ' . Str::limit(trim((string) $latestMessage->content), 56, '...');
        }

        if ($title === '') {
            $title = "Chat #{$chat->id}";
        }

        return [
            'id' => $chat->id,
            'title' => $title,
            'participant' => $participantName,
            'participant_details' => [
                'id' => $chat->user?->id,
                'name' => $chat->user?->name,
                'username' => $chat->user?->username,
                'email' => $chat->user?->email,
                'avatar' => $chat->user?->avatar,
                'is_guest' => $chat->user_id === null,
                'session_id' => $chat->session_id,
            ],
            'is_closed' => (bool) $chat->is_closed,
            'is_archived' => (bool) ($chat->is_archived ?? false),
            'archived_at' => optional($chat->archived_at)?->toIso8601String(),
            'deleted_by' => $chat->deleted_by,
            'admin_joined' => (bool) $chat->admin_joined,
            'message_count' => (int) ($chat->messages_count ?? 0),
            'session_id' => $chat->session_id,
            'updated_at' => optional($chat->updated_at)?->toIso8601String(),
            'latest_message' => $latestMessage ? [
                'id' => $latestMessage->id,
                'sender_type' => $latestMessage->sender_type,
                'is_image' => $latestImageUrl !== null,
                'image_url' => $latestImageUrl,
                'content' => $latestImageUrl ? 'Image attachment' : $latestMessage->content,
                'created_at' => optional($latestMessage->created_at)?->toIso8601String(),
            ] : null,
        ];
    }
}
