<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('categories', 'sort_order')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->unsignedInteger('sort_order')->default(0)->after('parent_id');
            });
        }

        // Seed a stable alphabetical order per parent so existing menus keep their current look.
        $rows = DB::table('categories')->orderBy('parent_id')->orderBy('name')->get(['id', 'parent_id']);
        $position = [];
        foreach ($rows as $row) {
            $parentKey = (string) ($row->parent_id ?? 'root');
            $position[$parentKey] = ($position[$parentKey] ?? 0) + 1;
            DB::table('categories')->where('id', $row->id)->update(['sort_order' => $position[$parentKey]]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('categories', 'sort_order')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropColumn('sort_order');
            });
        }
    }
};
