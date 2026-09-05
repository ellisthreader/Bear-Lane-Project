<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shippo signed URLs can exceed 255 chars.
        Schema::table('return_requests', function (Blueprint $table) {
            $table->text('shippo_label_url')->nullable()->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->text('shippo_label_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->string('shippo_label_url')->nullable()->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('shippo_label_url')->nullable()->change();
        });
    }
};
