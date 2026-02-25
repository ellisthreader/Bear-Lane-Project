<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();                       // Primary Key
            $table->string('name');             // Human-readable name (e.g., Nightwear)
            $table->string('slug')->unique();   // URL-friendly slug
            $table->string('section');          // Top-level section (e.g., Women, Men, Girl, Boy)
            $table->string('subsection')->nullable(); // e.g., Clothing, Shoes, Accessories, or Age group
            $table->foreignId('parent_id')      // Optional parent category
                  ->nullable()
                  ->constrained('categories')
                  ->onDelete('cascade');
            $table->timestamps();               // created_at & updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
