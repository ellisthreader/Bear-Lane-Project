<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use App\Models\Message;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    private const IMAGE_PREFIX = '[image]';

    public Message $message;

    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    public function broadcastOn(): Channel|array
    {
        return [
            new Channel("livechat.{$this->message->chat_id}"),
            new PrivateChannel('admin.livechats'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    public function broadcastWith(): array
    {
        $imageUrl = null;
        $content = (string) $this->message->content;
        $trimmed = trim($content);
        if (str_starts_with($trimmed, self::IMAGE_PREFIX)) {
            $candidate = trim(substr($trimmed, strlen(self::IMAGE_PREFIX)));
            if ($candidate !== '') {
                $imageUrl = $candidate;
            }
        }

        $username = $this->message->user?->name ?: $this->message->user?->username;
        if (!$username) {
            $username = match ($this->message->sender_type) {
                'admin' => 'Support Team',
                'system' => 'System',
                default => 'Guest',
            };
        }

        return [
            'id' => $this->message->id,
            'chat_id' => $this->message->chat_id,
            'user_id' => $this->message->user_id,
            'sender_type' => $this->message->sender_type,
            'username' => $username,
            'avatar' => $this->message->user?->avatar,
            'is_image' => $imageUrl !== null,
            'image_url' => $imageUrl,
            'content' => $imageUrl ? 'Image attachment' : $this->message->content,
            'created_at' => $this->message->created_at->toDateTimeString(),
        ];
    }
}
