<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Product;
use App\Models\Order;

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
        'image_url', // ✅ Added this line so the image gets saved
        'quantity',
        'unit_price',
        'line_total',
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
}
