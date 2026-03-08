<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Embroidery Artist Request</title>
</head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Arial,sans-serif;color:#2d2515;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f6f1;padding:24px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #eadfca;border-radius:14px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 28px 12px;text-align:center;">
                        <img src="{{ asset('images/BLText.png') }}" alt="Bear Lane" style="max-width:160px;height:auto;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 28px 22px;">
                        <h2 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#7a5c1e;">Thanks, {{ $name }}</h2>
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5b4a29;">
                            Your request to speak with an embroidery artist has been received.
                            We will review your details and contact you shortly.
                        </p>

                        <div style="margin:0 0 18px;padding:12px 14px;border:1px solid #e7d8b4;border-radius:10px;background:#fff9eb;">
                            <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d2b;font-weight:700;">Request Reference</p>
                            <p style="margin:0;font-size:16px;font-weight:700;color:#2d2515;">{{ $reference }}</p>
                        </div>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                            <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#6b5a34;">Email</td>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#2d2515;font-weight:600;text-align:right;">{{ $email }}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#6b5a34;">Phone</td>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#2d2515;font-weight:600;text-align:right;">{{ $phone !== '' ? $phone : 'Not provided' }}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#6b5a34;">Budget</td>
                                <td style="padding:8px 0;border-bottom:1px solid #f0e6d2;font-size:14px;color:#2d2515;font-weight:600;text-align:right;">{{ $budget !== '' ? $budget : 'Not provided' }}</td>
                            </tr>
                        </table>

                        <p style="margin:18px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d2b;font-weight:700;">Your Brief</p>
                        <div style="padding:12px 14px;border:1px solid #eadfca;border-radius:10px;background:#fcfaf5;font-size:14px;line-height:1.6;color:#3b301c;">
                            {{ $details }}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:14px 28px 24px;background:#fffdf7;border-top:1px solid #f0e6d2;">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b5a34;">
                            Status: <strong style="color:#2d2515;">Received</strong>. We will email you again with the next update.
                        </p>
                        <p style="margin:10px 0 0;font-size:12px;color:#8a7a59;">Bear Lane Studio</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
