<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductType;

class ProductTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Trending',
            'Sale',
            'Hoodies',
            'Coats & Jackets',
            'Shoes',
        ];

        foreach ($types as $t) {
            ProductType::create(['name' => $t]);
        }
    }
}
