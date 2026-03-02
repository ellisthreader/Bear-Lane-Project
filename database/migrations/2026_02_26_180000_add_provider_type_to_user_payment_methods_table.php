<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_payment_methods', function (Blueprint $table) {
            $table->string('provider_type', 20)->default('card')->after('stripe_payment_method_id');
        });

        DB::table('user_payment_methods')->whereNull('provider_type')->update(['provider_type' => 'card']);
    }

    public function down(): void
    {
        Schema::table('user_payment_methods', function (Blueprint $table) {
            $table->dropColumn('provider_type');
        });
    }
};

