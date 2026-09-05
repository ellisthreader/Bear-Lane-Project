<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'type', 'value', 'min_spend', 'usage_limit',
        'times_used', 'active', 'starts_at', 'expires_at', 'applies_to'
    ];

    protected $casts = [
        'applies_to' => 'array',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
    ];
}
