@php
    $heading = $greeting ?? ($level === 'error' ? __('Whoops!') : __('Hello!'));
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{ config('app.name') }}</title>
</head>
<body style="background-color:#f8f8f8;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center">

    <!-- Main Card -->
    <table width="620" cellpadding="0" cellspacing="0" role="presentation"
           style="background:#ffffff;border-radius:16px;overflow:hidden;
                  box-shadow:0 12px 35px rgba(0,0,0,0.06);margin-top:40px;">

        <!-- Header -->
        <tr>
            <td align="center" style="padding:45px 30px 20px;">
                <img src="YOUR_LOGO_URL_HERE" width="140" style="display:block;margin-bottom:25px;">
                <div style="width:70px;height:3px;background:#C6A75E;margin:0 auto;"></div>
            </td>
        </tr>

        <!-- Content -->
        <tr>
            <td style="padding:45px 55px 35px;">

                <!-- Heading -->
                <h1 style="font-size:28px;font-weight:700;color:#111;
                           margin-bottom:30px;text-align:center;">
                    {{ $heading }}
                </h1>

                <!-- Intro Lines -->
                @foreach ($introLines as $line)
                    <p style="font-size:16px;color:#555;line-height:1.8;margin-bottom:22px;">
                        {{ $line }}
                    </p>
                @endforeach

                <!-- CTA -->
                @isset($actionText)
                <div style="text-align:center;margin:45px 0;">
                    <a href="{{ $actionUrl }}"
                       style="background:#C6A75E;
                              color:#ffffff;
                              font-size:16px;
                              font-weight:600;
                              padding:16px 42px;
                              border-radius:50px;
                              text-decoration:none;
                              display:inline-block;
                              box-shadow:0 8px 22px rgba(198,167,94,0.35);
                              letter-spacing:0.6px;">
                        {{ $actionText }}
                    </a>
                </div>
                @endisset

                <!-- Outro Lines -->
                @foreach ($outroLines as $line)
                    <p style="font-size:15px;color:#666;line-height:1.7;margin-bottom:20px;">
                        {{ $line }}
                    </p>
                @endforeach

                <!-- Salutation -->
            <p style="font-size:15px;color:#444;margin-top:35px;">
                Regards,<br>
                <strong style="color:#C6A75E;font-weight:600;">
                    Bear Lane Team
                </strong>
            </p>

            </td>
        </tr>

        <!-- Divider Footer -->
        <tr>
            <td style="background:#fafafa;padding:30px 40px;
                       text-align:center;border-top:1px solid #eeeeee;">
                <p style="font-size:13px;color:#999;margin:0;">
                    © {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
                </p>
            </td>
        </tr>

    </table>

    <!-- Subcopy -->
    @isset($actionText)
    <table width="620" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td style="padding:25px;text-align:center;">
                <p style="font-size:13px;color:#aaaaaa;line-height:1.6;margin:0;">
                    If you're having trouble clicking the
                    "<strong>{{ $actionText }}</strong>" button,
                    copy and paste this URL into your browser:
                </p>
                <p style="font-size:12px;color:#C6A75E;word-break:break-all;margin-top:8px;">
                    {{ $displayableActionUrl }}
                </p>
            </td>
        </tr>
    </table>
    @endisset

</td>
</tr>
</table>

</body>
</html>