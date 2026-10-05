<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('coupons')->upsert(
            [
                [
                    'code' => '25OFF',
                    'type' => 'percent',
                    'value' => 25,
                    'min_spend' => 0,
                    'active' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
                [
                    'code' => '10OFF',
                    'type' => 'percent',
                    'value' => 10,
                    'min_spend' => 0,
                    'active' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
                [
                    // Stored as fixed type for schema compatibility;
                    // checkout logic treats this code as shipping-free.
                    'code' => 'FREESHIP',
                    'type' => 'fixed',
                    'value' => 0,
                    'min_spend' => 0,
                    'active' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            ],
            ['code'],
            ['type', 'value', 'min_spend', 'active', 'updated_at']
        );
    }

    public function down(): void
    {
        DB::table('coupons')->whereIn('code', ['25OFF', '10OFF', 'FREESHIP'])->delete();
    }
};

