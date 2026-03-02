<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
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
        return [
            new Channel("livechat.{$this->chatId}"),
            new PrivateChannel('admin.livechats'),
        ];
    }

    public function broadcastAs()
    {
        return 'ChatDeleted';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_id' => $this->chatId,
            'deleted_by' => $this->deleted_by,
        ];
    }
}
