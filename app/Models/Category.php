<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Product;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'section',
        'subsection',
        'parent_id',
    ];

    /**
     * Parent category (for hierarchical categories)
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Child categories
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Many-to-many relationship with products
     */
    public function products()
    {
        return $this->belongsToMany(Product::class, 'category_product');
    }
}
