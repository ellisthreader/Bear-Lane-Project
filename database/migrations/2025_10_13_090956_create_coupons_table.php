<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->enum('type', ['percent', 'fixed']);
            $table->unsignedInteger('value'); // % or pence/cents
            $table->unsignedInteger('min_spend')->default(0);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('times_used')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('applies_to')->nullable(); // optional
            $table->timestamps();
        });

        // ✅ Insert default coupons
        DB::table('coupons')->insert([
            [
                'code' => '10OFF',
                'type' => 'percent',
                'value' => 10,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => '25OFF',
                'type' => 'percent',
                'value' => 25,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void {
        Schema::dropIfExists('coupons');
    }
};
