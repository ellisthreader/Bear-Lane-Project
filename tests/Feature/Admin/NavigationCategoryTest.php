<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavigationCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_main_navigation_category_with_nested_children(): void
    {
        $this->actingAs(User::factory()->create(['is_admin' => true]));
        $created = $this->postJson('/admin/categories', ['name' => 'Gifts', 'parent_id' => null])
            ->assertSuccessful()
            ->assertJsonPath('category.parent_id', null)
            ->assertJsonPath('category.slug', 'gifts');
        $rootId = $created->json('category.id');

        $this->postJson('/admin/categories', ['name' => 'Birthday', 'parent_id' => $rootId])
            ->assertSuccessful()
            ->assertJsonPath('category.parent_id', $rootId);

        $this->getJson('/menu/categories')
            ->assertOk()
            ->assertJsonPath('gifts.tree.id', $rootId)
            ->assertJsonPath('gifts.tree.name', 'Gifts')
            ->assertJsonPath('gifts.tree.children.0.name', 'Birthday')
            ->assertJsonMissingPath('gifts/birthday');
        $this->assertDatabaseHas('categories', ['id' => $rootId, 'parent_id' => null]);
    }

    public function test_public_menu_includes_empty_custom_roots_but_not_children_as_main_categories(): void
    {
        $root = Category::create(['name' => 'Gifts', 'slug' => 'gifts', 'section' => 'Gifts']);
        Category::create(['name' => 'Cards', 'slug' => 'cards', 'section' => 'Gifts', 'parent_id' => $root->id]);
        Category::create(['name' => 'Home', 'slug' => 'home', 'section' => 'Home']);

        $this->getJson('/menu/categories')->assertOk()
            ->assertJsonPath('gifts.tree.children.0.name', 'Cards')
            ->assertJsonPath('home.tree.children', [])
            ->assertJsonMissingPath('cards')
            ->assertJsonStructure(['women', 'men', 'kids', 'sale']);
    }
}
