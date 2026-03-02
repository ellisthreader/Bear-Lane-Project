<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BearLane Live Chat Transcript</title>
</head>
<body style="margin:0; padding:0; background:#f8f5ee; font-family: Arial, sans-serif; color:#2b2315;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5ee; padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px; background:#ffffff; border:1px solid #eadfc8; border-radius:18px; overflow:hidden;">
                    <tr>
                        <td style="padding:22px 26px; border-bottom:1px solid #efe6d3; background:linear-gradient(135deg,#fff6e3 0%,#ffffff 72%);">
                            <p style="margin:0; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; font-weight:700; color:#8a6d2b;">BearLane Support</p>
                            <h1 style="margin:10px 0 0; font-size:24px; line-height:1.35; color:#2d2414;">Your Live Chat Transcript</h1>
                            <p style="margin:8px 0 0; font-size:13px; color:#6f6041;">
                                Chat #{{ $chatId }} · Generated {{ $generatedAt }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 20px;">
                            @forelse ($messages as $message)
                                @php
                                    $isSupport = in_array($message['sender_type'], ['admin', 'system'], true);
                                    $bg = $isSupport ? '#fff7e9' : '#f8fafc';
                                    $border = $isSupport ? '#e8d9b3' : '#dbe3ef';
                                    $titleColor = $isSupport ? '#7b5f27' : '#334155';
                                @endphp
                                <div style="margin:0 0 12px; padding:14px 14px; border:1px solid {{ $border }}; border-radius:12px; background:{{ $bg }};">
                                    <p style="margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:{{ $titleColor }};">
                                        {{ $message['sender'] }} · {{ $message['time'] }}
                                    </p>
                                    @if (!empty($message['is_image']) && !empty($message['image_url']))
                                        <a href="{{ $message['image_url'] }}" target="_blank" rel="noreferrer" style="display:inline-block; text-decoration:none;">
                                            <img src="{{ $message['image_url'] }}" alt="Chat image" style="display:block; max-width:320px; width:100%; height:auto; border:1px solid #e5dcc8; border-radius:10px; background:#fff;">
                                        </a>
                                        <p style="margin:8px 0 0; font-size:12px; color:#7a6a46;">Image attachment</p>
                                    @else
                                        <p style="margin:0; font-size:14px; line-height:1.7; color:#2f2a20; white-space:pre-wrap;">{{ $message['content'] }}</p>
                                    @endif
                                </div>
                            @empty
                                <p style="margin:0; font-size:14px; color:#5f5541;">No messages were recorded in this chat.</p>
                            @endforelse
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px; border-top:1px solid #efe6d3; background:#fffcf4;">
                            <p style="margin:0; font-size:12px; color:#8b7a54;">
                                Thank you for contacting BearLane. If you need further support, reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
