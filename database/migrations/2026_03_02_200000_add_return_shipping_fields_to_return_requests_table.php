<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('return_requests', 'return_shipping_rate_id')) {
                $table->string('return_shipping_rate_id')->nullable()->after('shippo_tracking_number');
            }
            if (!Schema::hasColumn('return_requests', 'return_shipping_service')) {
                $table->string('return_shipping_service')->nullable()->after('return_shipping_rate_id');
            }
            if (!Schema::hasColumn('return_requests', 'return_shipping_amount')) {
                $table->decimal('return_shipping_amount', 10, 2)->nullable()->after('return_shipping_service');
            }
            if (!Schema::hasColumn('return_requests', 'return_shipping_currency')) {
                $table->string('return_shipping_currency', 12)->nullable()->after('return_shipping_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $columns = [
                'return_shipping_rate_id',
                'return_shipping_service',
                'return_shipping_amount',
                'return_shipping_currency',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('return_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
