<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New BearLane Live Chat</title>
</head>
<body style="margin:0; padding:0; background:#f8f5ee; font-family: Arial, sans-serif; color:#2b2315;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5ee; padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border:1px solid #eadfc8; border-radius:18px; overflow:hidden;">
                    <tr>
                        <td style="padding:22px 26px; border-bottom:1px solid #efe6d3; background:linear-gradient(135deg,#fff6e3 0%,#ffffff 72%);">
                            <p style="margin:0; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; font-weight:700; color:#8a6d2b;">BearLane Support</p>
                            <h1 style="margin:10px 0 0; font-size:24px; line-height:1.35; color:#2d2414;">New Live Chat Waiting</h1>
                            <p style="margin:8px 0 0; font-size:13px; color:#6f6041;">
                                Chat #{{ $chatId }} · {{ $createdAt }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 20px;">
                            <div style="margin:0 0 14px; padding:14px; border:1px solid #e8d9b3; border-radius:12px; background:#fff7e9;">
                                <p style="margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:#7b5f27;">Chat Details</p>
                                <p style="margin:0; font-size:14px; line-height:1.7; color:#2f2a20;">
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
                                    <td style="border-radius:10px; background:#b89443;">
                                        <a href="{{ $chatUrl }}" style="display:inline-block; padding:12px 18px; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">
                                            Open Support Command Centre
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px; border-top:1px solid #efe6d3; background:#fffcf4;">
                            <p style="margin:0; font-size:12px; color:#8b7a54;">
                                This alert is sent to admin accounts only.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
