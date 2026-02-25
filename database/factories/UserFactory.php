<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    protected $model = \App\Models\User::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'username' => $this->faker->unique()->userName(), // added username
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'), // default password
            'remember_token' => Str::random(10),
        ];
    }
}
