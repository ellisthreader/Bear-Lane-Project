<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\ProductVariant;
use App\Models\Product;

class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition()
    {
        $colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'];
        $sizes = ['S', 'M', 'L', 'XL', 'XXL'];

        return [
            'product_id' => Product::factory(),
            'sku' => $this->faker->unique()->ean8(),
            'colour' => $this->faker->randomElement($colors),
            'size' => $this->faker->randomElement($sizes),
            'price' => null, // inherit product price by default
            'original_price' => null,
            'stock' => $this->faker->numberBetween(0, 50),
        ];
    }
}
