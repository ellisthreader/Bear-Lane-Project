<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Image extends Model
{
    use HasFactory;

    private const PATH_ALIASES = [
        '/images/products/bwhitetee1.png' => 'images/Products/WhiteTee1.png',
        'images/products/bwhitetee1.png' => 'images/Products/WhiteTee1.png',
    ];

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
        $path = $this->normalizePath(trim((string) $this->path));
        if ($path === '') {
            return asset('images/placeholder.jpg');
        }

        // If path already starts with http, return as-is
        if ($this->isHttpUrl($path)) {
            return $path;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            if (file_exists(public_path($path))) {
                return asset($path);
            }

            $relativePath = ltrim(substr($path, strlen('storage/')), '/');
            if ($relativePath !== '' && Storage::disk('public')->exists($relativePath)) {
                return asset('storage/' . $relativePath);
            }

            return asset('images/placeholder.jpg');
        }

        // Most uploaded product/admin images are stored on the public disk.
        if (Storage::disk('public')->exists($path)) {
            return asset('storage/' . ltrim($path, '/'));
        }

        // Legacy paths relative to public/.
        if (file_exists(public_path($path))) {
            return asset($path);
        }

        return asset('images/placeholder.jpg');
    }

    private function isHttpUrl(string $path): bool
    {
        return str_starts_with($path, 'http://') || str_starts_with($path, 'https://');
    }

    private function normalizePath(string $path): string
    {
        $normalized = str_replace('\\', '/', $path);
        $normalized = preg_replace('#/+#', '/', $normalized) ?? $normalized;
        $normalized = preg_replace('/\.(png|jpe?g|webp|gif|svg)g$/i', '.$1', $normalized) ?? $normalized;

        $alias = self::PATH_ALIASES[strtolower($normalized)] ?? null;
        if ($alias) {
            return $alias;
        }

        return $normalized;

    }
}
