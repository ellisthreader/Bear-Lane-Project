<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaqRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'question',
        'details',
        'answer',
        'status',
        'answered_by',
        'answered_at',
        'is_public',
    ];

    protected $casts = [
        'answered_at' => 'datetime',
        'is_public' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answerer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by');
    }
}
