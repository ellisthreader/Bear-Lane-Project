@extends('emails.layouts.base')

@php
    $emailTitle = 'Your Quote';
    $emailEyebrow = 'Quote Summary';
    $emailHeading = 'Your instant quote';
    $emailSubheading = 'Here is the pricing summary you requested.';
@endphp

@section('content')
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4b5563;">
        Hello {{ $name }},
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8dcc0;border-radius:14px;background:#fffbf2;">
        <tr>
            <td style="padding:16px 18px;">
                <p style="margin:0 0 8px;font-size:12px;color:#8a6d2b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Total</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#1f1a13;">£{{ number_format($total, 2) }}</p>
            </td>
        </tr>
    </table>

    <p style="margin:16px 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a6d2b;font-weight:700;">Items</p>
    <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.8;">
        @foreach($items as $item)
            <li>{{ $item['quantity'] }} × {{ $item['productType'] }} ({{ $item['designType'] }}, {{ $item['sizeCategory'] }}: {{ $item['size'] }})</li>
        @endforeach
    </ul>
@endsection
