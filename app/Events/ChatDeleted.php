<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;

class ChatDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chatId;
    public $deleted_by;

    public function __construct($chatId, $deleted_by)
    {
        $this->chatId = $chatId;
        $this->deleted_by = $deleted_by;
    }

    public function broadcastOn()
    {
        // 🔒 Private channel so only participants see updates
        return new PrivateChannel("livechat.{$this->chatId}");
    }

    public function broadcastAs()
    {
        return 'ChatDeleted';
    }
}
