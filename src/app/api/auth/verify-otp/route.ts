import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI1 || 'mongodb://localhost:27017';
const DB_NAME = 'manchitra';

export async function POST(req: NextRequest) {
  try {
    const { name, email, otp } = await req.json();

    if (!name || !email || !otp) {
      return NextResponse.json({ error: 'Name, email, and OTP required' }, { status: 400 });
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Find and verify OTP
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const otpRecord = await db.collection('emailOtps').findOne({
      email,
      otpHash: hashedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      await client.close();
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Create or update user
    const user = await db.collection('users').findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          createdAt: new Date(),
        },
        $unset: { otp: 1, expiresAt: 1 },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Don't delete OTP here, let the signIn process handle it

    await client.close();

    return NextResponse.json({ user: user?.value || null, message: 'OTP verified' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
