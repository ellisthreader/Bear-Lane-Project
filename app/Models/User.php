<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Carbon;
use App\Models\SavedDesign;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'name',
        'phone',
        'bio',
        'avatar',
        'last_avatar_generated_at',
        'last_verification_sent_at',
        'is_admin',   // admin access
        'is_member',
        'is_oauth',   // added for OAuth users
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_avatar_generated_at' => 'datetime:UTC',
        'last_verification_sent_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
        'is_member' => 'boolean',
        'is_oauth' => 'boolean', // ensures true/false for OAuth
    ];

    /**
     * Accessor to get the full URL of the avatar.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (!$this->avatar) {
            return null;
        }

        if (str_starts_with($this->avatar, 'http://') || str_starts_with($this->avatar, 'https://')) {
            return $this->avatar;
        }

        return asset('storage/' . $this->avatar);
    }

    /**
     * Override the default password reset notification to use a custom styled email.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Optional helper to check cooldown before resending verification email.
     */
    public function canSendVerificationEmail(int $cooldownSeconds = 60): bool
    {
        if (!$this->last_verification_sent_at) {
            return true;
        }

        return $this->last_verification_sent_at->diffInSeconds(now()) >= $cooldownSeconds;
    }

    /**
     * Optional: mark verification email as sent (for cooldown tracking)
     */
    public function markVerificationEmailSent(): void
    {
        $this->update(['last_verification_sent_at' => now()]);
    }

    /**
     * Relationship: chats the user participates in.
     * Required for broadcast auth on chat.{chatId} channels.
     */
    public function chats()
    {
        return $this->belongsToMany(Chat::class, 'chat_user', 'user_id', 'chat_id');
    }

    public function savedDesigns()
    {
        return $this->hasMany(SavedDesign::class);
    }

    /**
     * Helper to check if the user is an admin.
     */
    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    /**
     * Helper to check if the user is an OAuth user.
     */
    public function isOauth(): bool
    {
        return (bool) $this->is_oauth;
    }
}
