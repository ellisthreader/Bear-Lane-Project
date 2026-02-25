<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'colour',
        'size',
        'price',
        'original_price',
        'stock',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * 🔥 Each variant has its own image set  
     * This matches the seeder and fixes the relationship error.
     */
    public function images()
    {
        return $this->morphMany(Image::class, 'imageable');
    }
}
