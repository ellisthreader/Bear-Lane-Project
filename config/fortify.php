<?php

use Laravel\Fortify\Features;

return [

    /*
    |--------------------------------------------------------------------------
    | Fortify Guard
    |--------------------------------------------------------------------------
    |
    | Which authentication guard Fortify will use.
    |
    */
    'guard' => 'web',

    /*
    |--------------------------------------------------------------------------
    | Fortify Password Broker
    |--------------------------------------------------------------------------
    |
    | The password broker Fortify will use for resets.
    |
    */
    'passwords' => 'users',

    /*
    |--------------------------------------------------------------------------
    | Username / Email
    |--------------------------------------------------------------------------
    |
    | Defines your application's "username" field.
    |
    */
    'username' => 'email',
    'email' => 'email',

    /*
    |--------------------------------------------------------------------------
    | Lowercase Usernames
    |--------------------------------------------------------------------------
    */
    'lowercase_usernames' => true,

    /*
    |--------------------------------------------------------------------------
    | Home Path
    |--------------------------------------------------------------------------
    |
    | Where users will be redirected after login/register.
    |
    */
    'home' => '/home',

    /*
    |--------------------------------------------------------------------------
    | Fortify Routes Prefix / Subdomain
    |--------------------------------------------------------------------------
    */
    'prefix' => '',
    'domain' => null,

    /*
    |--------------------------------------------------------------------------
    | Fortify Routes Middleware
    |--------------------------------------------------------------------------
    */
    'middleware' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    */
    'limiters' => [
        'login' => 'login',
        'two-factor' => 'two-factor',
    ],

    /*
    |--------------------------------------------------------------------------
    | Register View Routes
    |--------------------------------------------------------------------------
    |
    | If true → Fortify registers Blade views for login/register.
    | If false → Only the backend routes exist (for SPA / React apps).
    |
    */
    'views' => false,

    /*
    |--------------------------------------------------------------------------
    | Features
    |--------------------------------------------------------------------------
    |
    | Each enabled feature must be placed here.
    |
    */
    'features' => [
        Features::registration(),
        Features::resetPasswords(),
        Features::updateProfileInformation(),
        Features::updatePasswords(),
        // Features::twoFactorAuthentication([
        //     'confirm' => true,
        //     'confirmPassword' => true,
        // ]),
    ],

];
