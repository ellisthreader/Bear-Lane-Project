<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // Full, sane set of categories matching typical product slugs used in ProductSeeder
        // Add / remove entries here as your product list grows.
        $categories = [
            // -------------- WOMEN (Adult) --------------
            ['section' => 'Women', 'subsection' => 'Clothing', 'name' => 'T-Shirts'],
            ['section' => 'Women', 'subsection' => 'Clothing', 'name' => 'Hoodies & Sweatshirts'],
            ['section' => 'Women', 'subsection' => 'Clothing', 'name' => 'Jackets & Coats'],
            ['section' => 'Women', 'subsection' => 'Shoes', 'name' => 'Trainers'],
            ['section' => 'Women', 'subsection' => 'Accessories', 'name' => 'Hats'],
            ['section' => 'Women', 'subsection' => 'Accessories', 'name' => 'Scarves'],

            // -------------- MEN (Adult) --------------
            ['section' => 'Men', 'subsection' => 'Clothing', 'name' => 'T-Shirts'],
            ['section' => 'Men', 'subsection' => 'Clothing', 'name' => 'Hoodies & Sweatshirts'],
            ['section' => 'Men', 'subsection' => 'Clothing', 'name' => 'Jackets & Coats'],
            ['section' => 'Men', 'subsection' => 'Shoes', 'name' => 'Trainers'],
            ['section' => 'Men', 'subsection' => 'Accessories', 'name' => 'Hats'],
            ['section' => 'Men', 'subsection' => 'Accessories', 'name' => 'Scarves'],

            // -------------- KIDS: Baby & Newborn (Girl & Boy) --------------
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'T-Shirts', 'age_group' => 'Baby & Newborn'],
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => 'Baby & Newborn'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Nightwear', 'age_group' => 'Baby & Newborn'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => 'Baby & Newborn'],

            // -------------- KIDS: 2-8 (Girl & Boy) --------------
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'T-Shirts', 'age_group' => '2-8'],
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => '2-8'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Nightwear', 'age_group' => '2-8'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => '2-8'],

            // -------------- KIDS: 9-14 (Girl & Boy) --------------
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'T-Shirts', 'age_group' => '9-14'],
            ['section' => 'Girl', 'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => '9-14'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Nightwear', 'age_group' => '9-14'],
            ['section' => 'Boy',  'subsection' => 'Clothing', 'name' => 'Jackets & Coats', 'age_group' => '9-14'],
        ];

        // Build slug for each category consistently.
        foreach ($categories as &$category) {
            $slugParts = [];

            if (!empty($category['age_group'])) {
                // include age_group early for kids slugs like "2-8-girl-clothing-t-shirts"
                $slugParts[] = $category['age_group'];
            }

            // normalize section (lowercase, slug-friendly)
            $slugParts[] = $category['section'];
            $slugParts[] = $category['subsection'];
            $slugParts[] = $category['name'];

            // join and slugify
            $category['slug'] = Str::slug(implode('-', $slugParts));

            // store canonical values for DB fields (so updateOrCreate doesn't miss anything)
            // ensure keys exist (age_group may be absent)
            if (!isset($category['age_group'])) {
                $category['age_group'] = null;
            }
        }
        unset($category);

        // Insert or update categories using slug (idempotent and safe)
        foreach ($categories as $cat) {
            Category::updateOrCreate(
                ['slug' => $cat['slug']],
                [
                    'name'       => $cat['name'],
                    'slug'       => $cat['slug'],
                    'section'    => $cat['section'],
                    'subsection' => $cat['subsection'],
                    'parent_id'  => null,
                    'age_group'  => $cat['age_group'],
                ]
            );
        }

        $this->command->info("✅ Categories seeded/updated successfully (slugs created or updated).");
    }
}
