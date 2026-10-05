<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_slot_id')->nullable()->after('country')->constrained('delivery_slots')->nullOnDelete();
            $table->string('shipping_rate')->nullable()->after('delivery_slot_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_slot_id');
            $table->dropColumn('shipping_rate');
        });
    }
};
