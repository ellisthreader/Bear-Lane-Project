<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('sku')->unique();  // Unique identifier per variant

            $table->string('colour');    // e.g. "Black"
            $table->string('size');      // e.g. "L"

            // Variant-level pricing (optional overrides)
            $table->decimal('price', 8, 2)->nullable();
            $table->decimal('original_price', 8, 2)->nullable();

            $table->integer('stock')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
