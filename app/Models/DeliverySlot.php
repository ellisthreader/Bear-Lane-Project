<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliverySlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'time_window',
        'capacity',
        'reserved_count',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'slot_id');
    }
}
