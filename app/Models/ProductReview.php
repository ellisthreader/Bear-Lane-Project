<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'order_id',
        'order_item_id',
        'user_id',
        'rating',
        'title',
        'message',
        'images_count',
        'moderation_status',
        'moderation_reason',
        'is_visible',
        'reviewed_at',
        'username_snapshot',
        'avatar_url_snapshot',
        'delivered_at',
    ];

    protected $casts = [
        'rating' => 'float',
        'images_count' => 'integer',
        'is_visible' => 'boolean',
        'reviewed_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function images()
    {
        return $this->hasMany(ProductReviewImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function scopeApproved($query)
    {
        return $query
            ->where('moderation_status', 'approved')
            ->where('is_visible', true);
    }
}
