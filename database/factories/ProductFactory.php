<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Product;
use App\Models\Category;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition()
    {
        return [
            'category_id' => Category::factory(), // creates a category if none exists
            'brand' => $this->faker->company(),
            'name' => $this->faker->words(3, true),
            'slug' => $this->faker->unique()->slug(),
            'price' => $this->faker->randomFloat(2, 50, 500),
            'original_price' => null, // optional, can be set in seeder
            'description' => $this->faker->paragraph(),
            'is_trending' => $this->faker->boolean(20), // 20% chance trending
            'is_sale' => $this->faker->boolean(15), // 15% chance on sale
        ];
    }
}
