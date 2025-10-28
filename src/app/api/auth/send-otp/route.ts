import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI1 || 'mongodb://localhost:27017';
const DB_NAME = 'manchitra';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  let email = '';
  let otp = '';
  try {
    const { name, email: userEmail } = await req.json();
    email = userEmail;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Generate OTP
    otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Store OTP in database (expires in 5 minutes)
    await db.collection('emailOtps').insertOne({
      email,
      otpHash: hashedOtp,
      name,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send OTP via email using Nodemailer
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@manchitra.local',
      to: email,
      subject: 'Your OTP for Manchitra Login',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your OTP for Manchitra Login</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; padding: 20px 0; background-color: #4CAF50; color: white; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; text-align: center; }
            .otp { font-size: 24px; font-weight: bold; color: #333; background-color: #f0f0f0; padding: 10px; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Manchitra</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your OTP for login is:</p>
              <div class="otp">${otp}</div>
              <p>This OTP will expire in 5 minutes. If you didn't request this, ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best,<br>Manchitra Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();

    return NextResponse.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    console.log(`OTP for ${email}: ${otp}`); // Log OTP for testing
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
