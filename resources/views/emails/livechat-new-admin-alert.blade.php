@extends('emails.layouts.base')

@php
    $emailTitle = 'New Live Chat Waiting';
    $emailEyebrow = 'Bear Lane Support';
    $emailHeading = 'New live chat waiting';
    $emailSubheading = 'Chat #' . $chatId . ' · ' . $createdAt;
@endphp

@section('content')
    <div style="margin:0 0 14px;padding:14px;border:1px solid #e8d9b3;border-radius:12px;background:#fff7e9;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#7b5f27;">Chat Details</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#2f2a20;">
            <strong>Type:</strong> {{ $chatType }}<br>
            <strong>Customer:</strong> {{ $customerName }}<br>
            @if (!empty($customerEmail))
                <strong>Email:</strong> {{ $customerEmail }}<br>
            @endif
            @if (!empty($sessionPreview))
                <strong>Guest Session:</strong> {{ $sessionPreview }}
            @endif
        </p>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td style="border-radius:10px;background:#b89443;">
                <a href="{{ $chatUrl }}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                    Open Support Command Centre
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:12px 0 0;font-size:12px;color:#8b7a54;">This alert is sent to admin accounts only.</p>
@endsection
