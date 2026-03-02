<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Image extends Model
{
    use HasFactory;

    protected $fillable = [
        'imageable_id',
        'imageable_type',
        'path',
        'restricted_left',
        'restricted_top',
        'restricted_width',
        'restricted_height',
    ];

    public $timestamps = false;
    protected $casts = [
        'restricted_left' => 'float',
        'restricted_top' => 'float',
        'restricted_width' => 'float',
        'restricted_height' => 'float',
    ];

    // Always include a `url` attribute for frontend
    protected $appends = ['url'];
    protected $hidden = ['imageable_type', 'imageable_id', 'path'];

    public function imageable()
    {
        return $this->morphTo();
    }

    public function getUrlAttribute(): string
    {
        // If path already starts with http, return as-is
        if (str_starts_with($this->path, 'http')) {
            return $this->path;
        }

        // Otherwise, assume path is relative to public/
        return asset($this->path);

    }
}
