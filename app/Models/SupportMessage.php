<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'quote_request_id',
        'source_type',
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'attachments',
        'metadata',
        'status',
        'admin_read_at',
        'admin_replied_at',
        'replied_by_admin_id',
    ];

    protected $casts = [
        'attachments' => 'array',
        'metadata' => 'array',
        'admin_read_at' => 'datetime',
        'admin_replied_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quoteRequest()
    {
        return $this->belongsTo(QuoteRequest::class);
    }

    public function repliedByAdmin()
    {
        return $this->belongsTo(User::class, 'replied_by_admin_id');
    }
}
