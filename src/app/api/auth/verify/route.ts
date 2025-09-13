import { NextResponse } from 'next/server';

// This should share the same store as your OTP generation route.
// This is a in-memory store for OTPs. In a real application, use a database like Redis.
const otpStore: Record<string, { otp: string; expires: number }> = {};

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ message: 'Email and OTP are required.' }, { status: 400 });
    }

    const storedOtpData = otpStore[email];

    if (!storedOtpData) {
      return NextResponse.json({ message: 'Invalid or expired OTP.' }, { status: 400 });
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
