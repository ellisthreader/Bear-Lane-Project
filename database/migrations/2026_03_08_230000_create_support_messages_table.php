<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('quote_request_id')->nullable()->constrained('quote_requests')->nullOnDelete();
            $table->string('source_type', 40)->default('support_form')->index();
            $table->string('name', 180);
            $table->string('email', 180)->index();
            $table->string('phone', 40)->nullable();
            $table->string('subject', 220)->nullable();
            $table->text('message');
            $table->json('attachments')->nullable();
            $table->json('metadata')->nullable();
            $table->string('status', 32)->default('new')->index();
            $table->timestamp('admin_read_at')->nullable()->index();
            $table->timestamp('admin_replied_at')->nullable();
            $table->foreignId('replied_by_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
