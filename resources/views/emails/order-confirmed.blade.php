@extends('emails.layouts.base')

@php
    $emailTitle = 'Order Confirmed';
    $emailEyebrow = 'Order Confirmation';
    $emailHeading = 'Your order is confirmed';
    $emailSubheading = 'Payment has been received and your order is now being prepared.';
@endphp

@section('content')
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4b5563;">
        Hi {{ trim(($order->first_name ?? '') . ' ' . ($order->last_name ?? '')) ?: 'there' }},
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
        Thanks for your order. We will keep you updated as your order progresses.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #e8dcc0;border-radius:14px;background:#fffbf2;">
        <tr>
            <td style="padding:16px 18px;">
                <p style="margin:0 0 8px;font-size:12px;color:#8a6d2b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Order Details</p>
                <p style="margin:0;font-size:14px;line-height:1.85;color:#1f2937;">
                    <strong style="color:#1f1a13;">Order Number:</strong> {{ $order->order_number }}<br>
                    <strong style="color:#1f1a13;">Email:</strong> {{ $order->email }}<br>
                    <strong style="color:#1f1a13;">Total Paid:</strong> £{{ number_format((float) $order->total, 2) }}
                </p>
            </td>
        </tr>
    </table>

    <p style="margin:18px 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8a6d2b;font-weight:700;">Items</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        @foreach($order->items as $item)
            <tr>
                <td style="padding:12px 0;border-top:1px solid #f3ebda;">
                    <p style="margin:0;font-size:15px;color:#1f1a13;font-weight:600;">
                        {{ $item->product_name ?? optional($item->product)->name ?? 'Product' }}
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
                        Qty {{ (int) $item->quantity }} • £{{ number_format((float) $item->line_total, 2) }}
                    </p>
                </td>
            </tr>
        @endforeach
    </table>

    @if(!empty($invoiceUrl))
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:16px;">
            <tr>
                <td style="border-radius:12px;background:#b89443;">
                    <a href="{{ $invoiceUrl }}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
                        Download Invoice
                    </a>
                </td>
            </tr>
        </table>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #eadfc8;background:#fffaf0;border-radius:14px;">
        <tr>
            <td style="padding:16px 18px;">
                <p style="margin:0;font-size:14px;color:#3f3421;font-weight:700;">Share your feedback</p>
                <p style="margin:7px 0 0;font-size:13px;line-height:1.65;color:#6b7280;">
                    Once delivered, sign in and leave a review with photos to help other customers.
                </p>
                <a href="{{ $reviewUrl }}" style="display:inline-block;margin-top:11px;background:#ffffff;border:1px solid #d7be84;color:#7b6530;text-decoration:none;font-weight:700;font-size:13px;padding:10px 14px;border-radius:10px;">
                    Leave a review
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
        Need help with this order? Reply to this email and our team will assist you.
    </p>
@endsection
