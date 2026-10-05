<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->decimal('rating', 2, 1);
            $table->string('title', 120)->nullable();
            $table->text('message');
            $table->unsignedTinyInteger('images_count')->default(0);

            $table->string('moderation_status', 40)->default('approved');
            $table->string('moderation_reason', 255)->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamp('reviewed_at')->nullable();

            $table->string('username_snapshot', 120)->nullable();
            $table->text('avatar_url_snapshot')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();

            $table->unique('order_item_id');
            $table->index(['product_id', 'moderation_status', 'is_visible'], 'product_reviews_product_visibility_idx');
            $table->index('created_at');
        });

        Schema::create('product_review_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_review_id')->constrained('product_reviews')->cascadeOnDelete();
            $table->text('image_path');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['product_review_id', 'sort_order'], 'product_review_images_order_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_review_images');
        Schema::dropIfExists('product_reviews');
    }
};
