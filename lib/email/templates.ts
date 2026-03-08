/**
 * Email templates for transactional emails.
 */

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export function verificationEmailHtml(email: string, token: string): string {
  const url = `${baseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 24px;font-size:24px;color:#111;">Verify your email</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#444;line-height:1.6;">
      Hi, please verify your email address by clicking the button below.
    </p>
    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
      Verify email
    </a>
    <p style="margin:24px 0 0;font-size:14px;color:#888;">
      This link expires in 24 hours. If you didn't create an account, you can ignore this email.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#999;">
      <a href="${url}" style="color:#666;word-break:break-all;">${url}</a>
    </p>
  </div>
</body>
</html>
`
}

export function passwordResetEmailHtml(email: string, token: string): string {
  const url = `${baseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 24px;font-size:24px;color:#111;">Reset your password</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#444;line-height:1.6;">
      You requested a password reset. Click the button below to choose a new password.
    </p>
    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
      Reset password
    </a>
    <p style="margin:24px 0 0;font-size:14px;color:#888;">
      This link expires in 1 hour. If you didn't request this, please ignore this email.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#999;">
      <a href="${url}" style="color:#666;word-break:break-all;">${url}</a>
    </p>
  </div>
</body>
</html>
`
}
