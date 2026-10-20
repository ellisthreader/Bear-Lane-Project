<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use App\Models\Message;

class AdminChatBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('admin.livechats');
    }

    public function broadcastWith()
    {
        return [
            'from' => $this->message->user?->name ?? 'Guest',
            'message' => $this->message->content,
            'chatId' => $this->message->chat_id,
        ];
    }

    public function broadcastAs()
    {
        return 'AdminChatBroadcast';
    }
}
