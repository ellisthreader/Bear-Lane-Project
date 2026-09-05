<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $emailTitle ?? 'Bear Lane' }}</title>
</head>
<body style="margin:0;padding:0;background:#f6f2e8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2e8;padding:28px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border:1px solid #eadfc8;border-radius:20px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 30px;border-bottom:1px solid #efe6d3;background:linear-gradient(140deg,#fff4dc 0%,#ffffff 72%);">
                        @if (!empty($emailEyebrow))
                            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a6d2b;font-weight:700;">{{ $emailEyebrow }}</p>
                        @endif
                        <h1 style="margin:0;font-size:26px;line-height:1.25;color:#1f1a13;">{{ $emailHeading ?? 'Bear Lane' }}</h1>
                        @if (!empty($emailSubheading))
                            <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">{{ $emailSubheading }}</p>
                        @endif
                    </td>
                </tr>

                <tr>
                    <td style="padding:24px 30px 22px;">
                        @yield('content')
                    </td>
                </tr>

                <tr>
                    <td style="padding:20px 30px;border-top:1px solid #efe6d3;background:#fffcf4;">
                        <p style="margin:0;font-size:14px;line-height:1.75;color:#5f5133;">
                            Regards,<br>
                            <strong style="color:#8a6d2b;">Bear Lane Team</strong>
                        </p>
                        <img src="{{ $logoUrl ?? asset('images/BLText.png') }}" alt="Bear Lane" style="display:block;width:140px;max-width:100%;height:auto;margin:14px auto 0;">
                        <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#8f7b56;">© 2026 Bear Lane. All rights reserved.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
