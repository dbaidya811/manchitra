import { Response } from 'express';

export const SESSION_COOKIE_NAME = 'manchitra_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 * 1000;

export function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * When the frontend is served from a different origin than the API (for example
 * GitHub Pages) the session cookie must be SameSite=None + Secure, otherwise
 * browsers silently drop it on every cross-site request.
 */
export function isCrossSiteDeployment(): boolean {
  return getAllowedOrigins().length > 0;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const value = part.slice(index + 1).trim();
    try {
      jar[name] = decodeURIComponent(value);
    } catch {
      jar[name] = value;
    }
  }
  return jar;
}

function baseCookieOptions() {
  const useSecure = process.env.NODE_ENV === 'production' || isCrossSiteDeployment();
  return {
    httpOnly: true,
    secure: useSecure,
    sameSite: (isCrossSiteDeployment() ? 'none' : 'lax') as 'none' | 'lax',
    path: '/'
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL_SECONDS}; ${Object.entries(
      baseCookieOptions()
    )
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`
  );
}

export function clearSessionCookie(res: Response): void {
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Max-Age=0; ${Object.entries(baseCookieOptions())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`
  );
}