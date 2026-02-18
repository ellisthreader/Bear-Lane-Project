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
     * Show the profile page (view mode)
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
     * Show the profile edit page
     */
    public function edit(Request $request)
    {
        $user = $request->user();
        $remaining = $this->getRemainingCooldown($user);
        $cooldownEnds = $this->getCooldownEndsAt($user);

        Log::info("ProfileController: Edit page loaded for User ID {$user->id}", [
            'remaining_seconds' => $remaining,
            'cooldown_ends_at' => $cooldownEnds,
        ]);

        return inertia('Profile/EditProfilePage', [
            'auth' => [
                'user' => array_merge($user->toArray(), [
                    'remaining_seconds' => $remaining,
                    'cooldown_ends_at' => $cooldownEnds,
                    'server_time' => Carbon::now('UTC')->toIso8601String(),
                ]),
            ],
        ]);
    }

    /**
     * Update the authenticated user's profile
     */
    public function update(Request $request)
    {
        $user = $request->user();
        Log::info("ProfileController: Update request received for User ID {$user->id}", $request->all());

        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'username' => 'sometimes|string|max:255|unique:users,username,' . $user->id,
                'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
                'phone' => 'sometimes|nullable|string|max:20',
                'password' => 'sometimes|nullable|string|min:6|confirmed',
                'profile_photo' => 'sometimes|image|mimes:jpg,jpeg,png,webp|max:2048',
            ]);
        } catch (ValidationException $e) {
            $errors = $e->validator->errors()->toArray();
            Log::warning("ProfileController: Validation failed for User ID {$user->id}", $errors);

            // Username suggestions
            if (isset($errors['username'])) {
                $username = $request->input('username');
                $suggestions = [];
                if ($username) {
                    for ($i = 1; $i <= 5; $i++) {
                        $newName = $username . $i;
                        if (!User::where('username', $newName)->exists()) {
                            $suggestions[] = $newName;
                        }
                    }
                }

                return response()->json([
                    'errors' => $errors,
                    'suggestions' => $suggestions,
                ], 422);
            }

            throw $e;
        }

        // Handle profile photo upload
        if ($request->hasFile('profile_photo')) {
            $file = $request->file('profile_photo');

            // Delete old avatar if exists
            if ($user->profile_photo_path && !str_starts_with($user->profile_photo_path, 'http')) {
                Storage::disk('public')->delete($user->profile_photo_path);
                Log::info("Deleted old avatar for User ID {$user->id}", ['old_avatar' => $user->profile_photo_path]);
            }

            $path = $file->store('avatars', 'public');
            $validated['profile_photo_path'] = $path;
            $validated['profile_photo_url'] = asset("storage/{$path}");
            Log::info("Stored new profile photo for User ID {$user->id}", ['path' => $path]);
        }

        // Handle password
        if (!empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);
        $user->refresh();
        Log::info("ProfileController: Profile updated for User ID {$user->id}", ['user' => $user->toArray()]);

        $remaining = $this->getRemainingCooldown($user);
        $cooldownEnds = $this->getCooldownEndsAt($user);

        return response()->json([
            'success' => true,
            'user' => array_merge($user->toArray(), [
                'remaining_seconds' => $remaining,
                'cooldown_ends_at' => $cooldownEnds,
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Generate a random avatar from Unsplash and save locally
     */
    public function generateRandomAvatar(Request $request)
    {
        $user = $request->user();
        $remaining = $this->getRemainingCooldown($user);

        if ($remaining > 0) {
            return response()->json([
                'success' => false,
                'message' => "You can only generate a new avatar once every {$this->cooldownMinutes} minutes.",
                'remaining_seconds' => $remaining,
                'cooldown_ends_at' => $this->getCooldownEndsAt($user),
                'server_time' => Carbon::now('UTC')->toIso8601String(),
            ], 429);
        }

        $randomAvatarUrl = $this->unsplash->getRandomMushroomImage();
        if (!$randomAvatarUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Could not fetch avatar from Unsplash.',
            ], 500);
        }

        try {
            $contents = Http::get($randomAvatarUrl)->body();
            $filename = 'avatars/' . uniqid() . '.jpg';
            Storage::disk('public')->put($filename, $contents);
            $avatarPath = $filename;
            $avatarUrl = asset("storage/{$filename}");
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to download avatar.',
            ], 500);
        }

        $user->update([
            'profile_photo_path' => $avatarPath,
            'profile_photo_url' => $avatarUrl,
            'last_avatar_generated_at' => Carbon::now('UTC'),
        ]);
        $user->refresh();

        return response()->json([
            'success' => true,
            'user' => array_merge($user->toArray(), [
                'remaining_seconds' => $this->getRemainingCooldown($user),
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
