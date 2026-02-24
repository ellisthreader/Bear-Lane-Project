<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shippo_transaction_id', 120)->nullable()->after('calculated_ship_date');
            $table->text('shippo_label_url')->nullable()->after('shippo_transaction_id');
            $table->string('shippo_tracking_number', 120)->nullable()->after('shippo_label_url');
            $table->string('shippo_selected_rate_id', 120)->nullable()->after('shippo_tracking_number');
            $table->string('shippo_selected_service', 180)->nullable()->after('shippo_selected_rate_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shippo_transaction_id',
                'shippo_label_url',
                'shippo_tracking_number',
                'shippo_selected_rate_id',
                'shippo_selected_service',
            ]);
        });
    }
};

