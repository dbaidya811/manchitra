import { Request, Response, NextFunction } from 'express';
import { getAllowedOrigins } from './cookies';

/**
 * Credentials (the session cookie) are only ever sent back for an explicitly
 * allow-listed origin. A wildcard is never used because browsers reject
 * `Access-Control-Allow-Origin: *` together with credentials.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
    res.append('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}