import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { CacheManager, redis } from "./redis";

/**
 * Check if user is authenticated for API routes
 */
export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized', ok: false },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Validate request origin
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  // Allow same-origin requests
  if (origin && host) {
    const originHost = new URL(origin).host;
    return originHost === host;
  }

  return true; // Allow if headers are missing (same-origin)
}

/**
 * Advanced rate limiting for 100k users
 * Uses Redis for distributed rate limiting
 */
export async function checkRateLimitAdvanced(
  req: NextRequest,
  userEmail?: string,
  limit: number = 1000,
  windowMs: number = 1000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    // Create unique identifier (user email or IP)
    const identifier = userEmail || getClientIP(req) || 'anonymous';

    // Use Redis for distributed rate limiting
    const allowed = await CacheManager.checkRateLimit(identifier, limit, windowMs);

    if (!allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + windowMs
      };
    }

    // Get current count for response headers
    const currentCount = await getCurrentRateLimitCount(identifier);

    return {
      allowed: true,
      remaining: Math.max(0, limit - (currentCount || 0)),
      resetTime: Date.now() + windowMs
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + windowMs
    };
  }
}

/**
 * Get current rate limit count from Redis
 */
async function getCurrentRateLimitCount(identifier: string): Promise<number | null> {
  try {
    const key = `ratelimit:${identifier}`;
    const count = await redis.get(key);
    return count as number || 0;
  } catch {
    return null;
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: NextRequest): string | null {
  // Check various headers for real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const clientIP = req.headers.get('x-client-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return realIP || clientIP || null;
}

/**
 * Rate limiting for different API endpoints
 */
export const RATE_LIMITS = {
  PLACES: { limit: 500, windowMs: 60000 },    // 500 requests per minute
  AUTH: { limit: 50, windowMs: 60000 },      // 50 auth requests per minute
  SEARCH: { limit: 200, windowMs: 60000 },   // 200 search requests per minute
  UPLOAD: { limit: 100, windowMs: 60000 },   // 100 uploads per minute
  PANDEL_SUGGESTIONS: { limit: 300, windowMs: 60000 }, // 300 suggestions per minute
  GENERAL: { limit: 1000, windowMs: 1000 },  // 1000 requests per second (default)
};

/**
 * Check rate limit with appropriate limits for endpoint
 */
export async function checkEndpointRateLimit(
  req: NextRequest,
  endpoint: keyof typeof RATE_LIMITS,
  userEmail?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number; status: number }> {
  const { limit, windowMs } = RATE_LIMITS[endpoint];
  const result = await checkRateLimitAdvanced(req, userEmail, limit, windowMs);

  const status = result.allowed ? 200 : 429;

  return {
    ...result,
    status
  };
}

/**
 * Security middleware for API routes
 */
export async function securityMiddleware(req: NextRequest, userEmail?: string) {
  // Check rate limiting
  const rateLimitResult = await checkEndpointRateLimit(req, 'GENERAL', userEmail);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        ok: false,
        retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString()
        }
      }
    );
  }

  // Validate origin for security
  if (!validateOrigin(req)) {
    return NextResponse.json(
      { error: 'Forbidden', ok: false },
      { status: 403 }
    );
  }

  return null; // No security issues
}
