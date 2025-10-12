import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protect selected routes (see matcher below). If no session, redirect to home page.
export async function middleware(req: NextRequest) {
  // Allow NextAuth callback URLs to pass through without auth check
  if (req.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthed = !!token;

  console.log('Middleware - Path:', req.nextUrl.pathname, 'Authenticated:', isAuthed);

  if (!isAuthed) {
    // Check if there's an active OAuth flow (has state or code params)
    const hasOAuthParams = req.nextUrl.searchParams.has('code') || 
                          req.nextUrl.searchParams.has('state') ||
                          req.nextUrl.searchParams.has('oauth_token');
    
    if (hasOAuthParams) {
      console.log('Middleware - OAuth flow detected, allowing through');
      return NextResponse.next();
    }

    // Redirect to home page where the login UI is located
    const loginUrl = new URL('/', req.url);
    // preserve where the user was trying to go
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    console.log('Middleware - Redirecting to login');
    return NextResponse.redirect(loginUrl);
  }

  console.log('Middleware - Allowing access');
  return NextResponse.next();
}

// Only run on protected paths
// Note: /dashboard is NOT in matcher - it handles auth internally to avoid OAuth redirect issues
export const config = {
  matcher: [
    '/dashboard/map',
    '/dashboard/my-contributions',
    '/dashboard/what-have-i-seen',
    '/dashboard/report-issue',
    '/dashboard/history',
    '/dashboard/plan-save',
    '/ai/:path*',
    '/builder/:path*',
    '/planning-ai/:path*',
    // Protect key APIs from guest/anonymous usage
    '/api/(feed|places|report)(.*)'
  ],
};