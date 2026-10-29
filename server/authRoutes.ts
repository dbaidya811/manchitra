import crypto from 'crypto';
import { Request, Response, NextFunction, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import {
  countOtpCreatedSince,
  createOtpChallenge,
  createSession,
  deleteOtpChallenge,
  destroySession,
  getActiveOtp,
  hashOtp,
  maskEmail,
  nameFromEmail,
  normalizeEmail,
  recordOtpFailure,
  resolveSession,
  safeEqualHex,
  toPublicUser,
  upsertUser,
  type StoredUser
} from './authStore';
import { isMailerConfigured, MailerNotConfiguredError, sendOtpEmail } from './mailer';
import { createRateLimiter } from './rateLimit';
import {
  clearSessionCookie,
  parseCookies,
  SESSION_COOKIE_NAME,
  setSessionCookie
} from './cookies';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StoredUser;
    }
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

let googleOAuthClient: OAuth2Client | null = null;

function getGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || '').trim();
}

export function isGoogleConfigured(): boolean {
  return getGoogleClientId().length > 0;
}

function readSessionToken(req: Request): string {
  const jar = parseCookies(req.headers.cookie);
  return jar[SESSION_COOKIE_NAME] || '';
}

function readSessionUser(req: Request): StoredUser | null {
  return resolveSession(readSessionToken(req));
}

function issueSession(req: Request, res: Response, user: StoredUser) {
  const { token } = createSession(user.id);
  setSessionCookie(res, token);
  // convenience: also expose the id so a freshly signed in tab can render immediately
  res.setHeader('X-Manchitra-User-Id', user.id);
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = readSessionUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'You must be signed in to do this.',
      code: 'AUTH_REQUIRED'
    });
  }
  req.user = user;
  next();
};

export const authRouter: Router = Router();

authRouter.get('/session', (req: Request, res: Response) => {
  const user = readSessionUser(req);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  res.json({ authenticated: true, user: toPublicUser(user) });
});

authRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    emailOtpEnabled: isMailerConfigured(),
    googleEnabled: isGoogleConfigured()
  });
});

authRouter.post(
  '/otp/request',
  createRateLimiter(10, 15 * 60 * 1000),
  async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      if (!isMailerConfigured()) {
        console.error(
          '[auth] OTP requested but SMTP_USER / SMTP_PASS are not configured on the server.'
        );
        return res.status(503).json({
          error: 'Email login is not available right now. Please try again later.'
        });
      }

      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (countOtpCreatedSince(email, hourAgo) >= OTP_MAX_PER_HOUR) {
        return res.status(429).json({
          error: 'Too many codes requested for this address. Please try again later.'
        });
      }

      const code = crypto
        .randomInt(0, 10 ** OTP_LENGTH)
        .toString()
        .padStart(OTP_LENGTH, '0');

      const challenge = createOtpChallenge(
        email,
        hashOtp(email, code),
        OTP_TTL_MS,
        OTP_MAX_ATTEMPTS
      );

      try {
        await sendOtpEmail(email, code, Math.round(OTP_TTL_MS / 60000));
      } catch (err) {
        deleteOtpChallenge(challenge.id);
        throw err;
      }

      res.json({
        sent: true,
        email: maskEmail(email),
        expiresInSeconds: Math.round(OTP_TTL_MS / 1000)
      });
    } catch (err) {
      if (err instanceof MailerNotConfiguredError) {
        return res.status(503).json({
          error: 'Email login is not available right now. Please try again later.'
        });
      }
      console.error('[auth] Failed to send OTP email:', err);
      res.status(500).json({ error: 'Could not send the verification email. Please try again.' });
    }
  }
);

authRouter.post(
  '/otp/verify',
  createRateLimiter(20, 15 * 60 * 1000),
  (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      return res
        .status(400)
        .json({ error: `Enter the ${OTP_LENGTH}-digit code from your email.` });
    }

    const challenge = getActiveOtp(email);
    if (!challenge) {
      return res
        .status(400)
        .json({ error: 'That code is invalid or has expired. Request a new one.' });
    }

    if (Date.now() > challenge.expiresAt) {
      deleteOtpChallenge(challenge.id);
      return res
        .status(400)
        .json({ error: 'That code has expired. Request a new one.' });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      deleteOtpChallenge(challenge.id);
      return res.status(429).json({
        error: 'Too many incorrect attempts. Request a new code.'
      });
    }

    if (!safeEqualHex(hashOtp(email, code), challenge.codeHash)) {
      const attempts = recordOtpFailure(challenge.id);
      const attemptsLeft = Math.max(0, challenge.maxAttempts - attempts);
      return res.status(400).json({
        error:
          attemptsLeft > 0
            ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
            : 'Incorrect code. Request a new one.',
        attemptsLeft
      });
    }

    deleteOtpChallenge(challenge.id);

    try {
      const user = upsertUser({
        email,
        name: nameFromEmail(email),
        provider: 'email'
      });
      issueSession(req, res, user);
      res.json({ authenticated: true, user: toPublicUser(user) });
    } catch (err) {
      console.error('[auth] Failed to create session after OTP verification:', err);
      res.status(500).json({ error: 'Signed in, but the session could not be saved.' });
    }
  }
);

authRouter.post(
  '/google',
  createRateLimiter(20, 15 * 60 * 1000),
  async (req: Request, res: Response) => {
    const credential =
      typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential.' });
    }

    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(503).json({ error: 'Google login is not configured on this server.' });
    }

    let payload;
    try {
      if (!googleOAuthClient) {
        googleOAuthClient = new OAuth2Client(clientId);
      }
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn('[auth] Google ID token verification failed:', err);
      return res
        .status(401)
        .json({ error: 'Google sign-in could not be verified. Please try again.' });
    }

    const email = normalizeEmail(payload?.email);
    const verifiedEmail = payload?.email_verified === true;

    if (!email || !verifiedEmail || !payload?.sub) {
      return res.status(401).json({
        error: 'Google did not share a verified email address for this account.'
      });
    }

    try {
      const user = upsertUser({
        email,
        name: (payload.name || '').trim() || nameFromEmail(email),
        picture: payload.picture,
        provider: 'google',
        googleSub: payload.sub
      });
      issueSession(req, res, user);
      res.json({ authenticated: true, user: toPublicUser(user) });
    } catch (err) {
      console.error('[auth] Failed to create session after Google sign-in:', err);
      res.status(500).json({ error: 'Signed in, but the session could not be saved.' });
    }
  }
);

authRouter.post('/logout', (req: Request, res: Response) => {
  destroySession(readSessionToken(req));
  clearSessionCookie(res);
  res.json({ authenticated: false, user: null });
});