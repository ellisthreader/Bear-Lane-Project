@extends('emails.layouts.base')

@php
    $emailTitle = $heading ?? 'Message from Bear Lane';
    $emailEyebrow = (($type ?? 'message') === 'warning') ? 'Account Warning' : 'Account Message';
    $emailHeading = $heading ?? 'Message from Bear Lane';
    $emailSubheading = 'Please review the message below from our team.';
@endphp

@section('content')
    <p style="margin:0 0 18px;color:#4b5563;font-size:15px;line-height:1.7;">
        Hello {{ $userName ?? 'there' }},
    </p>

    <div style="margin:0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fcfcfd;color:#111827;font-size:15px;line-height:1.75;white-space:pre-wrap;">
        {{ $messageBody ?? '' }}
    </div>

    @if(!empty($orderNumber))
        <p style="margin:12px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            Order reference: <strong style="color:#1f2937;">#{{ $orderNumber }}</strong>
        </p>
    @endif

    <p style="margin:18px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">
        Need help? Reply to this email and our team will assist you.
    </p>
@endsection
