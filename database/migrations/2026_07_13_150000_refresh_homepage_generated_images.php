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
        // Keep the generated catalogue imagery if this migration is rolled back.
    }
};
