<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\UpdatesUserPasswords;
use Illuminate\Support\Facades\Log;

class UpdateUserPassword implements UpdatesUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and update the user's password.
     *
     * @param  User  $user
     * @param  array<string, string>  $input
     */
    public function update(User $user, array $input): void
    {
        Log::info('[UpdateUserPassword] Updating password for user', [
            'user_id' => $user->id,
            'input_keys' => array_keys($input)
        ]);

        Validator::make($input, [
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => $this->passwordRules(),
        ], [
            'current_password.current_password' => __('The provided password does not match your current password.'),
        ])->validateWithBag('updatePassword');

        $user->forceFill([
            'password' => Hash::make($input['password']),
        ])->save();

        Log::info('[UpdateUserPassword] Password updated successfully', [
            'user_id' => $user->id
        ]);
    }
}
