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
        // Add age_group to categories (nullable, only relevant for kids)
        Schema::table('categories', function (Blueprint $table) {
            $table->string('age_group')
                  ->nullable()
                  ->after('subsection')
                  ->comment('Age group: Baby & Newborn, 2-8, 9-14 (only for kids)');
        });

        // Create the pivot table for category-product relationshipz
        Schema::create('category_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                  ->constrained('products')
                  ->onDelete('cascade');
            $table->foreignId('category_id')
                  ->constrained('categories')
                  ->onDelete('cascade');
            $table->timestamps();

            $table->unique(['product_id', 'category_id']); // prevent duplicate mappings
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove age_group from categories
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('age_group');
        });

        // Drop the pivot table
        Schema::dropIfExists('category_product');
    }
};
