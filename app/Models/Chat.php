<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    use HasFactory;

    /**
     * Mass assignable fields.
     * - title: optional chat label, e.g., "Chat with Mighty"
     * - session_id: guest identifier (UUID string)
     * - user_id: registered user owning this chat (nullable for guests)
     * - is_closed: boolean flag
     */
    protected $fillable = [
        'title',
        'session_id',
        'user_id',
        'is_closed',
    ];

    /**
     * Casts
     */
    protected $casts = [
        'is_closed' => 'boolean',
    ];

    /**
     * A chat belongs to exactly one authenticated user.
     * Guests will have user_id = null.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * A chat has many messages.
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    /**
     * The latest message in this chat (for admin overviews, lists).
     */
    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * Scope to load only active (open) chats.
     */
    public function scopeActive($query)
    {
        return $query->where('is_closed', false);
    }

    /**
     * Convenience method: get the display name for this chat
     * Returns the username of the user if logged in, otherwise 'Guest'
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->user?->username ?? 'Guest';
    }
}
