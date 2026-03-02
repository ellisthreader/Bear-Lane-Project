<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $heading ?? 'Message from Bear Lane' }}</title>
</head>
<body style="margin:0; padding:0; background:#f6f7fb; font-family: Arial, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb; padding:28px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
                    <tr>
                        <td style="padding:24px 28px; background:linear-gradient(120deg, #fff9ea 0%, #ffffff 60%); border-bottom:1px solid #f1f5f9;">
                            <img src="{{ $logoUrl ?? asset('images/BLText.png') }}" alt="Bear Lane" style="display:block; width:170px; max-width:100%; height:auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;">
                            @if (($type ?? 'message') === 'warning')
                            <div style="display:inline-block; padding:6px 10px; border-radius:9999px; font-size:12px; font-weight:700; letter-spacing:0.02em; text-transform:uppercase; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">
                                Account warning
                            </div>
                            @endif

                            <h1 style="margin:16px 0 10px; font-size:24px; line-height:1.3; color:#111827;">
                                {{ $heading ?? 'Message from Bear Lane' }}
                            </h1>

                            <p style="margin:0 0 18px; color:#4b5563; font-size:15px; line-height:1.7;">
                                Hello {{ $userName ?? 'there' }},
                            </p>

                            <div style="margin:0; padding:16px; border:1px solid #e5e7eb; border-radius:12px; background:#fcfcfd; color:#111827; font-size:15px; line-height:1.75; white-space:pre-wrap;">
                                {{ $messageBody ?? '' }}
                            </div>

                            <p style="margin:22px 0 0; color:#6b7280; font-size:14px; line-height:1.7;">
                                Need help? Reply to this email and our team will assist you.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 28px; border-top:1px solid #f1f5f9; color:#9ca3af; font-size:12px;">
                            Bear Lane
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
