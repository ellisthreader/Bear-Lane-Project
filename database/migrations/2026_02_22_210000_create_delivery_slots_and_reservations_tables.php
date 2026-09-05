<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_slots', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('time_window', 32);
            $table->unsignedInteger('capacity')->default(25);
            $table->unsignedInteger('reserved_count')->default(0);
            $table->timestamps();

            $table->unique(['date', 'time_window']);
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('slot_id')->constrained('delivery_slots')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('status', 24)->default('reserved')->index();
            $table->timestamp('expires_at')->index();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['slot_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('delivery_slots');
    }
};
