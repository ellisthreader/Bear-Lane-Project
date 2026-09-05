@extends('emails.layouts.base')

@php
    $emailTitle = 'Reset Password';
    $emailEyebrow = 'Account Security';
    $emailHeading = 'Reset your password';
    $emailSubheading = 'Use the secure link below to choose a new password.';
@endphp

@section('content')
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#5f5133;">
        Hello <strong>{{ $user->username }}</strong>,
    </p>

    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5f5133;">
        We received a request to reset your password. If this was you, click below.
    </p>

    <div style="text-align:center;margin:0 0 22px;">
        <a href="{{ url("/reset-password/{$token}?email={$user->email}") }}" style="display:inline-block;background:#C6A75E;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;padding:13px 28px;font-size:14px;">
            Reset Password
        </a>
    </div>

    <p style="margin:0;font-size:13px;line-height:1.7;color:#8a7a55;">
        This link expires in {{ config('auth.passwords.'.config('auth.defaults.passwords').'.expire') }} minutes.
    </p>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.7;color:#8a7a55;">
        If you did not request this, you can safely ignore this email.
    </p>
@endsection
