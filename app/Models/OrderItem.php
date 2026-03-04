<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Product;
use App\Models\Order;
use App\Models\ProductReview;

class OrderItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'size',
        'colour',
        'design_type',
        'image_url',
        'design_payload',
        'quantity',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'design_payload' => 'array',
    ];

    /**
     * Relationship: belongs to a parent Order
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Relationship: belongs to a Product
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function review()
    {
        return $this->hasOne(ProductReview::class, 'order_item_id');
    }
}
