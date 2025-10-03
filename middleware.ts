import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protect selected routes (see matcher below). If no session, redirect to /login.
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthed = !!token;

  if (!isAuthed) {
    // Use NextAuth's default signin page unless you provide /login
    const loginUrl = new URL('/api/auth/signin', req.url);
    // Preserve where the user was trying to go
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run on protected paths
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/ai/:path*',
    '/builder/:path*',
    '/planning-ai/:path*',
    // Protect key APIs from guest/anonymous usage
    '/api/(feed|places|report)(.*)'
  ],
};
