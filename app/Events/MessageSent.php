<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use App\Models\Message;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;
    public ?string $guestId;

    /**
     * Create a new event instance.
     *
     * @param  \App\Models\Message  $message
     * @param  string|null  $guestId  The guest UUID for private channels
     */
    public function __construct(Message $message, ?string $guestId = null)
    {
        $this->message = $message;
        $this->guestId = $guestId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn(): Channel|array
    {
        // Guest chat → broadcast privately
        if ($this->guestId) {
            return new PrivateChannel("guest.{$this->guestId}");
        }

        // Fallback public/support channel
        return new Channel("support-chat");
    }

    /**
     * Name the event for the frontend listener.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return "MessageSent";
    }

    /**
     * Customize the data sent to the frontend.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'chat_id' => $this->message->chat_id,
            'user_id' => $this->message->user_id,
            'sender_type' => $this->message->sender_type,
            'content' => $this->message->content,
            'created_at' => $this->message->created_at->toDateTimeString(),
        ];
    }
}
