<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'slot_id',
        'order_id',
        'status',
        'expires_at',
        'confirmed_at',
        'selected_delivery_date',
        'calculated_ship_date',
        'shipping_service',
        'shipping_rate_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'selected_delivery_date' => 'date',
        'calculated_ship_date' => 'date',
    ];

    public function slot()
    {
        return $this->belongsTo(DeliverySlot::class, 'slot_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
