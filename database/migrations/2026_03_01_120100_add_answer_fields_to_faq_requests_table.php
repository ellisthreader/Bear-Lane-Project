<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faq_requests', function (Blueprint $table) {
            $table->text('answer')->nullable()->after('details');
            $table->foreignId('answered_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('answered_at')->nullable()->after('answered_by');
            $table->boolean('is_public')->default(false)->after('answered_at');

            $table->index(['status', 'is_public']);
            $table->index('answered_at');
        });
    }

    public function down(): void
    {
        Schema::table('faq_requests', function (Blueprint $table) {
            $table->dropIndex(['status', 'is_public']);
            $table->dropIndex(['answered_at']);
            $table->dropConstrainedForeignId('answered_by');
            $table->dropColumn(['answer', 'answered_at', 'is_public']);
        });
    }
};
