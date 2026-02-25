<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuoteRequest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'budget',
        'details',
        'images',
    ];

    /**
     * Attribute casting.
     */
    protected $casts = [
        'images' => 'array',
    ];
}
