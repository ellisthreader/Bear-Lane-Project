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
        // -------------------------------
        // Users Table
        // -------------------------------
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_verification_sent_at')->nullable();
            $table->string('phone', 20)->nullable();         // optional phone
            $table->text('bio')->nullable();                // optional bio
            $table->string('password');
            $table->boolean('is_admin')->default(false);    // admin flag
            $table->rememberToken();
            $table->string('avatar')->default('avatars/default.png');
            $table->string('avatar_url')->nullable();       // optional avatar URL
            $table->timestamp('last_avatar_generated_at')->nullable();
            $table->timestamps();
        });

        // -------------------------------
        // Password Reset Tokens
        // -------------------------------
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // -------------------------------
        // Sessions Table
        // -------------------------------
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
