<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reset Password</title>
</head>
<body style="background-color: #f8f8f8; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 0; margin: 0;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
        <td align="center">
            <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header / Logo -->
                <tr>
                    <td align="center" style="padding: 40px 30px 20px 30px;">
                        <img src="YOUR_LOGO_URL_HERE" alt="Portfolio Logo" width="140" style="display: block; margin-bottom: 25px;">
                        <div style="width: 60px; height: 3px; background-color: #C6A75E; margin: 0 auto;"></div>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td style="padding: 40px 50px 30px 50px;">
                        <h1 style="font-size: 26px; font-weight: 700; color: #111111; margin-bottom: 25px; text-align: center;">
                            Reset Your Password
                        </h1>

                        <p style="font-size: 16px; color: #444444; line-height: 1.7; margin-bottom: 25px;">
                            Hello <strong>{{ $user->username }}</strong>,
                        </p>

                        <p style="font-size: 16px; color: #555555; line-height: 1.7; margin-bottom: 30px;">
                            We received a request to reset your password. If this was you, click the button below to securely set a new password for your account.
                        </p>

                        <!-- Button -->
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="{{ url("/reset-password/{$token}?email={$user->email}") }}"
                               style="background-color: #C6A75E;
                                      color: #ffffff;
                                      font-size: 16px;
                                      font-weight: 600;
                                      padding: 16px 38px;
                                      border-radius: 50px;
                                      text-decoration: none;
                                      display: inline-block;
                                      box-shadow: 0 6px 18px rgba(198,167,94,0.35);
                                      letter-spacing: 0.5px;">
                                Reset Password
                            </a>
                        </div>

                        <p style="font-size: 14px; color: #777777; line-height: 1.6; text-align: center; margin-bottom: 10px;">
                            This link will expire in
                            <strong style="color: #C6A75E;">
                                {{ config('auth.passwords.'.config('auth.defaults.passwords').'.expire') }} minutes
                            </strong>.
                        </p>

                        <p style="font-size: 14px; color: #999999; line-height: 1.6; text-align: center; margin-top: 30px;">
                            If you did not request a password reset, you can safely ignore this email.
                        </p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background-color: #fafafa; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="font-size: 14px; color: #444444; margin-bottom: 6px;">
                            Thank you,
                        </p>
                        <p style="font-size: 16px; font-weight: 600; color: #C6A75E; margin: 0;">
                            Bear Lane Team
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Footer Note -->
            <table width="620" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                    <td style="padding: 20px; text-align: center;">
                        <p style="font-size: 12px; color: #aaaaaa; margin: 0;">
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
