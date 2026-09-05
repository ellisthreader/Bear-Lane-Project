<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductReview;
use App\Models\ReturnRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AdminStatisticsController extends Controller
{
    private const TIMEZONE = 'Europe/London';

    private const METRIC_META = [
        'total_revenue' => [
            'title' => 'Total Revenue',
            'subtitle' => 'Track gross sales, top transactions, and revenue split by order status.',
        ],
        'total_users' => [
            'title' => 'Total Users',
            'subtitle' => 'Track signups, conversion to orders, and most valuable new users.',
        ],
        'total_orders' => [
            'title' => 'Total Orders',
            'subtitle' => 'Track volume, order status distribution, and highest value orders.',
        ],
        'net_profit' => [
            'title' => 'Net Profit',
            'subtitle' => 'Track revenue minus refunds and fees with a daily breakdown.',
        ],
        'best_selling_products' => [
            'title' => 'Best Selling Products',
            'subtitle' => 'Track top products by units sold, revenue, and order volume.',
        ],
        'reviews' => [
            'title' => 'Reviews',
            'subtitle' => 'Track review volume, average rating, sentiment distribution, and recent feedback.',
        ],
    ];

    public function index(Request $request): Response
    {
        $range = $this->resolveRange($request);
        $analytics = $this->buildAnalytics($range['start_utc'], $range['end_utc'], $range['start_london'], $range['end_london']);

        return Inertia::render('Admin/Statistics', [
            'initial_range' => $range['range'],
            'initial_date_from' => $range['date_from'],
            'initial_date_to' => $range['date_to'],
            'analytics' => $analytics,
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $range = $this->resolveRange($request);
        $analytics = $this->buildAnalytics($range['start_utc'], $range['end_utc'], $range['start_london'], $range['end_london']);

        return response()->json([
            'range' => $range['range'],
            'date_from' => $range['date_from'],
            'date_to' => $range['date_to'],
            'analytics' => $analytics,
        ]);
    }

    public function showMetric(Request $request, string $metric): Response
    {
        $metric = $this->assertMetric($metric);
        $range = $this->resolveRange($request);
        $detail = $this->buildMetricDetail($metric, $range['start_utc'], $range['end_utc'], $range['start_london'], $range['end_london']);

        return Inertia::render('Admin/StatisticsMetric', [
            'metric' => $metric,
            'title' => self::METRIC_META[$metric]['title'],
            'subtitle' => self::METRIC_META[$metric]['subtitle'],
            'initial_range' => $range['range'],
            'initial_date_from' => $range['date_from'],
            'initial_date_to' => $range['date_to'],
            'detail' => $detail,
        ]);
    }

    public function metricData(Request $request, string $metric): JsonResponse
    {
        $metric = $this->assertMetric($metric);
        $range = $this->resolveRange($request);
        $detail = $this->buildMetricDetail($metric, $range['start_utc'], $range['end_utc'], $range['start_london'], $range['end_london']);

        return response()->json([
            'metric' => $metric,
            'title' => self::METRIC_META[$metric]['title'],
            'subtitle' => self::METRIC_META[$metric]['subtitle'],
            'range' => $range['range'],
            'date_from' => $range['date_from'],
            'date_to' => $range['date_to'],
            'detail' => $detail,
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $validated = $request->validate([
            'range' => ['nullable', 'string', 'in:today,week,month,year,custom'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $range = (string) ($validated['range'] ?? 'month');
        $nowLondon = Carbon::now(self::TIMEZONE);

        if ($range === 'custom') {
            $from = trim((string) ($validated['date_from'] ?? ''));
            $to = trim((string) ($validated['date_to'] ?? ''));

            if ($from === '' || $to === '') {
                $startLondon = $nowLondon->copy()->startOfMonth();
                $endLondon = $nowLondon->copy()->endOfDay();
                $range = 'month';
                $from = $startLondon->toDateString();
                $to = $endLondon->toDateString();
            } else {
                $startLondon = Carbon::createFromFormat('Y-m-d', $from, self::TIMEZONE)->startOfDay();
                $endLondon = Carbon::createFromFormat('Y-m-d', $to, self::TIMEZONE)->endOfDay();

                if ($startLondon->gt($endLondon)) {
                    [$startLondon, $endLondon] = [$endLondon->copy()->startOfDay(), $startLondon->copy()->endOfDay()];
                }

                if ($startLondon->diffInDays($endLondon) > 365) {
                    $endLondon = $startLondon->copy()->addDays(365)->endOfDay();
                }

                $from = $startLondon->toDateString();
                $to = $endLondon->toDateString();
            }
        } else {
            if ($range === 'today') {
                $startLondon = $nowLondon->copy()->startOfDay();
                $endLondon = $nowLondon->copy()->endOfDay();
            } elseif ($range === 'week') {
                $startLondon = $nowLondon->copy()->startOfWeek(Carbon::MONDAY);
                $endLondon = $nowLondon->copy()->endOfWeek(Carbon::SUNDAY);
            } elseif ($range === 'year') {
                $startLondon = $nowLondon->copy()->startOfYear();
                $endLondon = $nowLondon->copy()->endOfYear();
            } else {
                $range = 'month';
                $startLondon = $nowLondon->copy()->startOfMonth();
                $endLondon = $nowLondon->copy()->endOfMonth();
            }

            $from = $startLondon->toDateString();
            $to = $endLondon->toDateString();
        }

        return [
            'range' => $range,
            'date_from' => $from,
            'date_to' => $to,
            'start_london' => $startLondon,
            'end_london' => $endLondon,
            'start_utc' => $startLondon->copy()->utc(),
            'end_utc' => $endLondon->copy()->utc(),
        ];
    }

    private function buildAnalytics(
        Carbon $startUtc,
        Carbon $endUtc,
        Carbon $startLondon,
        Carbon $endLondon
    ): array {
        $orders = $this->loadOrders($startUtc, $endUtc);
        $nonCancelledOrders = $orders->filter(fn (Order $order) => !$this->isCancelledStatus($order->status))->values();
        $refunds = $this->loadRefunds($startUtc, $endUtc);

        $totalRevenue = round((float) $nonCancelledOrders->sum(fn (Order $order) => (float) ($order->total ?? 0)), 2);
        $totalUsers = (int) User::query()->whereBetween('created_at', [$startUtc, $endUtc])->count();
        $totalOrders = (int) $orders->count();
        $totalRefunded = round((float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->refund_amount ?? 0)), 2);
        $totalFees = round((float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->stripe_fee_amount ?? 0)), 2);
        $netProfit = round($totalRevenue - $totalRefunded - $totalFees, 2);

        $dailyRevenue = [];
        foreach ($nonCancelledOrders as $order) {
            $dayKey = Carbon::parse($order->created_at)->timezone(self::TIMEZONE)->toDateString();
            $dailyRevenue[$dayKey] = ($dailyRevenue[$dayKey] ?? 0) + (float) ($order->total ?? 0);
        }

        $dailyOrders = [];
        foreach ($orders as $order) {
            $dayKey = Carbon::parse($order->created_at)->timezone(self::TIMEZONE)->toDateString();
            $dailyOrders[$dayKey] = ($dailyOrders[$dayKey] ?? 0) + 1;
        }

        $timeline = $this->buildTimeline($startLondon, $endLondon, $dailyRevenue, $dailyOrders);

        $bestSellingProducts = $this->buildBestSellingProducts($startUtc, $endUtc, 10);
        $topProduct = $bestSellingProducts[0] ?? null;
        $reviewStats = $this->buildReviewStats($startUtc, $endUtc, 10, 12);

        $recentTransactions = $orders
            ->take(12)
            ->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => (string) ($order->order_number ?: "ORD-{$order->id}"),
                    'customer_name' => $this->resolveOrderCustomerName($order),
                    'customer_email' => (string) ($order->email ?: ($order->user?->email ?? '')),
                    'amount' => round((float) ($order->total ?? 0), 2),
                    'status' => (string) ($order->status ?: 'pending'),
                    'created_at' => optional($order->created_at)?->toIso8601String(),
                    'payment_reference' => $order->payment_intent_id,
                    'archived_at' => optional($order->archived_at)?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $recentRefunds = $refunds
            ->take(10)
            ->map(function (ReturnRequest $refund) {
                $order = $refund->order;
                $user = $order?->user;
                $name = trim((string) (($order?->first_name ?: '') . ' ' . ($order?->last_name ?: '')));
                if ($name === '') {
                    $name = (string) ($user?->name ?: ($user?->username ?: ($order?->email ?: 'Guest customer')));
                }

                return [
                    'id' => $refund->id,
                    'order_number' => (string) ($order?->order_number ?: 'N/A'),
                    'customer_name' => $name,
                    'customer_email' => (string) ($order?->email ?: ($user?->email ?? '')),
                    'amount' => round((float) ($refund->refund_amount ?? 0), 2),
                    'currency' => strtoupper((string) ($refund->stripe_refund_currency ?: 'GBP')),
                    'fees' => round((float) ($refund->stripe_fee_amount ?? 0), 2),
                    'stripe_refund_id' => (string) ($refund->stripe_refund_id ?: ''),
                    'refunded_at' => optional($refund->refunded_at)?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $topCustomers = $this->buildTopCustomers($nonCancelledOrders);

        return [
            'cards' => [
                'total_revenue' => $totalRevenue,
                'total_users' => $totalUsers,
                'total_orders' => $totalOrders,
                'net_profit' => $netProfit,
                'total_refunds' => $totalRefunded,
                'total_fees' => $totalFees,
                'best_selling_product_name' => (string) ($topProduct['product_name'] ?? 'No sales in this range'),
                'best_selling_product_units' => (int) ($topProduct['units_sold'] ?? 0),
                'reviews_total' => (int) data_get($reviewStats, 'summary.total_reviews', 0),
                'reviews_average' => (float) data_get($reviewStats, 'summary.average_rating', 0),
            ],
            'timeline' => $timeline,
            'recent_transactions' => $recentTransactions,
            'recent_refunds' => $recentRefunds,
            'top_customers' => $topCustomers,
            'best_selling_products' => $bestSellingProducts,
            'review_stats' => $reviewStats,
            'meta' => [
                'range_start' => $startLondon->toDateString(),
                'range_end' => $endLondon->toDateString(),
                'range_label' => $this->buildRangeLabel($startLondon, $endLondon),
                'time_zone' => self::TIMEZONE,
            ],
        ];
    }

    private function buildMetricDetail(
        string $metric,
        Carbon $startUtc,
        Carbon $endUtc,
        Carbon $startLondon,
        Carbon $endLondon
    ): array {
        $orders = $this->loadOrders($startUtc, $endUtc);
        $nonCancelledOrders = $orders->filter(fn (Order $order) => !$this->isCancelledStatus($order->status))->values();
        $refunds = $this->loadRefunds($startUtc, $endUtc);

        if ($metric === 'total_revenue') {
            $dailyRevenue = [];
            $dailyOrders = [];
            foreach ($nonCancelledOrders as $order) {
                $key = Carbon::parse($order->created_at)->timezone(self::TIMEZONE)->toDateString();
                $dailyRevenue[$key] = ($dailyRevenue[$key] ?? 0) + (float) ($order->total ?? 0);
                $dailyOrders[$key] = ($dailyOrders[$key] ?? 0) + 1;
            }

            $statusRows = $nonCancelledOrders
                ->groupBy(fn (Order $order) => $this->formatStatusLabel($order->status))
                ->map(function (Collection $group, string $status) {
                    $revenue = (float) $group->sum(fn (Order $order) => (float) ($order->total ?? 0));
                    return [
                        'status' => $status,
                        'orders' => (int) $group->count(),
                        'revenue' => $this->formatMoney($revenue),
                    ];
                })
                ->sortByDesc(fn (array $row) => (float) str_replace(['£', ','], '', (string) $row['revenue']))
                ->values()
                ->all();

            $topTransactions = $nonCancelledOrders
                ->sortByDesc(fn (Order $order) => (float) ($order->total ?? 0))
                ->take(30)
                ->map(fn (Order $order) => [
                    'order_number' => (string) ($order->order_number ?: "ORD-{$order->id}"),
                    'customer' => $this->resolveOrderCustomerName($order),
                    'status' => $this->formatStatusLabel($order->status),
                    'amount' => $this->formatMoney((float) ($order->total ?? 0)),
                    'date' => $this->formatDateTime(optional($order->created_at)?->toIso8601String()),
                ])
                ->values()
                ->all();

            $avgOrder = $nonCancelledOrders->count() > 0
                ? (float) $nonCancelledOrders->sum(fn (Order $order) => (float) ($order->total ?? 0)) / $nonCancelledOrders->count()
                : 0.0;
            $totalRevenue = (float) $nonCancelledOrders->sum(fn (Order $order) => (float) ($order->total ?? 0));
            $totalRefunds = (float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->refund_amount ?? 0));
            $totalFees = (float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->stripe_fee_amount ?? 0));

            return [
                'summary_cards' => [
                    ['label' => 'Total Revenue', 'value' => $this->formatMoney($totalRevenue), 'note' => 'Gross non-cancelled order total'],
                    ['label' => 'Average Order Value', 'value' => $this->formatMoney($avgOrder), 'note' => 'Revenue divided by paid orders'],
                    ['label' => 'Refunds', 'value' => $this->formatMoney($totalRefunds), 'note' => 'Refunded in selected range'],
                    ['label' => 'Net after Fees', 'value' => $this->formatMoney($totalRevenue - $totalRefunds - $totalFees), 'note' => 'Revenue - refunds - fees'],
                ],
                'chart_type' => 'line',
                'chart_title' => 'Revenue Trend',
                'chart_subtitle' => 'Daily revenue with order count as secondary line.',
                'chart_value_label' => 'Revenue',
                'chart_secondary_label' => 'Orders',
                'chart_series' => $this->buildChartSeries($startLondon, $endLondon, $dailyRevenue, $dailyOrders),
                'table_title' => 'Top Revenue Orders',
                'table_columns' => [
                    ['key' => 'order_number', 'label' => 'Order'],
                    ['key' => 'customer', 'label' => 'Customer'],
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'amount', 'label' => 'Amount'],
                    ['key' => 'date', 'label' => 'Date'],
                ],
                'table_rows' => $topTransactions,
                'secondary_table_title' => 'Revenue by Status',
                'secondary_table_columns' => [
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'revenue', 'label' => 'Revenue'],
                ],
                'secondary_table_rows' => $statusRows,
            ];
        }

        if ($metric === 'total_users') {
            $users = User::query()
                ->whereBetween('created_at', [$startUtc, $endUtc])
                ->latest('created_at')
                ->get(['id', 'name', 'username', 'email', 'created_at']);

            $dailyUsers = [];
            foreach ($users as $user) {
                $key = Carbon::parse($user->created_at)->timezone(self::TIMEZONE)->toDateString();
                $dailyUsers[$key] = ($dailyUsers[$key] ?? 0) + 1;
            }

            $ordersByUser = $nonCancelledOrders
                ->filter(fn (Order $order) => !empty($order->user_id))
                ->groupBy(fn (Order $order) => (int) $order->user_id);

            $userRows = $users
                ->map(function (User $user) use ($ordersByUser) {
                    $orders = $ordersByUser->get($user->id, collect());
                    $count = (int) $orders->count();
                    $spend = (float) $orders->sum(fn (Order $order) => (float) ($order->total ?? 0));

                    return [
                        'name' => (string) ($user->name ?: ($user->username ?: 'User')),
                        'email' => (string) ($user->email ?: ''),
                        'joined' => $this->formatDateTime(optional($user->created_at)?->toIso8601String()),
                        'orders' => $count,
                        'spent' => $this->formatMoney($spend),
                        'spent_raw' => $spend,
                    ];
                })
                ->values();

            $usersWithOrders = $userRows->filter(fn (array $row) => (int) ($row['orders'] ?? 0) > 0)->count();
            $conversion = $users->count() > 0 ? round(($usersWithOrders / $users->count()) * 100, 1) : 0.0;
            $usersWithReviews = ProductReview::query()
                ->whereBetween('created_at', [$startUtc, $endUtc])
                ->whereIn('user_id', $users->pluck('id')->all())
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id');

            return [
                'summary_cards' => [
                    ['label' => 'New Users', 'value' => (string) $users->count(), 'note' => 'Accounts created in this range'],
                    ['label' => 'Users with Orders', 'value' => (string) $usersWithOrders, 'note' => 'New users who placed at least one order'],
                    ['label' => 'User Conversion', 'value' => $this->formatPercent($conversion), 'note' => 'Users with orders / new users'],
                    ['label' => 'Users Leaving Reviews', 'value' => (string) $usersWithReviews, 'note' => 'New users who submitted at least one review'],
                ],
                'chart_type' => 'line',
                'chart_title' => 'User Signup Trend',
                'chart_subtitle' => 'Daily account creations.',
                'chart_value_label' => 'Users',
                'chart_secondary_label' => null,
                'chart_series' => $this->buildChartSeries($startLondon, $endLondon, $dailyUsers),
                'table_title' => 'Latest New Users',
                'table_columns' => [
                    ['key' => 'name', 'label' => 'Name'],
                    ['key' => 'email', 'label' => 'Email'],
                    ['key' => 'joined', 'label' => 'Joined'],
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'spent', 'label' => 'Spent'],
                ],
                'table_rows' => $userRows->take(40)->map(fn (array $row) => collect($row)->except(['spent_raw'])->all())->values()->all(),
                'secondary_table_title' => 'Top New Users by Spend',
                'secondary_table_columns' => [
                    ['key' => 'name', 'label' => 'Name'],
                    ['key' => 'email', 'label' => 'Email'],
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'spent', 'label' => 'Spent'],
                ],
                'secondary_table_rows' => $userRows
                    ->filter(fn (array $row) => (float) ($row['spent_raw'] ?? 0) > 0)
                    ->sortByDesc(fn (array $row) => (float) ($row['spent_raw'] ?? 0))
                    ->take(25)
                    ->map(fn (array $row) => collect($row)->except(['spent_raw', 'joined'])->all())
                    ->values()
                    ->all(),
            ];
        }

        if ($metric === 'total_orders') {
            $dailyOrders = [];
            $dailyRevenue = [];
            foreach ($orders as $order) {
                $key = Carbon::parse($order->created_at)->timezone(self::TIMEZONE)->toDateString();
                $dailyOrders[$key] = ($dailyOrders[$key] ?? 0) + 1;
                if (!$this->isCancelledStatus($order->status)) {
                    $dailyRevenue[$key] = ($dailyRevenue[$key] ?? 0) + (float) ($order->total ?? 0);
                }
            }

            $statusRows = $orders
                ->groupBy(fn (Order $order) => $this->formatStatusLabel($order->status))
                ->map(function (Collection $group, string $status) {
                    $revenue = (float) $group
                        ->filter(fn (Order $order) => !$this->isCancelledStatus($order->status))
                        ->sum(fn (Order $order) => (float) ($order->total ?? 0));

                    return [
                        'status' => $status,
                        'orders' => (int) $group->count(),
                        'revenue' => $this->formatMoney($revenue),
                    ];
                })
                ->sortByDesc('orders')
                ->values()
                ->all();

            $topOrders = $orders
                ->sortByDesc(fn (Order $order) => (float) ($order->total ?? 0))
                ->take(30)
                ->map(fn (Order $order) => [
                    'order_number' => (string) ($order->order_number ?: "ORD-{$order->id}"),
                    'customer' => $this->resolveOrderCustomerName($order),
                    'status' => $this->formatStatusLabel($order->status),
                    'amount' => $this->formatMoney((float) ($order->total ?? 0)),
                    'date' => $this->formatDateTime(optional($order->created_at)?->toIso8601String()),
                ])
                ->values()
                ->all();

            $deliveredCount = $orders->filter(fn (Order $order) => str_contains(strtolower((string) $order->status), 'deliver'))->count();
            $cancelledCount = $orders->filter(fn (Order $order) => $this->isCancelledStatus($order->status))->count();
            $avgOrder = $nonCancelledOrders->count() > 0
                ? (float) $nonCancelledOrders->sum(fn (Order $order) => (float) ($order->total ?? 0)) / $nonCancelledOrders->count()
                : 0.0;

            return [
                'summary_cards' => [
                    ['label' => 'Total Orders', 'value' => (string) $orders->count(), 'note' => 'All orders in selected range'],
                    ['label' => 'Delivered', 'value' => (string) $deliveredCount, 'note' => 'Orders marked delivered'],
                    ['label' => 'Cancelled', 'value' => (string) $cancelledCount, 'note' => 'Orders marked cancelled'],
                    ['label' => 'Average Order Value', 'value' => $this->formatMoney($avgOrder), 'note' => 'Non-cancelled orders only'],
                ],
                'chart_type' => 'line',
                'chart_title' => 'Order Volume Trend',
                'chart_subtitle' => 'Daily orders with non-cancelled revenue as secondary line.',
                'chart_value_label' => 'Orders',
                'chart_secondary_label' => 'Revenue',
                'chart_series' => $this->buildChartSeries($startLondon, $endLondon, $dailyOrders, $dailyRevenue),
                'table_title' => 'Order Status Breakdown',
                'table_columns' => [
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'revenue', 'label' => 'Revenue'],
                ],
                'table_rows' => $statusRows,
                'secondary_table_title' => 'Highest Value Orders',
                'secondary_table_columns' => [
                    ['key' => 'order_number', 'label' => 'Order'],
                    ['key' => 'customer', 'label' => 'Customer'],
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'amount', 'label' => 'Amount'],
                    ['key' => 'date', 'label' => 'Date'],
                ],
                'secondary_table_rows' => $topOrders,
            ];
        }

        if ($metric === 'net_profit') {
            $dailyRevenue = [];
            foreach ($nonCancelledOrders as $order) {
                $key = Carbon::parse($order->created_at)->timezone(self::TIMEZONE)->toDateString();
                $dailyRevenue[$key] = ($dailyRevenue[$key] ?? 0) + (float) ($order->total ?? 0);
            }

            $dailyRefunds = [];
            $dailyFees = [];
            foreach ($refunds as $refund) {
                $key = Carbon::parse($refund->refunded_at)->timezone(self::TIMEZONE)->toDateString();
                $dailyRefunds[$key] = ($dailyRefunds[$key] ?? 0) + (float) ($refund->refund_amount ?? 0);
                $dailyFees[$key] = ($dailyFees[$key] ?? 0) + (float) ($refund->stripe_fee_amount ?? 0);
            }

            $chartSeries = [];
            $dailyRows = [];
            $cursor = $startLondon->copy()->startOfDay();
            $lastDay = $endLondon->copy()->startOfDay();
            while ($cursor->lte($lastDay)) {
                $key = $cursor->toDateString();
                $revenue = (float) ($dailyRevenue[$key] ?? 0);
                $refundAmount = (float) ($dailyRefunds[$key] ?? 0);
                $fees = (float) ($dailyFees[$key] ?? 0);
                $net = $revenue - $refundAmount - $fees;

                $chartSeries[] = [
                    'label' => $cursor->format('d M'),
                    'value' => round($net, 2),
                    'secondary' => round($revenue, 2),
                ];

                $dailyRows[] = [
                    'date' => $cursor->format('d M Y'),
                    'revenue' => $this->formatMoney($revenue),
                    'refunds' => $this->formatMoney($refundAmount),
                    'fees' => $this->formatMoney($fees),
                    'net' => $this->formatMoney($net),
                ];

                $cursor->addDay();
            }

            $totalRevenue = (float) $nonCancelledOrders->sum(fn (Order $order) => (float) ($order->total ?? 0));
            $totalRefunds = (float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->refund_amount ?? 0));
            $totalFees = (float) $refunds->sum(fn (ReturnRequest $refund) => (float) ($refund->stripe_fee_amount ?? 0));
            $netProfit = $totalRevenue - $totalRefunds - $totalFees;

            $refundRows = $refunds
                ->take(30)
                ->map(function (ReturnRequest $refund) {
                    $orderNumber = (string) ($refund->order?->order_number ?: 'N/A');
                    return [
                        'order_number' => $orderNumber,
                        'refund' => $this->formatMoney((float) ($refund->refund_amount ?? 0), (string) ($refund->stripe_refund_currency ?: 'GBP')),
                        'fees' => $this->formatMoney((float) ($refund->stripe_fee_amount ?? 0), (string) ($refund->stripe_refund_currency ?: 'GBP')),
                        'reference' => (string) ($refund->stripe_refund_id ?: 'N/A'),
                        'date' => $this->formatDateTime(optional($refund->refunded_at)?->toIso8601String()),
                    ];
                })
                ->values()
                ->all();

            return [
                'summary_cards' => [
                    ['label' => 'Revenue', 'value' => $this->formatMoney($totalRevenue), 'note' => 'Non-cancelled order total'],
                    ['label' => 'Refunded', 'value' => $this->formatMoney($totalRefunds), 'note' => 'Refunds processed in selected range'],
                    ['label' => 'Fees', 'value' => $this->formatMoney($totalFees), 'note' => 'Stripe fees from refunded payments'],
                    ['label' => 'Net Profit', 'value' => $this->formatMoney($netProfit), 'note' => 'Revenue - refunds - fees'],
                ],
                'chart_type' => 'line',
                'chart_title' => 'Daily Net Profit',
                'chart_subtitle' => 'Net profit with revenue as secondary line.',
                'chart_value_label' => 'Net Profit',
                'chart_secondary_label' => 'Revenue',
                'chart_series' => $chartSeries,
                'table_title' => 'Daily Profit Breakdown',
                'table_columns' => [
                    ['key' => 'date', 'label' => 'Date'],
                    ['key' => 'revenue', 'label' => 'Revenue'],
                    ['key' => 'refunds', 'label' => 'Refunds'],
                    ['key' => 'fees', 'label' => 'Fees'],
                    ['key' => 'net', 'label' => 'Net'],
                ],
                'table_rows' => $dailyRows,
                'secondary_table_title' => 'Recent Refunds',
                'secondary_table_columns' => [
                    ['key' => 'order_number', 'label' => 'Order'],
                    ['key' => 'refund', 'label' => 'Refund'],
                    ['key' => 'fees', 'label' => 'Fees'],
                    ['key' => 'reference', 'label' => 'Reference'],
                    ['key' => 'date', 'label' => 'Date'],
                ],
                'secondary_table_rows' => $refundRows,
            ];
        }

        if ($metric === 'best_selling_products') {
            $bestSellingProducts = $this->buildBestSellingProducts($startUtc, $endUtc, 50);
            $totalUnits = (int) collect($bestSellingProducts)->sum('units_sold');
            $distinctProducts = (int) count($bestSellingProducts);
            $topProduct = $bestSellingProducts[0] ?? null;

            $chartSeries = collect($bestSellingProducts)
                ->take(12)
                ->map(fn (array $row) => [
                    'label' => strlen((string) $row['product_name']) > 18
                        ? substr((string) $row['product_name'], 0, 18) . '...'
                        : (string) $row['product_name'],
                    'value' => (int) ($row['units_sold'] ?? 0),
                    'secondary' => (float) ($row['revenue'] ?? 0),
                ])
                ->values()
                ->all();

            $tableRows = collect($bestSellingProducts)
                ->map(function (array $row) {
                    $units = max(1, (int) ($row['units_sold'] ?? 0));
                    $revenue = (float) ($row['revenue'] ?? 0);

                    return [
                        'product' => (string) ($row['product_name'] ?? 'Product'),
                        'units_sold' => $units,
                        'orders' => (int) ($row['orders_count'] ?? 0),
                        'revenue' => $this->formatMoney($revenue),
                        'avg_unit_value' => $this->formatMoney($revenue / $units),
                    ];
                })
                ->values()
                ->all();

            $byRevenueRows = collect($bestSellingProducts)
                ->sortByDesc('revenue')
                ->take(25)
                ->map(fn (array $row) => [
                    'product' => (string) ($row['product_name'] ?? 'Product'),
                    'revenue' => $this->formatMoney((float) ($row['revenue'] ?? 0)),
                    'units_sold' => (int) ($row['units_sold'] ?? 0),
                    'orders' => (int) ($row['orders_count'] ?? 0),
                ])
                ->values()
                ->all();

            return [
                'summary_cards' => [
                    ['label' => 'Units Sold', 'value' => (string) $totalUnits, 'note' => 'Total units sold in selected range'],
                    ['label' => 'Products Sold', 'value' => (string) $distinctProducts, 'note' => 'Distinct products with sales'],
                    ['label' => 'Top Product', 'value' => (string) ($topProduct['product_name'] ?? 'N/A'), 'note' => 'Highest unit sales'],
                    ['label' => 'Top Product Units', 'value' => (string) ($topProduct['units_sold'] ?? 0), 'note' => 'Units sold by top product'],
                ],
                'chart_type' => 'bar',
                'chart_title' => 'Best Sellers by Units',
                'chart_subtitle' => 'Top products by units sold, with revenue as secondary value.',
                'chart_value_label' => 'Units Sold',
                'chart_secondary_label' => 'Revenue',
                'chart_series' => $chartSeries,
                'table_title' => 'Best Selling Products',
                'table_columns' => [
                    ['key' => 'product', 'label' => 'Product'],
                    ['key' => 'units_sold', 'label' => 'Units'],
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'revenue', 'label' => 'Revenue'],
                    ['key' => 'avg_unit_value', 'label' => 'Avg Unit Value'],
                ],
                'table_rows' => $tableRows,
                'secondary_table_title' => 'Top Products by Revenue',
                'secondary_table_columns' => [
                    ['key' => 'product', 'label' => 'Product'],
                    ['key' => 'revenue', 'label' => 'Revenue'],
                    ['key' => 'units_sold', 'label' => 'Units'],
                    ['key' => 'orders', 'label' => 'Orders'],
                ],
                'secondary_table_rows' => $byRevenueRows,
            ];
        }

        $reviewStats = $this->buildReviewStats($startUtc, $endUtc, 30, 30);
        $reviews = ProductReview::query()
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->where('moderation_status', 'approved')
            ->where('is_visible', true)
            ->get(['id', 'rating', 'created_at']);

        $dailyReviewCount = [];
        $dailyRatingTotal = [];
        foreach ($reviews as $review) {
            $key = Carbon::parse($review->created_at)->timezone(self::TIMEZONE)->toDateString();
            $dailyReviewCount[$key] = ($dailyReviewCount[$key] ?? 0) + 1;
            $dailyRatingTotal[$key] = ($dailyRatingTotal[$key] ?? 0) + (float) ($review->rating ?? 0);
        }

        $chartSeries = [];
        $cursor = $startLondon->copy()->startOfDay();
        $lastDay = $endLondon->copy()->startOfDay();
        while ($cursor->lte($lastDay)) {
            $key = $cursor->toDateString();
            $count = (int) ($dailyReviewCount[$key] ?? 0);
            $avg = $count > 0 ? (float) ($dailyRatingTotal[$key] ?? 0) / $count : 0.0;
            $chartSeries[] = [
                'label' => $cursor->format('d M'),
                'value' => $count,
                'secondary' => round($avg, 2),
            ];
            $cursor->addDay();
        }

        $ratingRows = collect((array) data_get($reviewStats, 'rating_breakdown', []))
            ->map(fn (array $row) => [
                'rating' => number_format((float) ($row['rating'] ?? 0), 1) . ' stars',
                'count' => (int) ($row['count'] ?? 0),
                'share' => number_format((float) ($row['share'] ?? 0), 1) . '%',
            ])
            ->values()
            ->all();

        $recentReviewRows = collect((array) data_get($reviewStats, 'recent_reviews', []))
            ->map(fn (array $row) => [
                'date' => $this->formatDateTime((string) ($row['created_at'] ?? null)),
                'product' => (string) ($row['product_name'] ?? 'Product'),
                'customer' => (string) ($row['customer_name'] ?? 'Customer'),
                'rating' => number_format((float) ($row['rating'] ?? 0), 1),
                'status' => (string) ($row['status'] ?? 'N/A'),
            ])
            ->values()
            ->all();

        return [
            'summary_cards' => [
                ['label' => 'Total Reviews', 'value' => (string) data_get($reviewStats, 'summary.total_reviews', 0), 'note' => 'All reviews in selected range'],
                ['label' => 'Approved Reviews', 'value' => (string) data_get($reviewStats, 'summary.approved_reviews', 0), 'note' => 'Visible and approved'],
                ['label' => 'Average Rating', 'value' => number_format((float) data_get($reviewStats, 'summary.average_rating', 0), 2) . ' / 5', 'note' => 'Approved and visible reviews'],
                ['label' => 'Reviews with Images', 'value' => (string) data_get($reviewStats, 'summary.reviews_with_images', 0), 'note' => 'Reviews containing customer photos'],
            ],
            'chart_type' => 'line',
            'chart_title' => 'Review Activity Trend',
            'chart_subtitle' => 'Daily approved review count with average rating as secondary line.',
            'chart_value_label' => 'Reviews',
            'chart_secondary_label' => 'Avg Rating',
            'chart_series' => $chartSeries,
            'table_title' => 'Rating Breakdown',
            'table_columns' => [
                ['key' => 'rating', 'label' => 'Rating'],
                ['key' => 'count', 'label' => 'Count'],
                ['key' => 'share', 'label' => 'Share'],
            ],
            'table_rows' => $ratingRows,
            'secondary_table_title' => 'Recent Reviews',
            'secondary_table_columns' => [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'product', 'label' => 'Product'],
                ['key' => 'customer', 'label' => 'Customer'],
                ['key' => 'rating', 'label' => 'Rating'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'secondary_table_rows' => $recentReviewRows,
        ];
    }

    /**
     * @return Collection<int, Order>
     */
    private function loadOrders(Carbon $startUtc, Carbon $endUtc): Collection
    {
        return Order::query()
            ->with(['user:id,name,username,email,avatar'])
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->latest('created_at')
            ->get([
                'id',
                'user_id',
                'order_number',
                'email',
                'first_name',
                'last_name',
                'status',
                'total',
                'payment_intent_id',
                'archived_at',
                'created_at',
            ]);
    }

    /**
     * @return Collection<int, ReturnRequest>
     */
    private function loadRefunds(Carbon $startUtc, Carbon $endUtc): Collection
    {
        return ReturnRequest::query()
            ->with([
                'order:id,user_id,order_number,email,first_name,last_name',
                'order.user:id,name,username,email,avatar',
            ])
            ->where('status', 'refunded')
            ->whereNotNull('refunded_at')
            ->whereBetween('refunded_at', [$startUtc, $endUtc])
            ->latest('refunded_at')
            ->get([
                'id',
                'order_id',
                'refund_amount',
                'stripe_refund_id',
                'stripe_refund_currency',
                'stripe_fee_amount',
                'refunded_at',
            ]);
    }

    private function buildBestSellingProducts(Carbon $startUtc, Carbon $endUtc, int $limit = 10): array
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->whereBetween('orders.created_at', [$startUtc, $endUtc])
            ->where(function ($query) {
                $query
                    ->whereNull('orders.status')
                    ->orWhereRaw('LOWER(orders.status) NOT LIKE ?', ['%cancel%']);
            })
            ->groupBy('order_items.product_id', 'order_items.product_name', 'products.slug')
            ->selectRaw('order_items.product_id as product_id')
            ->selectRaw('order_items.product_name as product_name')
            ->selectRaw('products.slug as product_slug')
            ->selectRaw('SUM(order_items.quantity) as units_sold')
            ->selectRaw('SUM(order_items.line_total) as revenue')
            ->selectRaw('COUNT(DISTINCT order_items.order_id) as orders_count')
            ->orderByDesc('units_sold')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(function ($row) {
                $name = trim((string) ($row->product_name ?? ''));
                if ($name === '') {
                    $name = $row->product_id ? "Product #{$row->product_id}" : 'Unknown product';
                }

                return [
                    'product_id' => $row->product_id ? (int) $row->product_id : null,
                    'product_name' => $name,
                    'product_slug' => $row->product_slug ? (string) $row->product_slug : null,
                    'units_sold' => (int) ($row->units_sold ?? 0),
                    'revenue' => round((float) ($row->revenue ?? 0), 2),
                    'orders_count' => (int) ($row->orders_count ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    private function buildReviewStats(Carbon $startUtc, Carbon $endUtc, int $topProductLimit = 10, int $recentLimit = 12): array
    {
        $reviews = ProductReview::query()
            ->with(['product:id,name,slug', 'user:id,name,username,email'])
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->latest('created_at')
            ->get([
                'id',
                'product_id',
                'user_id',
                'rating',
                'images_count',
                'moderation_status',
                'is_visible',
                'username_snapshot',
                'created_at',
            ]);

        $approvedVisible = $reviews
            ->filter(fn (ProductReview $review) => (string) $review->moderation_status === 'approved' && (bool) $review->is_visible)
            ->values();

        $totalReviews = (int) $reviews->count();
        $approvedReviews = (int) $approvedVisible->count();
        $flaggedReviews = max(0, $totalReviews - $approvedReviews);
        $averageRating = $approvedReviews > 0
            ? round((float) $approvedVisible->avg(fn (ProductReview $review) => (float) ($review->rating ?? 0)), 2)
            : 0.0;
        $reviewsWithImages = (int) $reviews->filter(fn (ProductReview $review) => (int) ($review->images_count ?? 0) > 0)->count();

        $topReviewedProducts = $approvedVisible
            ->groupBy(function (ProductReview $review) {
                if ($review->product_id) {
                    return "product:{$review->product_id}";
                }
                return "unknown:{$review->id}";
            })
            ->map(function (Collection $group) {
                /** @var ProductReview|null $first */
                $first = $group->first();
                if (!$first) {
                    return null;
                }

                $name = trim((string) ($first->product?->name ?: ''));
                if ($name === '') {
                    $name = $first->product_id ? "Product #{$first->product_id}" : 'Unknown product';
                }

                return [
                    'product_id' => $first->product_id ? (int) $first->product_id : null,
                    'product_name' => $name,
                    'product_slug' => $first->product?->slug ? (string) $first->product->slug : null,
                    'reviews_count' => (int) $group->count(),
                    'average_rating' => round((float) $group->avg(fn (ProductReview $review) => (float) ($review->rating ?? 0)), 2),
                ];
            })
            ->filter()
            ->sortByDesc('reviews_count')
            ->take($topProductLimit)
            ->values()
            ->all();

        $recentReviews = $reviews
            ->take($recentLimit)
            ->map(function (ProductReview $review) {
                $customerName = trim((string) ($review->user?->name ?: $review->user?->username ?: $review->username_snapshot ?: $review->user?->email ?: 'Customer'));
                $productName = trim((string) ($review->product?->name ?: ''));
                if ($productName === '') {
                    $productName = $review->product_id ? "Product #{$review->product_id}" : 'Unknown product';
                }

                return [
                    'id' => $review->id,
                    'product_name' => $productName,
                    'customer_name' => $customerName,
                    'rating' => round((float) ($review->rating ?? 0), 1),
                    'status' => $this->formatReviewStatus((string) ($review->moderation_status ?? ''), (bool) $review->is_visible),
                    'created_at' => optional($review->created_at)?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        return [
            'summary' => [
                'total_reviews' => $totalReviews,
                'approved_reviews' => $approvedReviews,
                'flagged_reviews' => $flaggedReviews,
                'average_rating' => $averageRating,
                'reviews_with_images' => $reviewsWithImages,
            ],
            'rating_breakdown' => $this->buildRatingBreakdown($approvedVisible),
            'top_reviewed_products' => $topReviewedProducts,
            'recent_reviews' => $recentReviews,
        ];
    }

    /**
     * @param Collection<int, ProductReview> $approvedReviews
     */
    private function buildRatingBreakdown(Collection $approvedReviews): array
    {
        $buckets = [];
        for ($value = 5.0; $value >= 1.0; $value -= 0.5) {
            $key = number_format($value, 1, '.', '');
            $buckets[$key] = 0;
        }

        foreach ($approvedReviews as $review) {
            $rating = max(1.0, min(5.0, (float) ($review->rating ?? 0)));
            $rounded = round($rating * 2) / 2;
            $bucketKey = number_format($rounded, 1, '.', '');
            if (!array_key_exists($bucketKey, $buckets)) {
                $buckets[$bucketKey] = 0;
            }
            $buckets[$bucketKey]++;
        }

        $total = array_sum($buckets);

        return collect($buckets)
            ->map(function (int $count, string $rating) use ($total) {
                return [
                    'rating' => (float) $rating,
                    'count' => $count,
                    'share' => $total > 0 ? round(($count / $total) * 100, 1) : 0.0,
                ];
            })
            ->values()
            ->all();
    }

    private function buildTimeline(Carbon $startLondon, Carbon $endLondon, array $dailyPrimary, array $dailySecondary = []): array
    {
        $timeline = [];
        $cursor = $startLondon->copy()->startOfDay();
        $lastDay = $endLondon->copy()->startOfDay();
        $dayCount = $cursor->diffInDays($lastDay) + 1;
        $labelFormat = $dayCount > 120 ? 'd M y' : 'd M';

        while ($cursor->lte($lastDay)) {
            $key = $cursor->toDateString();
            $timeline[] = [
                'date' => $key,
                'label' => $cursor->format($labelFormat),
                'revenue' => round((float) ($dailyPrimary[$key] ?? 0), 2),
                'orders' => (int) ($dailySecondary[$key] ?? 0),
            ];

            $cursor->addDay();
        }

        return $timeline;
    }

    private function buildChartSeries(Carbon $startLondon, Carbon $endLondon, array $dailyPrimary, ?array $dailySecondary = null): array
    {
        $series = [];
        $cursor = $startLondon->copy()->startOfDay();
        $lastDay = $endLondon->copy()->startOfDay();
        $dayCount = $cursor->diffInDays($lastDay) + 1;
        $labelFormat = $dayCount > 120 ? 'd M y' : 'd M';

        while ($cursor->lte($lastDay)) {
            $key = $cursor->toDateString();
            $entry = [
                'label' => $cursor->format($labelFormat),
                'value' => round((float) ($dailyPrimary[$key] ?? 0), 2),
            ];

            if (is_array($dailySecondary)) {
                $entry['secondary'] = round((float) ($dailySecondary[$key] ?? 0), 2);
            }

            $series[] = $entry;
            $cursor->addDay();
        }

        return $series;
    }

    /**
     * @param Collection<int, Order> $orders
     */
    private function buildTopCustomers(Collection $orders): array
    {
        return $orders
            ->groupBy(function (Order $order) {
                if ($order->user_id) {
                    return "user:{$order->user_id}";
                }

                $email = strtolower(trim((string) $order->email));
                if ($email !== '') {
                    return "email:{$email}";
                }

                return "guest:{$order->id}";
            })
            ->map(function (Collection $customerOrders, string $groupKey) {
                /** @var Order|null $latestOrder */
                $latestOrder = $customerOrders->sortByDesc('created_at')->first();
                if (!$latestOrder) {
                    return null;
                }

                $user = $latestOrder->user;
                $displayName = $this->resolveOrderCustomerName($latestOrder);
                $email = trim((string) ($latestOrder->email ?: ($user?->email ?? '')));

                return [
                    'key' => $groupKey,
                    'customer_name' => $displayName,
                    'username' => $user?->username,
                    'customer_email' => $email,
                    'avatar' => $user?->avatar,
                    'orders_count' => (int) $customerOrders->count(),
                    'total_spent' => round((float) $customerOrders->sum(fn (Order $order) => (float) ($order->total ?? 0)), 2),
                    'last_order_at' => optional($latestOrder->created_at)?->toIso8601String(),
                ];
            })
            ->filter()
            ->sortByDesc('total_spent')
            ->take(10)
            ->values()
            ->all();
    }

    private function resolveOrderCustomerName(Order $order): string
    {
        $user = $order->user;
        if ($user?->name) {
            return (string) $user->name;
        }
        if ($user?->username) {
            return (string) $user->username;
        }

        $orderName = trim((string) (($order->first_name ?: '') . ' ' . ($order->last_name ?: '')));
        if ($orderName !== '') {
            return $orderName;
        }

        if ($order->email) {
            return (string) $order->email;
        }

        return 'Guest customer';
    }

    private function formatStatusLabel(?string $status): string
    {
        $value = strtolower(trim((string) $status));
        if ($value === '') {
            return 'Pending';
        }

        return collect(explode('_', str_replace(' ', '_', $value)))
            ->filter(fn (string $segment) => $segment !== '')
            ->map(fn (string $segment) => ucfirst($segment))
            ->implode(' ');
    }

    private function formatReviewStatus(string $moderationStatus, bool $isVisible): string
    {
        $status = strtolower(trim($moderationStatus));
        if ($status === 'approved' && $isVisible) {
            return 'Approved';
        }
        if ($status === 'approved' && !$isVisible) {
            return 'Hidden';
        }
        if ($status === '') {
            return 'Pending';
        }

        return collect(explode('_', $status))
            ->map(fn (string $segment) => ucfirst($segment))
            ->implode(' ');
    }

    private function isCancelledStatus(?string $status): bool
    {
        $normalized = strtolower(trim((string) $status));
        return $normalized !== '' && str_contains($normalized, 'cancel');
    }

    private function formatDateTime(?string $value): string
    {
        if (!$value) {
            return 'N/A';
        }

        try {
            return Carbon::parse($value)->timezone(self::TIMEZONE)->format('d M Y H:i');
        } catch (\Throwable) {
            return 'N/A';
        }
    }

    private function formatMoney(float|int|null $value, string $currency = 'GBP'): string
    {
        $amount = (float) ($value ?? 0);
        $code = strtoupper(trim($currency));

        if ($code === 'GBP' || $code === '') {
            return '£' . number_format($amount, 2);
        }

        return number_format($amount, 2) . ' ' . $code;
    }

    private function formatPercent(float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 1) . '%';
    }

    private function buildRangeLabel(Carbon $startLondon, Carbon $endLondon): string
    {
        return $startLondon->format('d M Y') . ' - ' . $endLondon->format('d M Y');
    }

    private function assertMetric(string $metric): string
    {
        if (!array_key_exists($metric, self::METRIC_META)) {
            abort(404);
        }

        return $metric;
    }
}
