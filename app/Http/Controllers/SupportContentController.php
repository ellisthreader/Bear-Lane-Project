<?php

namespace App\Http\Controllers;

use App\Models\FaqRequest;
use App\Models\HelpArticle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class SupportContentController extends Controller
{
    public function helpCentre(): Response
    {
        return Inertia::render('Help/HelpCentre', [
            'support_articles' => $this->publishedArticles(),
        ]);
    }

    public function search(Request $request): Response
    {
        return Inertia::render('Help/HelpSearchResults', [
            'q' => (string) $request->query('q', ''),
            'support_articles' => $this->publishedArticles(),
        ]);
    }

    public function faq(): Response
    {
        $communityFaqs = collect();

        if (
            Schema::hasTable('faq_requests')
            && Schema::hasColumn('faq_requests', 'answer')
            && Schema::hasColumn('faq_requests', 'is_public')
        ) {
            $communityFaqs = FaqRequest::query()
                ->where('status', 'answered')
                ->where('is_public', true)
                ->whereNotNull('answer')
                ->latest('answered_at')
                ->limit(100)
                ->get()
                ->map(fn (FaqRequest $faq) => [
                    'id' => $faq->id,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                    'created_at' => optional($faq->answered_at ?: $faq->updated_at)?->toIso8601String(),
                ])
                ->values();
        }

        return Inertia::render('Help/FAQ', [
            'community_faqs' => $communityFaqs,
        ]);
    }

    public function article(string $slug): Response
    {
        abort_unless(Schema::hasTable('help_articles'), 404);

        $article = HelpArticle::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return Inertia::render('Help/HelpArticle', [
            'article' => [
                'id' => $article->id,
                'title' => $article->title,
                'slug' => $article->slug,
                'category' => $article->category,
                'excerpt' => $article->excerpt,
                'body' => $article->body,
                'published_at' => optional($article->published_at)?->toIso8601String(),
            ],
        ]);
    }

    private function publishedArticles(): array
    {
        if (!Schema::hasTable('help_articles')) {
            return [];
        }

        return HelpArticle::query()
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->map(fn (HelpArticle $article) => [
                'id' => $article->id,
                'title' => $article->title,
                'slug' => $article->slug,
                'category' => $article->category,
                'excerpt' => $article->excerpt,
                'body' => $article->body,
                'published_at' => optional($article->published_at)?->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}
