<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $allowedSlugs = [
            'women',
            'women/clothing',
            'women/t-shirt',
            'women/accessories',
            'women/bears',
            'women/shoes',
            'women/trainers',
            'men',
            'men/clothing',
            'men/t-shirt',
            'men/accessories',
            'men/bears',
            'men/shoes',
            'men/trainers',
            'kids',
            'kids/clothing',
            'kids/t-shirt',
            'kids/accessories',
            'kids/bears',
            'kids/shoes',
            'kids/trainers',
        ];

        Category::query()
            ->where(function ($query) {
                $query->where('slug', 'sale')
                    ->orWhere('slug', 'like', 'women%')
                    ->orWhere('slug', 'like', 'men%')
                    ->orWhere('slug', 'like', 'kids%');
            })
            ->whereNotIn('slug', $allowedSlugs)
            ->delete();

        $women = $this->firstOrCreateCategory('Women', 'women', null);
        $men = $this->firstOrCreateCategory('Men', 'men', null);
        $kids = $this->firstOrCreateCategory('Kids', 'kids', null);

        $womenClothing = $this->firstOrCreateCategory('Clothing', 'women/clothing', $women->id);
        $womenAccessories = $this->firstOrCreateCategory('Accessories', 'women/accessories', $women->id);
        $womenShoes = $this->firstOrCreateCategory('Shoes', 'women/shoes', $women->id);
        $this->firstOrCreateCategory('T-shirt', 'women/t-shirt', $womenClothing->id);
        $this->firstOrCreateCategory('Bears', 'women/bears', $womenAccessories->id);
        $this->firstOrCreateCategory('Trainers', 'women/trainers', $womenShoes->id);

        $menClothing = $this->firstOrCreateCategory('Clothing', 'men/clothing', $men->id);
        $menAccessories = $this->firstOrCreateCategory('Accessories', 'men/accessories', $men->id);
        $menShoes = $this->firstOrCreateCategory('Shoes', 'men/shoes', $men->id);
        $this->firstOrCreateCategory('T-shirt', 'men/t-shirt', $menClothing->id);
        $this->firstOrCreateCategory('Bears', 'men/bears', $menAccessories->id);
        $this->firstOrCreateCategory('Trainers', 'men/trainers', $menShoes->id);

        $kidsClothing = $this->firstOrCreateCategory('Clothing', 'kids/clothing', $kids->id);
        $kidsAccessories = $this->firstOrCreateCategory('Accessories', 'kids/accessories', $kids->id);
        $kidsShoes = $this->firstOrCreateCategory('Shoes', 'kids/shoes', $kids->id);
        $this->firstOrCreateCategory('T-shirt', 'kids/t-shirt', $kidsClothing->id);
        $this->firstOrCreateCategory('Bears', 'kids/bears', $kidsAccessories->id);
        $this->firstOrCreateCategory('Trainers', 'kids/trainers', $kidsShoes->id);
    }

    private function firstOrCreateCategory(string $name, string $slug, ?int $parentId): Category
    {
        return Category::query()->firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'parent_id' => $parentId,
                'section' => $parentId ? 'Navigation' : $name,
                'subsection' => null,
                'age_group' => null,
            ]
        );
    }
}
