<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create the specific user
        User::create([
            'name' => 'Ellis Threader',
            'username' => 'ellis.threader', // required
            'email' => 'ellis.threader3001@gmail.com',
            'password' => bcrypt('password123'), // password: "password123"
            'email_verified_at' => now(),
        ]);

        // Optional: Create 10 additional random users
        User::factory(10)->create();
    }
}
