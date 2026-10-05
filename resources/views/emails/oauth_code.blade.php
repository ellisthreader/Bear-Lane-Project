@extends('emails.layouts.base')

@php
    $emailTitle = 'Login Verification';
    $emailEyebrow = 'Security';
    $emailHeading = 'Login verification code';
    $emailSubheading = 'Use this code to securely continue logging into your account.';
@endphp

@section('content')
    <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
        Enter the verification code below to complete your sign in.
    </p>

    <div style="margin:18px 0;padding:22px 16px;background:#fffbf2;border:1px solid #e8dcc0;border-radius:14px;text-align:center;">
        <span style="font-size:34px;letter-spacing:10px;font-weight:700;color:#C6A75E;">{{ $code }}</span>
    </div>

    <p style="margin:0;font-size:14px;color:#777777;line-height:1.7;">
        This code expires in <strong style="color:#C6A75E;">10 minutes</strong>.
    </p>
    <p style="margin:10px 0 0;font-size:14px;color:#777777;line-height:1.7;">
        If you did not request this login, you can safely ignore this email.
    </p>
@endsection
