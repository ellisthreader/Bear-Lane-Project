<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminSummaryService
{
    public function __construct(private readonly StoreSettingsService $settings)
    {
    }

    public function getSummary(): array
    {
        $inApp = fn (string $eventKey): bool => $this->settings->isAdminInAppNotificationEnabled($eventKey);

        $productSalesCount = 0;
        $productSalesValue = 0.0;
        $ordersNewCount = 0;
        if (Schema::hasTable('orders')) {
            $productSalesCount = (int) DB::table('orders')->count();
            $productSalesValue = (float) (DB::table('orders')->sum('total') ?? 0);
            $ordersNewCount = (int) DB::table('orders')
                ->where(function ($query) {
                    $query->whereNull('status')
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%paid%'])
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%pending%'])
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%process%'])
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%production%'])
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%packed%'])
                        ->orWhereRaw('LOWER(status) LIKE ?', ['%order placed%']);
                })
                ->count();
        }
        if (!$inApp('new_order')) {
            $ordersNewCount = 0;
        }

        $newLiveChats = 0;
        $openLiveChats = 0;
        if (Schema::hasTable('chats')) {
            $newLiveChats = (int) DB::table('chats')
                ->where('is_closed', false)
                ->where('admin_joined', false)
                ->count();

            $openLiveChats = (int) DB::table('chats')
                ->where('is_closed', false)
                ->count();
        }
        if (!$inApp('new_live_chat')) {
            $newLiveChats = 0;
        }

        $faqsSubmitted = Schema::hasTable('faq_requests')
            ? (int) DB::table('faq_requests')->count()
            : 0;

        $reviewsLeft = 0;
        if (Schema::hasTable('product_reviews')) {
            $reviewsLeft = (int) DB::table('product_reviews')->count();
        } elseif (Schema::hasTable('reviews')) {
            $reviewsLeft = (int) DB::table('reviews')->count();
        }

        $instantQuotes = Schema::hasTable('instant_quotes') && $inApp('instant_quote_generated')
            ? (int) DB::table('instant_quotes')->count()
            : 0;
        $quoteRequests = Schema::hasTable('quote_requests') && $inApp('quote_request_submitted')
            ? (int) DB::table('quote_requests')->count()
            : 0;

        $supportMessagesNotifications = 0;
        if (Schema::hasTable('support_messages')) {
            $supportMessagesNotifications = (int) DB::table('support_messages')
                ->whereNull('admin_read_at')
                ->where(function ($query) use ($inApp) {
                    $query->where(function ($inner) use ($inApp) {
                        if ($inApp('support_message_submitted')) {
                            $inner->where('source_type', 'support_form');
                        } else {
                            $inner->whereRaw('1 = 0');
                        }
                    })->orWhere(function ($inner) use ($inApp) {
                        if ($inApp('quote_request_submitted')) {
                            $inner->where('source_type', 'print_request');
                        } else {
                            $inner->whereRaw('1 = 0');
                        }
                    });
                })
                ->count();
        }

        $activeArticles = 0;
        $archivedArticles = 0;
        if (Schema::hasTable('help_articles')) {
            $activeArticles = (int) DB::table('help_articles')
                ->where('is_published', true)
                ->count();
            $archivedArticles = (int) DB::table('help_articles')
                ->where('is_published', false)
                ->count();
        }

        $faqQuestions = Schema::hasTable('faq_requests')
            ? (int) DB::table('faq_requests')->count()
            : 0;
        $publishedAnswers = 0;
        if (
            Schema::hasTable('faq_requests')
            && Schema::hasColumn('faq_requests', 'status')
            && Schema::hasColumn('faq_requests', 'is_public')
        ) {
            $publishedAnswers = (int) DB::table('faq_requests')
                ->where('status', 'answered')
                ->where('is_public', true)
                ->count();
        }

        $chatActive = 0;
        $chatInactive = 0;
        $chatArchived = 0;
        if (Schema::hasTable('chats')) {
            $chatActive = (int) DB::table('chats')
                ->where('is_closed', false)
                ->where(function ($query) {
                    $query->whereNull('is_archived')->orWhere('is_archived', false);
                })
                ->count();

            $chatInactive = (int) DB::table('chats')
                ->where('is_closed', true)
                ->where(function ($query) {
                    $query->whereNull('is_archived')->orWhere('is_archived', false);
                })
                ->count();

            if (Schema::hasColumn('chats', 'is_archived')) {
                $chatArchived = (int) DB::table('chats')
                    ->where('is_archived', true)
                    ->count();
            }
        }

        $activities = $this->buildActivityFeed($inApp);

        return [
            'product_sales_count' => $productSalesCount,
            'orders_total_count' => $productSalesCount,
            'orders_new_count' => $ordersNewCount,
            'product_sales_value' => round($productSalesValue, 2),
            'new_live_chats' => $newLiveChats,
            'open_live_chats' => $openLiveChats,
            'faqs_submitted' => $faqsSubmitted,
            'reviews_left' => $reviewsLeft,
            'quotes_generated' => $instantQuotes + $quoteRequests,
            'live_chat_notifications' => $newLiveChats,
            'support_messages_notifications' => $supportMessagesNotifications,
            'chat_active_count' => $chatActive,
            'chat_inactive_count' => $chatInactive,
            'chat_archived_count' => $chatArchived,
            'active_articles_count' => $activeArticles,
            'archived_articles_count' => $archivedArticles,
            'faq_published_answers_count' => $publishedAnswers,
            'faq_questions_count' => $faqQuestions,
            'activities' => $activities,
        ];
    }

    private function buildActivityFeed(callable $inApp): array
    {
        $activityRows = collect()
            ->merge($this->buildAdminActivityRows($inApp))
            ->merge($this->buildSystemActivityRows($inApp));

        return $activityRows
            ->filter(fn (array $row) => !empty($row['created_at']))
            ->sortByDesc('created_at')
            ->take(80)
            ->values()
            ->map(fn (array $row, int $index) => [
                'id' => "activity_{$index}_" . md5((string) ($row['type'] . '|' . $row['description'] . '|' . $row['created_at'])),
                ...$row,
            ])
            ->all();
    }

    private function buildAdminActivityRows(callable $inApp): array
    {
        if (!Schema::hasTable('admin_activity_logs')) {
            return [];
        }

        $rows = DB::table('admin_activity_logs')
            ->select(['activity_type', 'icon', 'title', 'description', 'admin_user_name', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(220)
            ->get();

        return $rows->map(function ($row) use ($inApp) {
            $activityType = (string) ($row->activity_type ?: 'admin_action');
            if ($activityType === 'order_status_updated' && !$inApp('order_status_changed')) {
                return null;
            }
            if ($activityType === 'order_return_updated' && !$inApp('return_status_changed')) {
                return null;
            }

            $description = trim((string) ($row->description ?? ''));
            $adminName = trim((string) ($row->admin_user_name ?? ''));

            if ($adminName !== '') {
                $description = $description !== ''
                    ? "{$description} • Admin: {$adminName}"
                    : "Admin: {$adminName}";
            }

            return [
                'type' => $activityType,
                'icon' => (string) ($row->icon ?: 'sparkles'),
                'title' => (string) ($row->title ?: 'Admin action'),
                'description' => $description,
                'created_at' => $row->created_at,
            ];
        })->filter()->values()->all();
    }

    private function buildSystemActivityRows(callable $inApp): array
    {
        $activityRows = collect();

        if (Schema::hasTable('chats') && $inApp('new_live_chat')) {
            $chats = DB::table('chats')
                ->select(['id', 'title', 'created_at', 'updated_at'])
                ->where('is_closed', false)
                ->where('admin_joined', false)
                ->orderByDesc('updated_at')
                ->limit(25)
                ->get();

            foreach ($chats as $chat) {
                $chatTitle = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
                $activityRows->push([
                    'type' => 'live_chat_new',
                    'icon' => 'message',
                    'title' => 'Live chat new',
                    'description' => $chatTitle,
                    'created_at' => $chat->updated_at ?: $chat->created_at,
                ]);
            }
        }

        if (Schema::hasTable('faq_requests') && $inApp('faq_request_submitted')) {
            $faqs = DB::table('faq_requests')
                ->select(['id', 'question', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(25)
                ->get();

            foreach ($faqs as $faq) {
                $activityRows->push([
                    'type' => 'faq_question_submitted',
                    'icon' => 'faq',
                    'title' => 'FAQ question submitted',
                    'description' => trim((string) ($faq->question ?: "FAQ #{$faq->id}")),
                    'created_at' => $faq->created_at,
                ]);
            }
        }

        if (Schema::hasTable('orders') && $inApp('new_order')) {
            $orders = DB::table('orders')
                ->select(['id', 'order_number', 'total', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(30)
                ->get();

            foreach ($orders as $order) {
                $label = $order->order_number ? "Order #{$order->order_number}" : "Order #{$order->id}";
                $activityRows->push([
                    'type' => 'order_placed',
                    'icon' => 'package',
                    'title' => 'Order placed',
                    'description' => $label . ' (£' . number_format((float) ($order->total ?? 0), 2) . ')',
                    'created_at' => $order->created_at,
                ]);
            }
        }

        if (Schema::hasTable('instant_quotes') && $inApp('instant_quote_generated')) {
            $quotes = DB::table('instant_quotes')
                ->select(['id', 'quote_number', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            foreach ($quotes as $quote) {
                $activityRows->push([
                    'type' => 'quote_generated',
                    'icon' => 'quote',
                    'title' => 'Instant quote generated',
                    'description' => $quote->quote_number ? "Quote #{$quote->quote_number}" : "Instant quote #{$quote->id}",
                    'created_at' => $quote->created_at,
                ]);
            }
        }

        if (Schema::hasTable('quote_requests') && $inApp('quote_request_submitted')) {
            $quoteRequests = DB::table('quote_requests')
                ->select(['id', 'name', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            foreach ($quoteRequests as $quoteRequest) {
                $activityRows->push([
                    'type' => 'quote_request',
                    'icon' => 'quote',
                    'title' => 'Quote request submitted',
                    'description' => trim((string) ($quoteRequest->name ?: "Quote request #{$quoteRequest->id}")),
                    'created_at' => $quoteRequest->created_at,
                ]);
            }
        }

        if (Schema::hasTable('support_messages') && $inApp('support_message_submitted')) {
            $supportMessages = DB::table('support_messages')
                ->select(['id', 'name', 'subject', 'created_at', 'source_type'])
                ->where('source_type', 'support_form')
                ->orderByDesc('created_at')
                ->limit(25)
                ->get();

            foreach ($supportMessages as $supportMessage) {
                $title = trim((string) ($supportMessage->subject ?: 'Support message'));
                $name = trim((string) ($supportMessage->name ?: "Message #{$supportMessage->id}"));
                $activityRows->push([
                    'type' => 'support_message_submitted',
                    'icon' => 'mail',
                    'title' => $title,
                    'description' => $name,
                    'created_at' => $supportMessage->created_at,
                ]);
            }
        }

        if (Schema::hasTable('return_requests') && $inApp('return_request_submitted')) {
            $returnRequests = DB::table('return_requests')
                ->select(['id', 'order_id', 'reason_code', 'created_at', 'requested_at'])
                ->orderByDesc(DB::raw('COALESCE(requested_at, created_at)'))
                ->limit(25)
                ->get();

            foreach ($returnRequests as $returnRequest) {
                $createdAt = $returnRequest->requested_at ?: $returnRequest->created_at;
                $reason = trim((string) ($returnRequest->reason_code ?: 'return request'));
                $activityRows->push([
                    'type' => 'return_request_submitted',
                    'icon' => 'alert',
                    'title' => 'Return request submitted',
                    'description' => "Return #{$returnRequest->id} for order #{$returnRequest->order_id} ({$reason})",
                    'created_at' => $createdAt,
                ]);
            }
        }

        if (Schema::hasTable('users') && $inApp('new_user_registered')) {
            $users = DB::table('users')
                ->select(['id', 'name', 'username', 'email', 'created_at'])
                ->where(function ($query) {
                    $query->whereNull('is_admin')
                        ->orWhere('is_admin', false);
                })
                ->orderByDesc('created_at')
                ->limit(25)
                ->get();

            foreach ($users as $user) {
                $name = trim((string) ($user->name ?: $user->username ?: $user->email ?: "User #{$user->id}"));
                $activityRows->push([
                    'type' => 'new_user_registered',
                    'icon' => 'user',
                    'title' => 'New user registered',
                    'description' => $name,
                    'created_at' => $user->created_at,
                ]);
            }
        }

        if (Schema::hasTable('product_reviews') && $inApp('new_review_submitted')) {
            $reviews = DB::table('product_reviews')
                ->select(['id', 'title', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            foreach ($reviews as $review) {
                $activityRows->push([
                    'type' => 'review_left',
                    'icon' => 'review',
                    'title' => 'Review left',
                    'description' => trim((string) ($review->title ?: "Review #{$review->id}")),
                    'created_at' => $review->created_at,
                ]);
            }
        } elseif (Schema::hasTable('reviews') && $inApp('new_review_submitted')) {
            $reviews = DB::table('reviews')
                ->select(['id', 'created_at'])
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            foreach ($reviews as $review) {
                $activityRows->push([
                    'type' => 'review_left',
                    'icon' => 'review',
                    'title' => 'Review left',
                    'description' => "Review #{$review->id}",
                    'created_at' => $review->created_at,
                ]);
            }
        }

        return $activityRows->all();
    }
}
