<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CookieConsentLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_id',
        'consent_version',
        'status',
        'necessary',
        'analytics',
        'marketing',
        'consented_at',
        'ip_hash',
        'user_agent',
    ];

    protected $casts = [
        'necessary' => 'boolean',
        'analytics' => 'boolean',
        'marketing' => 'boolean',
        'consented_at' => 'datetime',
    ];
}
