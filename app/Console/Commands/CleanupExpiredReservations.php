<?php

namespace App\Console\Commands;

use App\Services\DeliverySlotService;
use Illuminate\Console\Command;

class CleanupExpiredReservations extends Command
{
    protected $signature = 'delivery:cleanup-expired-reservations';
    protected $description = 'Release expired timed-delivery reservations and free slot capacity';

    public function handle(DeliverySlotService $slotService): int
    {
        $released = $slotService->releaseExpiredReservations();
        $this->info("Released {$released} expired reservation(s).");
        return self::SUCCESS;
    }
}
