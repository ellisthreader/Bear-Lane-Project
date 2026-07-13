<?php

use Database\Seeders\HomepageProductSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        (new HomepageProductSeeder())->run();
    }

    public function down(): void
    {
        // Preserve products and storefront selections if this migration is rolled back.
    }
};
