<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'length')) {
                $table->decimal('length', 10, 2)->nullable()->after('description');
            }
            if (!Schema::hasColumn('products', 'width')) {
                $table->decimal('width', 10, 2)->nullable()->after('length');
            }
            if (!Schema::hasColumn('products', 'height')) {
                $table->decimal('height', 10, 2)->nullable()->after('width');
            }
            if (!Schema::hasColumn('products', 'dimension_unit')) {
                $table->string('dimension_unit', 8)->nullable()->after('height');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'dimension_unit')) {
                $table->dropColumn('dimension_unit');
            }
            if (Schema::hasColumn('products', 'height')) {
                $table->dropColumn('height');
            }
            if (Schema::hasColumn('products', 'width')) {
                $table->dropColumn('width');
            }
            if (Schema::hasColumn('products', 'length')) {
                $table->dropColumn('length');
            }
        });
    }
};

