<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_user_id',
        'admin_user_name',
        'activity_type',
        'icon',
        'title',
        'description',
        'subject_type',
        'subject_id',
        'subject_label',
        'route_name',
        'request_method',
        'path',
        'ip_address',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
