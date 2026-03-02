<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\ShippoRateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncDeliveredOrdersFromCourier extends Command
{
    protected $signature = 'orders:sync-delivery-status';

    protected $description = 'Sync dispatched orders with courier tracking and auto-mark delivered when completed.';

    public function __construct(private readonly ShippoRateService $shippoRateService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        if (empty(config('services.shippo.token'))) {
            $this->info('SHIPPO_API_KEY is not configured. Skipping courier sync.');
            return self::SUCCESS;
        }

        $orders = Order::query()
            ->whereIn('status', ['dispatched', 'out_for_delivery'])
            ->whereNotNull('shippo_transaction_id')
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No dispatched Shippo orders to sync.');
            return self::SUCCESS;
        }

        $updated = 0;

        foreach ($orders as $order) {
            try {
                $transaction = $this->shippoRateService->getTransaction((string) $order->shippo_transaction_id);

                $trackingNumber = trim((string) data_get($transaction, 'tracking_number', ''));
                $trackingStatus = strtoupper(trim((string) data_get($transaction, 'tracking_status.status', data_get($transaction, 'tracking_status', ''))));
                $objectState = strtoupper(trim((string) data_get($transaction, 'tracking_status.object_state', data_get($transaction, 'object_state', ''))));

                $nextValues = [];

                if ($trackingNumber !== '' && $trackingNumber !== (string) $order->shippo_tracking_number) {
                    $nextValues['shippo_tracking_number'] = $trackingNumber;
                }

                if (
                    in_array($trackingStatus, ['DELIVERED'], true)
                    || in_array($objectState, ['DELIVERED'], true)
                ) {
                    $nextValues['status'] = 'delivered';
                }

                if (!empty($nextValues)) {
                    $order->update($nextValues);
                    $updated++;
                }
            } catch (\Throwable $exception) {
                Log::warning('orders:sync-delivery-status failed for order', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'transaction_id' => $order->shippo_transaction_id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $this->info("Delivery sync complete. Updated {$updated} order(s).");

        return self::SUCCESS;
    }
}
