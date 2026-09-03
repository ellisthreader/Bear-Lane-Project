<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Keyed on the email this seeder has always used, so re-running it updates
        // the existing admin row in place rather than leaving a second admin
        // account behind still holding the old password.
        User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Mikela',
                'username' => 'MikelaAdmin',
                'password' => Hash::make((string) env('ADMIN_PASSWORD', '5t;V94pk801q')),
                'is_admin' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
