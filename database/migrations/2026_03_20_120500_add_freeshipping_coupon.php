<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('coupons')->updateOrInsert(
            ['code' => 'FREESHIPPING'],
            [
                // Keep schema-compatible type, business logic handles this code as shipping discount.
                'type' => 'fixed',
                'value' => 400, // pence (£4.00)
                'min_spend' => 0,
                'usage_limit' => null,
                'active' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        DB::table('coupons')->where('code', 'FREESHIPPING')->delete();
    }
};
