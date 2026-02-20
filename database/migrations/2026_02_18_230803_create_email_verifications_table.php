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
        Schema::create('email_verifications', function (Blueprint $table) {
            $table->id();

            // Email being verified
            $table->string('email')->index();

            // Hashed verification code
            $table->string('code');

            // Expiration timestamp
            $table->timestamp('expires_at');

            // Track failed attempts
            $table->unsignedTinyInteger('attempts')->default(0);

            // Optional: IP for security tracking
            $table->string('ip_address')->nullable();

            $table->timestamps();

            // Automatically delete expired codes (optional optimization)
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_verifications');
    }
};
