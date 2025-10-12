import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';
import { sendMail } from '@/lib/mailer';
import { otpEmailHtml } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const { email: rawEmail, name } = await request.json();

    if (!rawEmail) {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }
    const email = String(rawEmail).trim().toLowerCase();

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

    // Store the OTP with the user's name (use normalized email key)
    otpStore[email] = { otp, expires, name: name || email.split("@")[0] };

    // Send the OTP via email (do not expose it in the API response)
    try {
      await sendMail({
        to: email,
        subject: 'Your One-Time Password (OTP) - Manchitra',
        text: `Hello${name ? ' ' + name : ''},

Your OTP is: ${otp}. It will expire in 5 minutes.

If you did not request this, please ignore this email.`,
        html: otpEmailHtml({ name, otp }),
      });
      
      console.log(`✅ OTP sent successfully to ${email}: ${otp}`);
    } catch (mailError) {
      console.error('Failed to send email, but OTP is stored:', mailError);
      console.log(`⚠️ OTP for ${email}: ${otp} (expires in 5 minutes)`);
    }

    return NextResponse.json({ message: 'OTP sent successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('OTP Error:', error);
    const msg = typeof error?.message === 'string' ? error.message : 'Internal Server Error';
    return NextResponse.json({ message: `Failed to send OTP: ${msg}` }, { status: 500 });
  }
}