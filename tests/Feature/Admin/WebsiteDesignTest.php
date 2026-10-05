<?php

namespace Tests\Feature\Admin;

use App\Models\StoreSetting;
use App\Models\User;
use App\Services\StoreSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WebsiteDesignTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    /** Real image bytes so mimetype validation passes without the GD extension. */
    private function image(string $name): UploadedFile
    {
        $source = public_path('images/BL-Logo.png');
        $temp = tempnam(sys_get_temp_dir(), 'bl-design-');
        copy($source, $temp);

        return new UploadedFile($temp, $name, 'image/png', null, true);
    }

    public function test_non_admins_cannot_open_the_page(): void
    {
        $this->actingAs(User::factory()->create(['is_admin' => false]))
            ->get('/admin/other/website-design')
            ->assertStatus(403);
    }

    public function test_admin_page_renders_with_defaults(): void
    {
        $this->actingAs($this->admin())
            ->get('/admin/other/website-design')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Other/WebsiteDesign')
                ->where('design.colors.accent', '#C6A75E')
                ->where('defaults.fonts.body', 'system')
                ->where('maxHeroSlides', StoreSettingsService::WEBSITE_DESIGN_MAX_HERO_SLIDES));
    }

    public function test_public_site_design_endpoint_returns_json(): void
    {
        $this->getJson('/site-design')
            ->assertOk()
            ->assertJsonPath('colors.surface', '#FFFCF4')
            ->assertJsonPath('images.hero_slides', []);
    }

    public function test_saving_persists_colours_fonts_and_images(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/admin/other/website-design', [
            'colors' => ['accent' => '#3b5ba9', 'text' => '#141B2D', 'surface' => '#F6F8FC'],
            'fonts' => ['heading' => 'Poppins', 'body' => 'Inter'],
            'nav_logo' => $this->image('logo.png'),
            'nav_logo_reset' => '0',
            'footer_logo_reset' => '0',
            'hero_order' => json_encode(['upload:0', 'upload:1']),
            'hero_uploads' => [
                $this->image('one.png'),
                $this->image('two.png'),
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('design.colors.accent', '#3B5BA9')
            ->assertJsonPath('design.fonts.heading', 'Poppins')
            ->assertJsonCount(2, 'design.images.hero_slides');

        $design = $response->json('design');
        Storage::disk('public')->assertExists($design['images']['nav_logo_path']);
        foreach ($design['images']['hero_slide_paths'] as $path) {
            Storage::disk('public')->assertExists($path);
        }

        $stored = StoreSetting::where('key', StoreSettingsService::KEY_WEBSITE_DESIGN)->first();
        $this->assertNotNull($stored);
        $this->assertSame('#3B5BA9', $stored->value['colors']['accent']);

        // Shared Inertia props expose the public shape to the storefront.
        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('storeSettings.design.colors.accent', '#3B5BA9')
            ->where('storeSettings.design.fonts.body', 'Inter')
            ->has('storeSettings.design.images.hero_slides', 2));

        // Reorder, drop a slide, and reset the nav logo: unreferenced files are removed.
        [$first, $second] = $design['images']['hero_slide_paths'];
        $navLogoPath = $design['images']['nav_logo_path'];

        $second_response = $this->actingAs($admin)->postJson('/admin/other/website-design', [
            'colors' => $design['colors'],
            'fonts' => $design['fonts'],
            'nav_logo_reset' => '1',
            'footer_logo_reset' => '0',
            'hero_order' => json_encode([$second, 'not-a-real-path']),
        ]);

        $second_response->assertOk()
            ->assertJsonPath('design.images.nav_logo_path', '')
            ->assertJsonPath('design.images.hero_slide_paths', [$second]);

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertMissing($navLogoPath);
        Storage::disk('public')->assertExists($second);
    }

    public function test_validation_rejects_bad_colours_and_fonts(): void
    {
        $this->actingAs($this->admin())->postJson('/admin/other/website-design', [
            'colors' => ['accent' => 'red', 'text' => '#141B2D', 'surface' => '#F6F8FC'],
            'fonts' => ['heading' => 'Comic Sans', 'body' => 'system'],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['colors.accent', 'fonts.heading']);
    }
}
