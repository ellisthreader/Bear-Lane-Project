@extends('emails.layouts.base')

@php
    $emailTitle = 'Verify Your Email';
    $emailEyebrow = 'Account Security';
    $emailHeading = 'Verify your email address';
    $emailSubheading = 'Confirm your email to finish setting up your Bear Lane account.';
@endphp

@section('content')
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#5f5133;">
        Hi {{ $name }},
    </p>

    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5f5133;">
        Please confirm your email to activate your account.
    </p>

    <div style="text-align:center;margin:0 0 22px;">
        <a href="{{ $verificationUrl }}" style="display:inline-block;background:#C6A75E;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;padding:13px 28px;font-size:14px;">
            Verify Email
        </a>
    </div>

    <p style="margin:0;font-size:13px;line-height:1.7;color:#8a7a55;">
        If you did not create an account, you can safely ignore this email.
    </p>
@endsection
