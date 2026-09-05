<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductReviewImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_review_id',
        'image_path',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function review()
    {
        return $this->belongsTo(ProductReview::class, 'product_review_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        $path = trim((string) $this->image_path);
        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return asset('storage/' . ltrim($path, '/'));
    }
}
