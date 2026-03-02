<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('images', function (Blueprint $table) {
            $table->decimal('restricted_left', 8, 6)->nullable()->after('path');
            $table->decimal('restricted_top', 8, 6)->nullable()->after('restricted_left');
            $table->decimal('restricted_width', 8, 6)->nullable()->after('restricted_top');
            $table->decimal('restricted_height', 8, 6)->nullable()->after('restricted_width');
        });
    }

    public function down(): void
    {
        Schema::table('images', function (Blueprint $table) {
            $table->dropColumn([
                'restricted_left',
                'restricted_top',
                'restricted_width',
                'restricted_height',
            ]);
        });
    }
};
