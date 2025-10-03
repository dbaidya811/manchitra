export function otpEmailHtml({ name, otp, magicUrl }: { name?: string; otp: string; magicUrl?: string }) {
  const displayName = name ? name : "there";
  // Using inline styles for maximum email client compatibility
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="x-ua-compatible" content="ie=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Your One-Time Password (OTP)</title>
      <style>
        @media (prefers-color-scheme: dark) {
          body { background: #0b0b0b !important; color: #fff !important; }
          .card { background: #111111 !important; border-color: #222 !important; }
          .muted { color: #b5b5b5 !important; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:#f6f7fb;padding:24px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellPadding="0" cellSpacing="0" class="card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
              <tr>
                <td style="padding:24px 24px 12px 24px;">
                  <table role="presentation" width="100%">
                    <tr>
                      <td align="left">
                        <div style="display:flex;align-items:center;gap:12px;">
                          <img src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googlemaps.svg" width="32" height="32" alt="Manchitra" style="display:block;" />
                          <span style="font-size:18px;font-weight:700;color:#111;letter-spacing:0.2px;">Manchitra</span>
                        </div>
                      </td>
                      <td align="right" class="muted" style="font-size:12px;color:#6b7280;">Secure OTP</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 8px 24px;">
                  <h1 style="margin:8px 0 0 0;font-size:22px;color:#111;">Your One-Time Password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 4px 24px;">
                  <p style="margin:8px 0 0 0;font-size:14px;line-height:22px;color:#374151;">Hello ${displayName},</p>
                  <p style="margin:8px 0 0 0;font-size:14px;line-height:22px;color:#374151;">Use the following verification code to complete your sign-in. This code will expire in 5 minutes.</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:16px 24px 8px 24px;">
                  <div style="display:inline-block;background:linear-gradient(90deg,#f59e0b,#f97316);color:#111;padding:14px 24px;border-radius:10px;font-size:28px;font-weight:800;letter-spacing:6px;">
                    ${otp}
                  </div>
                </td>
              </tr>
              ${magicUrl ? `
              <tr>
                <td align="center" style="padding:8px 24px 8px 24px;">
                  <a href="${magicUrl}"
                     style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:700;box-shadow:0 2px 10px rgba(37,99,235,0.35)">
                    Sign in instantly
                  </a>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 24px 24px 24px;">
                  <p class="muted" style="margin:12px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;">If you did not request this code, you can safely ignore this email.</p>
                  <p class="muted" style="margin:8px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;">For your security, never share this code with anyone.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
                  <table role="presentation" width="100%">
                    <tr>
                      <td class="muted" style="font-size:12px;color:#6b7280;">Sent by Manchitra • Do not reply to this email</td>
                      <td align="right" class="muted" style="font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} Manchitra</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}
