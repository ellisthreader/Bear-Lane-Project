@extends('emails.layouts.base')

@php
    $emailTitle = config('app.name');
    $emailEyebrow = 'Notification';
    $emailHeading = $greeting ?? ($level === 'error' ? __('Whoops!') : __('Hello!'));
    $emailSubheading = null;
@endphp

@section('content')
    @foreach ($introLines as $line)
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4b5563;">{{ $line }}</p>
    @endforeach

    @isset($actionText)
        <div style="text-align:center;margin:20px 0;">
            <a href="{{ $actionUrl }}" style="display:inline-block;background:#C6A75E;color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:999px;text-decoration:none;">
                {{ $actionText }}
            </a>
        </div>
    @endisset

    @foreach ($outroLines as $line)
        <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#6b7280;">{{ $line }}</p>
    @endforeach

    @isset($actionText)
        <p style="margin:12px 0 0;font-size:12px;line-height:1.7;color:#8f7b56;word-break:break-word;">
            If you're having trouble clicking "{{ $actionText }}", copy and paste this URL into your browser:<br>
            <span style="color:#8a6d2b;">{{ $displayableActionUrl }}</span>
        </p>
    @endisset
@endsection
