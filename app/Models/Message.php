<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Chat;

class Message extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'chat_id',
        'user_id',
        'sender_type',
        'content',
    ];

    /**
     * Get the user who sent this message.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the chat this message belongs to.
     */
    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Convenience accessor to get the username of the sender.
     * Returns 'Guest' if the message was sent by a guest.
     */
    public function getUsernameAttribute(): string
    {
        return $this->user?->username ?? 'Guest';
    }

    /**
     * Convenience accessor to get a display-ready sender type.
     * Returns 'user' if sent by a logged-in user, otherwise 'guest'.
     */
    public function getSenderTypeDisplayAttribute(): string
    {
        return $this->user ? 'user' : 'guest';
    }
}
