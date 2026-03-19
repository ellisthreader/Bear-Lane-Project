<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'parcel_courier')) {
                $table->string('parcel_courier', 40)->nullable()->after('weight');
            }
            if (!Schema::hasColumn('product_variants', 'parcel_size_tier')) {
                $table->string('parcel_size_tier', 20)->nullable()->after('parcel_courier');
            }
            if (!Schema::hasColumn('product_variants', 'parcel_length_cm')) {
                $table->decimal('parcel_length_cm', 10, 2)->nullable()->after('parcel_size_tier');
            }
            if (!Schema::hasColumn('product_variants', 'parcel_width_cm')) {
                $table->decimal('parcel_width_cm', 10, 2)->nullable()->after('parcel_length_cm');
            }
            if (!Schema::hasColumn('product_variants', 'parcel_height_cm')) {
                $table->decimal('parcel_height_cm', 10, 2)->nullable()->after('parcel_width_cm');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $drop = [];
            foreach ([
                'parcel_courier',
                'parcel_size_tier',
                'parcel_length_cm',
                'parcel_width_cm',
                'parcel_height_cm',
            ] as $column) {
                if (Schema::hasColumn('product_variants', $column)) {
                    $drop[] = $column;
                }
            }

            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
