@extends('emails.layouts.base')

@php
    $emailTitle = 'Live Chat Transcript';
    $emailEyebrow = 'Bear Lane Support';
    $emailHeading = 'Your live chat transcript';
    $emailSubheading = 'Chat #' . $chatId . ' · Generated ' . $generatedAt;
@endphp

@section('content')
    @forelse ($messages as $message)
        @php
            $isSupport = in_array($message['sender_type'], ['admin', 'system'], true);
            $bg = $isSupport ? '#fff7e9' : '#f8fafc';
            $border = $isSupport ? '#e8d9b3' : '#dbe3ef';
            $titleColor = $isSupport ? '#7b5f27' : '#334155';
        @endphp
        <div style="margin:0 0 12px;padding:14px 14px;border:1px solid {{ $border }};border-radius:12px;background:{{ $bg }};">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:{{ $titleColor }};">
                {{ $message['sender'] }} · {{ $message['time'] }}
            </p>
            @if (!empty($message['is_image']) && !empty($message['image_url']))
                <a href="{{ $message['image_url'] }}" target="_blank" rel="noreferrer" style="display:inline-block;text-decoration:none;">
                    <img src="{{ $message['image_url'] }}" alt="Chat image" style="display:block;max-width:320px;width:100%;height:auto;border:1px solid #e5dcc8;border-radius:10px;background:#fff;">
                </a>
                <p style="margin:8px 0 0;font-size:12px;color:#7a6a46;">Image attachment</p>
            @else
                <p style="margin:0;font-size:14px;line-height:1.7;color:#2f2a20;white-space:pre-wrap;">{{ $message['content'] }}</p>
            @endif
        </div>
    @empty
        <p style="margin:0;font-size:14px;color:#5f5541;">No messages were recorded in this chat.</p>
    @endforelse

    <p style="margin:8px 0 0;font-size:13px;line-height:1.65;color:#6f6041;">
        Thank you for contacting Bear Lane. If you need further support, reply to this email.
    </p>
@endsection
