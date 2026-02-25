<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->date('selected_delivery_date')->nullable()->after('status');
            $table->date('calculated_ship_date')->nullable()->after('selected_delivery_date');
            $table->string('shipping_service', 180)->nullable()->after('calculated_ship_date');
            $table->string('shipping_rate_id', 120)->nullable()->after('shipping_service');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->date('selected_delivery_date')->nullable()->after('shipping_rate');
            $table->date('calculated_ship_date')->nullable()->after('selected_delivery_date');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['selected_delivery_date', 'calculated_ship_date']);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn([
                'selected_delivery_date',
                'calculated_ship_date',
                'shipping_service',
                'shipping_rate_id',
            ]);
        });
    }
};

