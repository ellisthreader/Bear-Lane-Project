<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

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
        $path = trim((string) $this->path);
        if ($path === '') {
            return '';
        }

        // If path already starts with http, return as-is
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        // Paths already rooted to app public assets.
        if (str_starts_with($path, '/')) {
            return asset(ltrim($path, '/'));
        }

        if (str_starts_with($path, 'storage/')) {
            return asset($path);
        }

        // Most uploaded product/admin images are stored on the public disk.
        if (Storage::disk('public')->exists($path)) {
            return asset('storage/' . ltrim($path, '/'));
        }

        // Fallback for legacy paths relative to public/.
        return asset($path);

    }
}
