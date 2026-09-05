<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedDesign extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'name',
        'design_payload',
    ];

    protected $casts = [
        'design_payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
