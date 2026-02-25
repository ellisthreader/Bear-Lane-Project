<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // -------------------------------------------
        // ✅ Register all your seeders in correct order
        // -------------------------------------------
        $this->call([
            CategorySeeder::class, // Must run first
            ProductSeeder::class,  // Depends on categories
        ]);
    }
}
