<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCategory;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Men',
            'Women',
            'Babies',
            'Shoes',
            'Accessories',
            'Teddies',
        ];

        foreach ($categories as $cat) {
            ProductCategory::create(['name' => $cat]);
        }
    }
}
