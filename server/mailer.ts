import nodemailer, { Transporter } from 'nodemailer';

export interface MailerConfig {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
}

export class MailerNotConfiguredError extends Error {
  constructor() {
    super('SMTP is not configured on this server.');
    this.name = 'MailerNotConfiguredError';
  }
}

export function getMailerConfig(): MailerConfig | null {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  if (!user || !pass) return null;

  const host = (process.env.SMTP_HOST || '').trim() || 'smtp.gmail.com';
  const port = Number((process.env.SMTP_PORT || '').trim()) || 587;
  const secure =
    (process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || port === 465;
  const from = (process.env.SMTP_FROM || '').trim() || `Manchitra <${user}>`;

  return { user, pass, host, port, secure, from };
}

export function isMailerConfigured(): boolean {
  return getMailerConfig() !== null;
}

let cached: { key: string; transporter: Transporter } | null = null;

function getTransporter(config: MailerConfig): Transporter {
  const key = `${config.host}|${config.port}|${config.secure}|${config.user}`;
  if (cached && cached.key === key) return cached.transporter;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  cached = { key, transporter };
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendOtpEmail(
  to: string,
  code: string,
  expiresInMinutes: number
): Promise<void> {
  const config = getMailerConfig();
  if (!config) throw new MailerNotConfiguredError();

  const safeCode = escapeHtml(code);

  await getTransporter(config).sendMail({
    from: config.from,
    to,
    subject: `${code} is your Manchitra verification code`,
    text:
      `Your Manchitra verification code is ${code}\n\n` +
      `It expires in ${expiresInMinutes} minutes. ` +
      `If you did not request this code, you can safely ignore this email.\n`,
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 28px 8px 28px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#059669;letter-spacing:0.08em;text-transform:uppercase;">Manchitra</p>
          <h1 style="margin:8px 0 0 0;font-size:20px;color:#0f172a;">Your verification code</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 0 28px;">
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Enter this code to finish signing in. It expires in ${expiresInMinutes} minutes.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 0 28px;">
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:18px;text-align:center;">
            <span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#065f46;font-family:'SFMono-Regular',Consolas,monospace;">${safeCode}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 28px 28px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">If you did not request this code, you can safely ignore this email &mdash; no action is needed.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
  });
}