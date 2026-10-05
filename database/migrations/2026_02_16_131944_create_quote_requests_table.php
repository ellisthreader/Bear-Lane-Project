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
        Schema::create('quote_requests', function (Blueprint $table) {

            $table->id();

            // Contact Information
            $table->string('name');
            $table->string('email')->index();
            $table->string('phone');

            // Optional Budget (stored as string because of £ prefix)
            $table->string('budget')->nullable();

            // Design Details
            $table->text('details');

            // Store uploaded image paths as JSON array
            $table->json('images')->nullable();

            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quote_requests');
    }
};
