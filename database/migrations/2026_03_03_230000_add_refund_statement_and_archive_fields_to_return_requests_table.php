<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('return_requests', 'stripe_refund_id')) {
                $table->string('stripe_refund_id', 120)->nullable()->after('refund_amount');
            }
            if (!Schema::hasColumn('return_requests', 'stripe_refund_currency')) {
                $table->string('stripe_refund_currency', 12)->nullable()->after('stripe_refund_id');
            }
            if (!Schema::hasColumn('return_requests', 'stripe_payment_amount')) {
                $table->decimal('stripe_payment_amount', 10, 2)->nullable()->after('stripe_refund_currency');
            }
            if (!Schema::hasColumn('return_requests', 'stripe_fee_amount')) {
                $table->decimal('stripe_fee_amount', 10, 2)->nullable()->after('stripe_payment_amount');
            }
            if (!Schema::hasColumn('return_requests', 'stripe_net_amount')) {
                $table->decimal('stripe_net_amount', 10, 2)->nullable()->after('stripe_fee_amount');
            }
            if (!Schema::hasColumn('return_requests', 'additional_info_submitted_at')) {
                $table->timestamp('additional_info_submitted_at')->nullable()->after('more_info_requested_at');
            }
            if (!Schema::hasColumn('return_requests', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('exchange_offered_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            foreach ([
                'stripe_refund_id',
                'stripe_refund_currency',
                'stripe_payment_amount',
                'stripe_fee_amount',
                'stripe_net_amount',
                'additional_info_submitted_at',
                'archived_at',
            ] as $column) {
                if (Schema::hasColumn('return_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

