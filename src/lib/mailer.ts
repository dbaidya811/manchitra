import nodemailer from "nodemailer";

const rawPort = process.env.SMTP_PORT;
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(/^[0-9]+$/.test(String(rawPort)) ? rawPort : 465);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587/STARTTLS
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendMail({
  to,
  subject,
  text,
  html,
  from,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}) {
  const missing: string[] = [];
  if (!smtpUser) missing.push("SMTP_USER");
  if (!smtpPass) missing.push("SMTP_PASS");
  if (!smtpHost) missing.push("SMTP_HOST");
  if (!smtpPort) missing.push("SMTP_PORT");
  if (missing.length) {
    console.warn(`SMTP is not configured. Missing env var(s): ${missing.join(", ")}. Falling back to console delivery.`);
    console.info(`Mock email to ${to}: ${subject}`);
    if (html) console.info(html);
    else console.info(text);
    return {
      accepted: [to],
      rejected: [],
      response: "console",
    } as any;
  }

  const defaultFrom = process.env.SMTP_FROM || smtpUser || "no-reply@manchitra.local";

  const info = await transporter.sendMail({
    from: from || `Manchitra <${defaultFrom}>`,
    to,
    subject,
    text,
    html: html || `<pre>${text}</pre>`,
  });

  return info;
}
