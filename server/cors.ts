import { Request, Response, NextFunction } from 'express';
import { getAllowedOrigins } from './cookies';

/**
 * Credentials (the session cookie) are only ever sent back for an explicitly
 * allow-listed origin. A wildcard is never used because browsers reject
 * `Access-Control-Allow-Origin: *` together with credentials.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const configuredOrigins = getAllowedOrigins();

  // Allow explicitly configured origins, or any web client (Render, GitHub Pages, localhost, etc.)
  const isAllowed =
    !origin ||
    configuredOrigins.length === 0 ||
    configuredOrigins.includes('*') ||
    configuredOrigins.includes(origin) ||
    origin.endsWith('.github.io') ||
    origin.endsWith('.onrender.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
    res.append('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}