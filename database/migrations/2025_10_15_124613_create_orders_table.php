<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * -------------------------------
         * Orders Table
         * -------------------------------
         */
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // User association
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');

            // Order info
            $table->string('order_number')->unique();
            $table->string('email');

            // Pricing breakdown
            $table->decimal('subtotal', 10, 2);
            $table->string('discount_code')->nullable();
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('vat', 10, 2)->default(0);
            $table->decimal('shipping', 10, 2)->default(0);
            $table->decimal('total', 10, 2);

            $table->string('invoice_path')->nullable();
            // Payment
            $table->string('payment_intent_id')->nullable();

            // Status
            $table->string('status')->default('pending');

            // Address info
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('postcode')->nullable();
            $table->string('country')->nullable();

            $table->timestamps();
        });

        /**
         * -------------------------------
         * Order Items Table
         * -------------------------------
         */
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();

            // Foreign key to orders
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');

            // Optional product ID (if you have a products table)
            $table->unsignedBigInteger('product_id')->nullable();

            // Product details
            $table->string('product_name');
            $table->string('image_url')->nullable(); // store product image path or filename

            // Pricing
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
