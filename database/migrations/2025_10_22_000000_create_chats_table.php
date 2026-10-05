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
        Schema::create('chats', function (Blueprint $table) {
            $table->id();

            // ✅ Logged-in users
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // ✅ Guests (unique browser session)
            $table->uuid('session_id')->nullable()->unique();

            // ✅ Chat state
            $table->boolean('is_closed')->default(false);

            // ✅ Who deleted the chat (Admin/Guest), nullable
            $table->string('deleted_by')->nullable();

            // ✅ Whether an admin has joined this chat yet
            $table->boolean('admin_joined')->default(false);

            // ✅ Optional chat title
            $table->string('title')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};
