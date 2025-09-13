// This is a in-memory store for OTPs.
// In a real application, you should use a more persistent and scalable solution like Redis or a database.
export const otpStore: Record<string, { otp: string; expires: number }> = {};
