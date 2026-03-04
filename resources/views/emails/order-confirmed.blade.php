<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed</title>
</head>
<body style="margin:0; padding:0; background:#f8f5ee; font-family:Arial,Helvetica,sans-serif; color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ee; padding:28px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; background:#ffffff; border:1px solid #eadfc8; border-radius:18px; overflow:hidden;">
                <tr>
                    <td style="padding:24px 28px; border-bottom:1px solid #efe6d3; background:linear-gradient(135deg,#fff6e3 0%,#ffffff 72%);">
                        <img src="{{ $logoUrl }}" alt="Bear Lane" style="display:block; width:170px; max-width:100%; height:auto;">
                        <p style="margin:14px 0 0; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#8a6d2b; font-weight:700;">
                            Order Confirmation
                        </p>
                        <h1 style="margin:8px 0 0; font-size:24px; line-height:1.3; color:#1f1a13;">
                            Your order is confirmed
                        </h1>
                    </td>
                </tr>

                <tr>
                    <td style="padding:22px 28px 8px;">
                        <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#4b5563;">
                            Hi {{ trim(($order->first_name ?? '') . ' ' . ($order->last_name ?? '')) ?: 'there' }},
                        </p>
                        <p style="margin:0 0 14px; font-size:15px; line-height:1.7; color:#4b5563;">
                            Thank you for your order. We have received your payment and our team has started processing it.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px 28px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eadfc8; background:#fffcf4; border-radius:12px;">
                            <tr>
                                <td style="padding:14px 16px; font-size:14px; color:#1f2937;">
                                    <strong style="color:#1f1a13;">Order Number:</strong> {{ $order->order_number }}<br>
                                    <strong style="color:#1f1a13;">Email:</strong> {{ $order->email }}<br>
                                    <strong style="color:#1f1a13;">Total:</strong> £{{ number_format((float) $order->total, 2) }}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:16px 28px 6px;">
                        <p style="margin:0 0 10px; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; color:#8a6d2b; font-weight:700;">
                            Items
                        </p>
                        @foreach($order->items as $item)
                            <div style="padding:10px 0; border-top:1px solid #f3ebda;">
                                <p style="margin:0; font-size:15px; color:#1f1a13; font-weight:600;">
                                    {{ $item->product_name ?? optional($item->product)->name ?? 'Product' }}
                                </p>
                                <p style="margin:3px 0 0; font-size:13px; color:#6b7280;">
                                    Qty {{ (int) $item->quantity }} • £{{ number_format((float) $item->line_total, 2) }}
                                </p>
                            </div>
                        @endforeach
                    </td>
                </tr>

                <tr>
                    <td style="padding:20px 28px 4px;">
                        @if(!empty($invoiceUrl))
                            <a href="{{ $invoiceUrl }}" style="display:inline-block; background:#b89443; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; padding:12px 18px; border-radius:10px;">
                                Download Invoice
                            </a>
                        @endif
                    </td>
                </tr>

                <tr>
                    <td style="padding:12px 28px 4px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eadfc8; background:#fffaf0; border-radius:12px;">
                            <tr>
                                <td style="padding:14px 16px;">
                                    <p style="margin:0; font-size:14px; color:#3f3421; font-weight:700;">Leave us a review</p>
                                    <p style="margin:6px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                                        Once your order is delivered, sign in and leave a 5-star (or half-star) review with photos.
                                    </p>
                                    <a href="{{ $reviewUrl }}" style="display:inline-block; margin-top:10px; background:#ffffff; border:1px solid #d7be84; color:#7b6530; text-decoration:none; font-weight:700; font-size:13px; padding:10px 14px; border-radius:10px;">
                                        Leave us a review
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:14px 28px 24px;">
                        <p style="margin:0; font-size:13px; line-height:1.7; color:#6b7280;">
                            Need help with your order? Reply to this email and our support team will assist you.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:14px 20px; border-top:1px solid #efe6d3; background:#fffcf4; text-align:center;">
                        <p style="margin:0; font-size:12px; color:#8f7b56;">
                            © {{ date('Y') }} Bear Lane. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
