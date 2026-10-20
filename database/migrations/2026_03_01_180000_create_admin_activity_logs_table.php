<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admin_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('admin_user_name')->nullable();
            $table->string('activity_type', 120)->index();
            $table->string('icon', 40)->default('sparkles');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('subject_type')->nullable()->index();
            $table->unsignedBigInteger('subject_id')->nullable()->index();
            $table->string('subject_label')->nullable();
            $table->string('route_name')->nullable()->index();
            $table->string('request_method', 16)->nullable();
            $table->string('path')->nullable();
            $table->string('ip_address', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['created_at', 'activity_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_activity_logs');
    }
};
