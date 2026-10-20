<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserWishlistItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'item_key',
        'product_id',
        'product_slug',
        'name',
        'brand',
        'price',
        'image',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'price' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
