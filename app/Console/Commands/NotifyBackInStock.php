<?php

namespace App\Console\Commands;

use App\Models\BackInStockSubscription;
use App\Models\Chat;
use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class NotifyBackInStock extends Command
{
    protected $signature = 'products:notify-back-in-stock';

    protected $description = 'Send notifications for back-in-stock product subscriptions';

    public function handle(): int
    {
        $subscriptions = BackInStockSubscription::query()
            ->whereNull('notified_at')
            ->with([
                'user:id',
                'product:id,name,slug',
                'product.variants:id,product_id,colour,size,stock',
            ])
            ->limit(500)
            ->get();

        $sent = 0;

        foreach ($subscriptions as $subscription) {
            if (!$subscription->user || !$subscription->product) {
                continue;
            }

            $isInStock = $subscription->product->variants->contains(function ($variant) use ($subscription) {
                return mb_strtolower(trim((string) $variant->colour)) === mb_strtolower(trim((string) $subscription->colour))
                    && mb_strtoupper(trim((string) $variant->size)) === mb_strtoupper(trim((string) $subscription->size))
                    && (int) ($variant->stock ?? 0) > 0;
            });

            if (!$isInStock) {
                continue;
            }

            $chat = Chat::query()->firstOrCreate(
                [
                    'user_id' => $subscription->user_id,
                    'title' => 'Admin Notices',
                ],
                [
                    'session_id' => null,
                    'is_closed' => false,
                ]
            );

            Message::query()->create([
                'chat_id' => $chat->id,
                'user_id' => null,
                'sender_type' => 'admin',
                'content' => sprintf(
                    'Back in stock: %s (%s, %s) is available again.',
                    $subscription->product->name,
                    $subscription->colour,
                    $subscription->size
                ),
            ]);

            $subscription->forceFill([
                'notified_at' => Carbon::now(),
            ])->save();

            $sent++;
        }

        $this->info("Back-in-stock notifications sent: {$sent}");

        return self::SUCCESS;
    }
}
