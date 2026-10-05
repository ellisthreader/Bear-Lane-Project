<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // Optional FK category field (Option 2)
            $table->foreignId('category_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('brand');
            $table->string('name');
            $table->string('slug')->unique();

            $table->decimal('price', 8, 2);
            $table->decimal('original_price', 8, 2)->nullable(); // Sale price

            $table->text('description')->nullable();

            $table->boolean('is_trending')->default(false);
            $table->boolean('is_sale')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
