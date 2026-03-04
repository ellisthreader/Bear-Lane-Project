<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Shippo signed URLs can exceed 255 chars.
        DB::statement('ALTER TABLE `return_requests` MODIFY `shippo_label_url` TEXT NULL');
        DB::statement('ALTER TABLE `orders` MODIFY `shippo_label_url` TEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `return_requests` MODIFY `shippo_label_url` VARCHAR(255) NULL');
        DB::statement('ALTER TABLE `orders` MODIFY `shippo_label_url` VARCHAR(255) NULL');
    }
};
