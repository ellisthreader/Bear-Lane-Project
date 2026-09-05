<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InstantQuote extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'quote_number',
        'items',
        'total',
    ];

    protected $casts = [
        'items' => 'array', // Automatically cast JSON to array
    ];
}
