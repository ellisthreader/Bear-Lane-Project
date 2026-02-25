<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use App\Services\UnsplashService;
use App\Models\User;

class ProfileController extends Controller
{
    protected UnsplashService $unsplash;
    protected int $cooldownMinutes = 5;

    public function __construct(UnsplashService $unsplash)
    {
        $this->unsplash = $unsplash;
    }

    /**
     * Show profile (view mode)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('Profile/ProfileView', [
            'auth' => [
                'user' => $user->toArray(),
            ],
        ]);
    }

    /**
     * Show edit page
     */
    public function edit(Request $request)
    {
        $user = $request->user();

        return inertia('Profile/EditProfilePage', [
            'auth' => [
                'user' => array_merge($user->toArray(), [
                    'remaining_seconds' => $this->getRemainingCooldown($user),
                    'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                    'server_time' => Carbon::now('UTC')->toIso8601String(),
                ]),
            ],
        ]);
    }

    /**
     * Update profile (FIXED FOR INERTIA)
     */
    public function update(Request $request)
    {
        $user = $request->user();

        Log::info("Profile update for user {$user->id}");

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        // Handle profile photo
        if ($request->hasFile('profile_photo')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            $path = $request->file('profile_photo')->store('avatars', 'public');

            $validated['avatar'] = $path;
        }

        $user->update($validated);

        return redirect()
            ->route('profile.edit')
            ->with('success', 'Profile updated successfully.');
    }

    /**
     * Generate random avatar (STAYS JSON FOR AXIOS)
     */
    public function generateRandomAvatar(Request $request)
    {
        $user = $request->user();
        $remaining = $this->getRemainingCooldown($user);

        if ($remaining > 0) {
            return response()->json([
                'success' => false,
                'message' => "You can only generate a new avatar once every {$this->cooldownMinutes} minutes.",
                'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ], 429);
        }

        $randomAvatarUrl = $this->unsplash->getRandomMushroomImage();

        if (!$randomAvatarUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Could not fetch avatar.',
            ], 500);
        }

        $contents = Http::get($randomAvatarUrl)->body();
        $filename = 'avatars/' . uniqid() . '.jpg';
        Storage::disk('public')->put($filename, $contents);

        $user->update([
            'avatar' => $filename,
            'last_avatar_generated_at' => Carbon::now('UTC'),
        ]);

        $user->refresh();

        return response()->json([
            'success' => true,
            'user' => array_merge($user->toArray(), [
                'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ]),
        ]);
    }

    private function getRemainingCooldown($user): int
    {
        if (!$user->last_avatar_generated_at) return 0;

        $last = Carbon::parse($user->last_avatar_generated_at, 'UTC');
        $elapsed = $last->diffInSeconds(Carbon::now('UTC'));

        return max(0, ($this->cooldownMinutes * 60) - $elapsed);
    }

    private function getCooldownEndsAt($user): ?string
    {
        if (!$user->last_avatar_generated_at) return null;

        return Carbon::parse($user->last_avatar_generated_at, 'UTC')
            ->addMinutes($this->cooldownMinutes)
            ->toIso8601String();
    }
}
