<?php

namespace Tests\Feature\Admin;

use App\Models\StoreSetting;
use App\Models\User;
use App\Services\StoreSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HomepageEditorTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    /** Real image bytes so mimetype validation passes without the GD extension. */
    private function image(string $name = 'photo.png'): UploadedFile
    {
        $temp = tempnam(sys_get_temp_dir(), 'bl-editor-');
        copy(public_path('images/BL-Logo.png'), $temp);

        return new UploadedFile($temp, $name, 'image/png', null, true);
    }

    private function upload(User $admin): string
    {
        return $this->actingAs($admin)
            ->postJson('/admin/homepage-editor/upload', ['image' => $this->image()])
            ->assertOk()
            ->json('path');
    }

    private function validDesign(array $overrides = []): array
    {
        return array_replace_recursive([
            'colors' => ['accent' => '#C6A75E', 'text' => '#2D2515', 'surface' => '#FFFCF4'],
            'fonts' => ['heading' => 'system', 'body' => 'system'],
        ], $overrides);
    }

    public function test_only_admins_can_use_the_editor_endpoints(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        foreach ([['get', 'state'], ['get', 'products'], ['post', 'upload'], ['post', 'save']] as [$method, $endpoint]) {
            $this->actingAs($user)->{$method . 'Json'}("/admin/homepage-editor/{$endpoint}")->assertStatus(403);
        }

        auth()->logout();
        $this->postJson('/admin/homepage-editor/save', [])->assertStatus(401);
    }

    public function test_state_returns_empty_content_and_stored_design_paths(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/admin/homepage-editor/state')
            ->assertOk()
            ->assertJsonPath('content.texts', [])
            ->assertJsonPath('content.sections.order', [])
            ->assertJsonPath('design.colors.accent', '#C6A75E')
            ->assertJsonPath('max_hero_slides', StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES)
            ->assertJsonStructure(['categories', 'category_links']);
    }

    public function test_saved_content_is_sanitised_and_reaches_the_public_homepage(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $upload = $this->upload($admin);

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'content' => [
                'texts' => [
                    'idea.title' => "  Made <script>alert(1)</script><b>by you</b>\n  today I <3 bears ",
                    'bad id!' => 'ignored',
                ],
                'links' => [
                    'idea.cta1' => '/personalise',
                    'idea.cta2' => 'javascript:alert(1)',
                    'footer.social.1' => '',
                    'hero.button' => '//evil.example',
                    'footer.col.1.links.1' => 'https://example.com/a',
                ],
                'images' => [
                    'how.steps.1.image' => $upload,
                    'how.steps.2.image' => ['path' => 'images/steps/Step2.webp'],
                    'how.steps.3.image' => '../../.env',
                    'how.steps.4.image' => 'https://evil.example/x.png',
                ],
                'styles' => [
                    'idea.title' => ['color' => '#ff0000', 'background' => 'url(javascript:1)'],
                    'idea.cta1' => ['background' => 'red'],
                ],
                'lists' => ['how.steps' => ['1', '2', 'n-abc', '2', 'bad id']],
                // "hidden" is the format earlier versions saved deleted sections in.
                'sections' => ['order' => ['idea', 'hero', 'nope', 'idea', 'custom-ab12'], 'hidden' => ['reviews', 'footer']],
            ],
        ])->assertOk()->assertJsonPath('success', true);

        $content = $this->getJson('/admin/homepage-editor/state')->assertOk()->json('content');

        $this->assertSame('Made alert(1)by you today I <3 bears', $content['texts']['idea.title']);
        $this->assertArrayNotHasKey('bad id!', $content['texts']);
        $this->assertSame('/personalise', $content['links']['idea.cta1']);
        $this->assertSame('', $content['links']['footer.social.1']);
        $this->assertSame('https://example.com/a', $content['links']['footer.col.1.links.1']);
        $this->assertArrayNotHasKey('idea.cta2', $content['links']);
        $this->assertArrayNotHasKey('hero.button', $content['links']);
        $this->assertSame($upload, $content['images']['how.steps.1.image']['path']);
        $this->assertStringContainsString($upload, $content['images']['how.steps.1.image']['url']);
        $this->assertSame('images/steps/Step2.webp', $content['images']['how.steps.2.image']['path']);
        $this->assertCount(2, $content['images']);
        $this->assertSame(['color' => '#FF0000'], $content['styles']['idea.title']);
        $this->assertArrayNotHasKey('idea.cta1', $content['styles']);
        $this->assertSame(['1', '2', 'n-abc'], $content['lists']['how.steps']);
        $this->assertSame(['idea', 'hero', 'custom-ab12'], $content['sections']['order']);
        $this->assertSame(['section.reviews' => 'Section: Reviews'], (array) $content['hidden']);
        $this->assertArrayNotHasKey('hidden', $content['sections']);

        auth()->logout();
        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('storeSettings.homepage_content.texts', ['idea.title' => 'Made alert(1)by you today I <3 bears'])
            ->where('storeSettings.homepage_content.hidden', ['section.reviews' => 'Section: Reviews']));
    }

    public function test_moves_sizes_deleted_elements_and_added_blocks_are_validated_and_saved(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'content' => [
                'styles' => [
                    'idea.cta1' => ['x' => 120.4, 'y' => -35, 'size' => 22, 'color' => '#abcdef'],
                    'idea.title' => ['x' => 999999, 'y' => -999999, 'size' => 1],
                    'idea.body' => ['x' => 0, 'y' => 0, 'size' => 'huge'],
                ],
                'hidden' => [
                    'idea.body' => "  Paragraph: <b>We help</b> ambitious ideas  ",
                    'section.reviews' => 'Section: Reviews',
                    'bad id!' => 'ignored',
                ],
                'lists' => ['extra.how' => ['tab12', 'bcd34', 'tab12']],
                'texts' => ['extra.how.tab12' => 'A brand new line of text'],
                'links' => ['extra.how.bcd34' => '/category/sale'],
            ],
        ])->assertOk();

        $content = $this->getJson('/admin/homepage-editor/state')->json('content');

        $this->assertSame(['color' => '#ABCDEF', 'x' => 120, 'y' => -35, 'size' => 22], $content['styles']['idea.cta1']);
        $this->assertSame(['x' => 4000, 'y' => -4000, 'size' => 8], $content['styles']['idea.title']);
        $this->assertArrayNotHasKey('idea.body', $content['styles']);
        $this->assertSame('Paragraph: We help ambitious ideas', $content['hidden']['idea.body']);
        $this->assertSame('Section: Reviews', $content['hidden']['section.reviews']);
        $this->assertArrayNotHasKey('bad id!', $content['hidden']);
        $this->assertSame(['tab12', 'bcd34'], $content['lists']['extra.how']);
    }

    public function test_saving_without_content_leaves_existing_content_alone(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'content' => ['texts' => ['idea.title' => 'Keep me']],
        ])->assertOk();

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'design' => $this->validDesign(['colors' => ['accent' => '#112233']]),
        ])->assertOk()->assertJsonPath('design.colors.accent', '#112233');

        $this->assertSame('Keep me', StoreSetting::where('key', StoreSettingsService::KEY_HOMEPAGE_CONTENT)->first()->value['texts']['idea.title']);
    }

    public function test_upload_accepts_images_and_only_allows_svg_for_logos(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        $path = $this->upload($admin);
        $this->assertStringStartsWith(StoreSettingsService::HOMEPAGE_CONTENT_UPLOAD_DIR . '/', $path);
        Storage::disk('public')->assertExists($path);

        $svg = fn () => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');

        $this->actingAs($admin)->postJson('/admin/homepage-editor/upload', ['image' => $svg()])
            ->assertStatus(422)->assertJsonValidationErrors('image');
        $this->actingAs($admin)->postJson('/admin/homepage-editor/upload', ['image' => $svg(), 'kind' => 'logo'])
            ->assertOk();

        $this->actingAs($admin)->postJson('/admin/homepage-editor/upload', [
            'image' => UploadedFile::fake()->createWithContent('notes.txt', 'not an image'),
        ])->assertStatus(422);
    }

    public function test_design_and_categories_save_by_path_and_replaced_files_are_removed(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        [$logo, $heroOne, $heroTwo, $circle] = [$this->upload($admin), $this->upload($admin), $this->upload($admin), $this->upload($admin)];

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'design' => $this->validDesign([
                'nav_logo_path' => $logo,
                'hero_slide_paths' => ['hero.webp', $heroOne, $heroTwo],
            ]),
            'categories' => [
                ['id' => '', 'name' => 'Mugs', 'href' => '/category/mugs', 'image_path' => $circle],
                ['id' => '', 'name' => 'Cards', 'href' => 'javascript:alert(1)', 'image_path' => 'images/Category/sale.jpeg'],
            ],
        ])->assertOk()
            ->assertJsonPath('design.images.nav_logo_path', $logo)
            ->assertJsonPath('design.images.hero_slide_paths', ['hero.webp', $heroOne, $heroTwo])
            ->assertJsonPath('categories.0.name', 'Mugs')
            ->assertJsonPath('categories.1.href', '/category/cards');

        $this->getJson('/site-design')->assertOk()->assertJsonCount(3, 'images.hero_slides');
        $this->assertStringEndsWith('/hero.webp', $this->getJson('/site-design')->json('images.hero_slides.0'));

        // Dropping a hero slide, the logo and a circle image deletes those files; the kept ones stay.
        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'design' => $this->validDesign(['nav_logo_path' => '', 'hero_slide_paths' => ['hero.webp', $heroTwo]]),
            'categories' => [['id' => 'mugs', 'name' => 'Mugs', 'href' => '/category/mugs', 'image_path' => 'images/Category/sale.jpeg']],
        ])->assertOk();

        Storage::disk('public')->assertMissing($logo);
        Storage::disk('public')->assertMissing($heroOne);
        Storage::disk('public')->assertMissing($circle);
        Storage::disk('public')->assertExists($heroTwo);
    }

    public function test_unknown_image_paths_are_rejected_and_nothing_is_half_saved(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'content' => ['texts' => ['idea.title' => 'Should not persist']],
            'design' => $this->validDesign(['nav_logo_path' => 'settings/homepage-content/does-not-exist.png']),
        ])->assertStatus(422)->assertJsonValidationErrors('design.nav_logo_path');

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', [
            'design' => $this->validDesign(['footer_logo_path' => '../.env']),
        ])->assertStatus(422);

        $this->assertDatabaseMissing('store_settings', ['key' => StoreSettingsService::KEY_HOMEPAGE_CONTENT]);
    }

    public function test_abandoned_uploads_are_pruned_on_the_next_save_but_fresh_ones_are_kept(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        [$abandoned, $fresh] = [$this->upload($admin), $this->upload($admin)];

        touch(Storage::disk('public')->path($abandoned), time() - 3 * 86400);

        $this->actingAs($admin)->postJson('/admin/homepage-editor/save', ['content' => ['texts' => ['idea.title' => 'Hi']]])->assertOk();

        Storage::disk('public')->assertMissing($abandoned);
        Storage::disk('public')->assertExists($fresh);
    }

    public function test_validation_rejects_bad_colours_fonts_and_empty_category_lists(): void
    {
        $this->actingAs($this->admin())->postJson('/admin/homepage-editor/save', [
            'design' => $this->validDesign(['colors' => ['accent' => 'red'], 'fonts' => ['heading' => 'Comic Sans']]),
            'categories' => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['design.colors.accent', 'design.fonts.heading', 'categories']);
    }
}
