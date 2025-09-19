import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node.js runtime for Nodemailer

// Expected environment variables:
// SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"|"false"), SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_ADMIN

function boolFromEnv(value: string | undefined, def = false) {
  if (value === undefined) return def;
  return value.toLowerCase() === "true" || value === "1";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body || {};

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: name, email, message" },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = boolFromEnv(process.env.SMTP_SECURE, port === 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;
    const admin = process.env.EMAIL_ADMIN;

    if (!host || !user || !pass || !from || !admin) {
      return NextResponse.json(
        { ok: false, error: "Email environment variables not configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // Email to admin
    const adminSubject = `New Issue Report from ${name}`;
    const adminText = `A new issue has been reported.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const adminHtml = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; background:#f6f7f9; padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg, #10b981, #059669); padding:24px 28px; color:#fff;">
              <h1 style="margin:0; font-size:20px;">Manchitra</h1>
              <p style="margin:6px 0 0; opacity:0.95;">New Issue Report</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px; color:#111827;">
              <p style="margin:0 0 12px;">You received a new issue report:</p>
              <div style="margin:12px 0; padding:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
                <p style="margin:0 0 6px;"><strong>Name:</strong> ${name}</p>
                <p style="margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#059669; text-decoration:none;">${email}</a></p>
                <p style="margin:12px 0 6px;"><strong>Message:</strong></p>
                <p style="white-space:pre-wrap; margin:0; line-height:1.6;">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
              <p style="margin:16px 0 0; font-size:12px; color:#6b7280;">Reply directly to this email to contact the reporter.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">${new Date().getFullYear()} Manchitra</td>
          </tr>
        </table>
      </div>`;

    // Confirmation email to user
    const userSubject = `We received your report`;
    const userText = `Hi ${name},\n\nThank you for reporting the issue. We have received your message and will get back to you shortly.\n\nYour message:\n${message}\n\n— Manchitra Team`;
    const userHtml = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; background:#f6f7f9; padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg, #10b981, #059669); padding:24px 28px; color:#fff;">
              <h1 style="margin:0; font-size:20px;">Manchitra</h1>
              <p style="margin:6px 0 0; opacity:0.95;">We received your report</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px; color:#111827;">
              <p style="margin:0 0 12px;">Hi ${name},</p>
              <p style="margin:0 0 12px;">Thanks for helping us improve Manchitra. We’ve received your report and will get back to you shortly.</p>
              <div style="margin:12px 0; padding:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
                <p style="margin:0 0 6px;"><strong>Your message:</strong></p>
                <p style="white-space:pre-wrap; margin:0; line-height:1.6;">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
              <p style="margin:16px 0 0; font-size:14px; color:#374151;">We’ll reach out at <a href="mailto:${email}" style="color:#059669; text-decoration:none;">${email}</a> if we need more details.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">${new Date().getFullYear()} Manchitra</td>
          </tr>
        </table>
      </div>`;

    await Promise.all([
      transporter.sendMail({ from, to: admin, replyTo: email, subject: adminSubject, text: adminText, html: adminHtml }),
      transporter.sendMail({ from, to: email, subject: userSubject, text: userText, html: userHtml }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("/api/report error:", err);
    const msg = err?.message || "Internal Server Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
