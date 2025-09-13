import { NextResponse } from 'next/server';

// This is a in-memory store for OTPs. In a real application, use a database like Redis.
const otpStore: Record<string, { otp: string; expires: number }> = {};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    // In a real application, you would generate a truly random OTP.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

    // Store the OTP
    otpStore[email] = { otp, expires };
    
    console.log(`OTP for ${email}: ${otp}`); // Log for testing

    // In a real application, you would use a service like Nodemailer to send the email.
    // await sendEmail({ to: email, subject: 'Your OTP Code', text: `Your OTP is: ${otp}` });

    // We return the OTP here for demonstration purposes. In a real app, you would not do this.
    return NextResponse.json({ message: 'OTP sent successfully.', otp: otp }, { status: 200 });

  } catch (error) {
    console.error('OTP Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
