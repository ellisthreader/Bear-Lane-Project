<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'user_id',
        'selected_items',
        'reason_code',
        'reason_category',
        'reason_text',
        'proof_paths',
        'status',
        'admin_note',
        'admin_override',
        'requested_at',
        'reviewed_at',
        'approved_at',
        'rejected_at',
        'more_info_requested_at',
        'additional_info_submitted_at',
        'received_at',
        'customer_shipped_at',
        'refunded_at',
        'exchange_offered_at',
        'archived_at',
        'refund_amount',
        'stripe_refund_id',
        'stripe_refund_currency',
        'stripe_payment_amount',
        'stripe_fee_amount',
        'stripe_net_amount',
        'delivery_date',
        'eligibility_expires_at',
        'is_within_window',
        'shippo_transaction_id',
        'shippo_label_url',
        'shippo_tracking_number',
        'return_shipping_rate_id',
        'return_shipping_service',
        'return_shipping_amount',
        'return_shipping_currency',
    ];

    protected $casts = [
        'selected_items' => 'array',
        'proof_paths' => 'array',
        'admin_override' => 'boolean',
        'is_within_window' => 'boolean',
        'requested_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'more_info_requested_at' => 'datetime',
        'additional_info_submitted_at' => 'datetime',
        'received_at' => 'datetime',
        'customer_shipped_at' => 'datetime',
        'refunded_at' => 'datetime',
        'exchange_offered_at' => 'datetime',
        'archived_at' => 'datetime',
        'delivery_date' => 'date',
        'eligibility_expires_at' => 'date',
        'refund_amount' => 'float',
        'stripe_payment_amount' => 'float',
        'stripe_fee_amount' => 'float',
        'stripe_net_amount' => 'float',
        'return_shipping_amount' => 'float',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
