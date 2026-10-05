@php
    $__site = [];
    try {
        $__site = app(\App\Services\StoreSettingsService::class)->getSiteSettings();
    } catch (\Throwable $e) {
        $__site = [];
    }
    $__siteName = trim((string) ($__site['site_name'] ?? '')) ?: 'Bear Lane';
    $__supportEmail = trim((string) ($__site['support_email'] ?? ''));
    $__supportPhone = trim((string) ($__site['contact_phone'] ?? ''));
    $__logo = $logoUrl ?? (($__site['logo_url'] ?? null) ?: asset('images/BLText.png'));
    $__year = date('Y');
@endphp
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <title>{{ $emailTitle ?? $__siteName }}</title>
    <style>
        @media only screen and (max-width: 620px) {
            .bl-container { width: 100% !important; }
            .bl-pad { padding-left: 20px !important; padding-right: 20px !important; }
            .bl-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
            .bl-stack-gap { padding-top: 10px !important; padding-left: 0 !important; padding-right: 0 !important; }
            .bl-hide-sm { display: none !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background:#F4EFE4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1F1A13;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{{ $emailPreheader ?? ($emailSubheading ?? '') }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4EFE4;">
    <tr>
        <td align="center" style="padding:32px 12px;">
            <table role="presentation" class="bl-container" width="620" cellpadding="0" cellspacing="0" border="0" style="width:620px;max-width:620px;">

                {{-- Brand header --}}
                <tr>
                    <td align="center" style="padding:0 0 18px;">
                        <img src="{{ $__logo }}" alt="{{ $__siteName }}" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;">
                    </td>
                </tr>

                <tr>
                    <td style="background:#FFFFFF;border:1px solid #EBE2CF;border-radius:20px;overflow:hidden;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            {{-- Heading band --}}
                            <tr>
                                <td style="height:6px;background:#C6A75E;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="bl-pad" style="padding:30px 36px 22px;background:#FFFCF4;border-bottom:1px solid #F0E8D6;">
                                    @if (!empty($emailEyebrow))
                                        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">{{ $emailEyebrow }}</p>
                                    @endif
                                    <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:800;color:#1F1A13;">{{ $emailHeading ?? $__siteName }}</h1>
                                    @if (!empty($emailSubheading))
                                        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#6B5A34;">{{ $emailSubheading }}</p>
                                    @endif
                                </td>
                            </tr>

                            {{-- Content --}}
                            <tr>
                                <td class="bl-pad" style="padding:28px 36px 30px;font-size:15px;line-height:1.7;color:#3B3020;">
                                    @yield('content')
                                </td>
                            </tr>

                            {{-- Footer --}}
                            <tr>
                                <td class="bl-pad" style="padding:22px 36px 26px;background:#FFFCF4;border-top:1px solid #F0E8D6;">
                                    <p style="margin:0;font-size:14px;line-height:1.7;color:#5F5133;">
                                        Kind regards,<br>
                                        <strong style="color:#8A6D2B;">The {{ $__siteName }} Team</strong>
                                    </p>
                                    @if ($__supportEmail !== '' || $__supportPhone !== '')
                                        <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:#7A6640;">
                                            @if ($__supportEmail !== '')
                                                <a href="mailto:{{ $__supportEmail }}" style="color:#8A6D2B;text-decoration:none;">{{ $__supportEmail }}</a>
                                            @endif
                                            @if ($__supportEmail !== '' && $__supportPhone !== '')
                                                <span style="color:#C9BC9C;">&nbsp;&middot;&nbsp;</span>
                                            @endif
                                            @if ($__supportPhone !== '')
                                                <span>{{ $__supportPhone }}</span>
                                            @endif
                                        </p>
                                    @endif
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding:18px 8px 0;">
                        <p style="margin:0;font-size:12px;line-height:1.6;color:#9A8B68;">&copy; {{ $__year }} {{ $__siteName }}. All rights reserved.</p>
                        <p style="margin:4px 0 0;font-size:12px;line-height:1.6;color:#9A8B68;"><a href="{{ url('/') }}" style="color:#9A8B68;text-decoration:underline;">{{ preg_replace('#^https?://#', '', url('/')) }}</a></p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
