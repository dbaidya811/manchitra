import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = String(body?.email || '').trim();
    const rawOtp = String(body?.otp || '').trim();

    if (!rawEmail || !rawOtp) {
      return NextResponse.json({ message: 'Email and OTP are required.' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();
    const otp = rawOtp.replace(/\s+/g, '');

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ message: 'Invalid OTP format. Please enter the 6-digit code.' }, { status: 400 });
    }

    const storedOtpData = otpStore[email];

    if (!storedOtpData) {
      return NextResponse.json({ message: 'Invalid email or OTP request.' }, { status: 400 });
    }

    if (Date.now() > storedOtpData.expires) {
      delete otpStore[email];
      return NextResponse.json({ message: 'OTP has expired.' }, { status: 400 });
    }

    if (storedOtpData.otp !== otp) {
      return NextResponse.json({ message: 'Invalid OTP.' }, { status: 400 });
    }

    // OTP is correct, so we can clear it.
    delete otpStore[email];

    // In a real application, you would create a session or JWT for the user here.
    return NextResponse.json({ message: 'Login successful.' }, { status: 200 });

  } catch (error) {
    console.error('Verification Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
