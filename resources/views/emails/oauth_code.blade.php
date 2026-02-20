<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login Verification</title>
</head>
<body style="background-color: #f6f6f6; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 0; margin: 0;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center">

    <!-- Main Container -->
    <table width="620" cellpadding="0" cellspacing="0" role="presentation"
           style="background-color: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                  box-shadow: 0 12px 35px rgba(0,0,0,0.06);
                  margin-top: 40px;">

        <!-- Header / Logo -->
        <tr>
            <td align="center" style="padding: 45px 30px 25px 30px;">
                <img src="YOUR_LOGO_URL_HERE"
                     alt="Company Logo"
                     width="150"
                     style="display: block; margin-bottom: 25px;">

                <!-- Gold Divider -->
                <div style="width: 70px; height: 3px; background-color: #C6A75E; margin: 0 auto;"></div>
            </td>
        </tr>

        <!-- Content -->
        <tr>
            <td style="padding: 40px 55px 40px 55px; text-align: center;">

                <h1 style="font-size: 26px;
                           font-weight: 700;
                           color: #111111;
                           margin-bottom: 20px;">
                    Login Verification
                </h1>

                <p style="font-size: 16px;
                          color: #555555;
                          line-height: 1.7;
                          margin-bottom: 30px;">
                    Use the verification code below to securely continue logging into your account.
                </p>

                <!-- Verification Code Box -->
                <div style="background-color: #fafafa;
                            border: 1px solid #eeeeee;
                            border-radius: 14px;
                            padding: 28px 20px;
                            margin: 35px 0;">

                    <span style="font-size: 34px;
                                 letter-spacing: 10px;
                                 font-weight: 700;
                                 color: #C6A75E;">
                        {{ $code }}
                    </span>
                </div>

                <p style="font-size: 14px;
                          color: #777777;
                          margin-top: 10px;">
                    This code will expire in
                    <strong style="color: #C6A75E;">10 minutes</strong>.
                </p>

                <p style="font-size: 14px;
                          color: #999999;
                          line-height: 1.6;
                          margin-top: 30px;">
                    If you did not request this login, you can safely ignore this email.
                </p>

            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #fafafa;
                       padding: 30px 40px;
                       text-align: center;
                       border-top: 1px solid #eeeeee;">

                <p style="font-size: 14px; color: #444444; margin-bottom: 6px;">
                    Thank you,
                </p>

                <p style="font-size: 16px;
                          font-weight: 600;
                          color: #C6A75E;
                          margin: 0;">
                    Bear Lane Team
                </p>
            </td>
        </tr>
    </table>

    <!-- Bottom Copyright -->
    <table width="620" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td style="padding: 20px; text-align: center;">
                <p style="font-size: 12px; color: #aaaaaa; margin: 0;">
                    © {{ date('Y') }} Your Company Name. All rights reserved.
                </p>
            </td>
        </tr>
    </table>

</td>
</tr>
</table>

</body>
</html>
