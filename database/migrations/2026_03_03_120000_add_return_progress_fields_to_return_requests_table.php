<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('return_requests', 'customer_shipped_at')) {
                $table->timestamp('customer_shipped_at')->nullable()->after('received_at');
            }

            if (!Schema::hasColumn('return_requests', 'exchange_offered_at')) {
                $table->timestamp('exchange_offered_at')->nullable()->after('refunded_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            foreach (['customer_shipped_at', 'exchange_offered_at'] as $column) {
                if (Schema::hasColumn('return_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
