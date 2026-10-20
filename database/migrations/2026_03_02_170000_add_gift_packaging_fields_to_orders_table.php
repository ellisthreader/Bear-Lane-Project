<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('gift_packaging')->default(false)->after('shipping_rate');
            $table->decimal('gift_packaging_cost', 10, 2)->default(0)->after('gift_packaging');
            $table->text('gift_message')->nullable()->after('gift_packaging_cost');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['gift_packaging', 'gift_packaging_cost', 'gift_message']);
        });
    }
};
