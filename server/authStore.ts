import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve relative AUTH_DATA_DIR against the project root, next to the places data,
// rather than against this file's own folder.
const projectRoot = path.resolve(__dirname, '..');

export const AUTH_DATA_DIR = path.resolve(
  projectRoot,
  (process.env.AUTH_DATA_DIR || '').trim() || path.join('data', 'auth')
);

const OTP_PEPPER = (process.env.OTP_PEPPER || '').trim() || crypto.randomBytes(32).toString('hex');

if (!(process.env.OTP_PEPPER || '').trim()) {
  console.warn(
    '[auth] OTP_PEPPER is not set. A random pepper was generated for this process, so ' +
      'codes already in flight become invalid after a restart. Set OTP_PEPPER in .env.'
  );
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'email' | 'google';
  googleSub?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'email' | 'google';
  createdAt: string;
  lastLoginAt: string;
}

export interface OtpChallenge {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
}

interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const usersPath = path.join(AUTH_DATA_DIR, 'users.json');
const sessionsPath = path.join(AUTH_DATA_DIR, 'sessions.json');
const otpPath = path.join(AUTH_DATA_DIR, 'otps.json');

function readJsonArray<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err) {
    console.error(`[auth] Failed to read ${filePath}, trying backup:`, err);
    try {
      const backup = `${filePath}.bak`;
      if (fs.existsSync(backup)) {
        const parsed = JSON.parse(fs.readFileSync(backup, 'utf-8'));
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      // give up and start from empty
    }
    return [];
  }
}

function writeJsonArray<T>(filePath: string, items: T[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    } catch {
      // backup copy failure is non-fatal
    }
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, 254);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Explorer';
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!cleaned) return 'Manchitra Explorer';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function hashOtp(email: string, code: string): string {
  return crypto.createHmac('sha256', OTP_PEPPER).update(`${email}:${code}`).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function pruneSessions(sessions: SessionRecord[]): SessionRecord[] {
  const now = Date.now();
  return sessions.filter((s) => s.expiresAt > now);
}

function pruneOtps(challenges: OtpChallenge[]): OtpChallenge[] {
  const now = Date.now();
  return challenges.filter((c) => c.expiresAt > now);
}

export function findUserById(id: string): StoredUser | null {
  return readJsonArray<StoredUser>(usersPath).find((u) => u.id === id) || null;
}

export function findUserByEmail(email: string): StoredUser | null {
  const target = normalizeEmail(email);
  return readJsonArray<StoredUser>(usersPath).find((u) => u.email === target) || null;
}

export function findUserByGoogleSub(sub: string): StoredUser | null {
  return readJsonArray<StoredUser>(usersPath).find((u) => u.googleSub === sub) || null;
}

export interface UpsertUserInput {
  email: string;
  name?: string;
  picture?: string;
  provider: 'email' | 'google';
  googleSub?: string;
}

export function upsertUser(input: UpsertUserInput): StoredUser {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('upsertUser requires a valid email');

  const users = readJsonArray<StoredUser>(usersPath);
  const now = new Date().toISOString();
  const existing =
    (input.googleSub ? users.find((u) => u.googleSub === input.googleSub) : undefined) ||
    users.find((u) => u.email === email);

  let user: StoredUser;
  if (existing) {
    existing.email = email;
    existing.lastLoginAt = now;
    if (input.name) existing.name = input.name;
    if (input.picture) existing.picture = input.picture;
    if (input.googleSub) existing.googleSub = input.googleSub;
    // keep the original provider label, but remember google linkage
    if (existing.provider !== 'google' && input.provider === 'google') {
      existing.provider = 'google';
    }
    user = existing;
  } else {
    user = {
      id: `usr_${crypto.randomBytes(9).toString('hex')}`,
      email,
      name: (input.name || '').trim() || nameFromEmail(email),
      picture: input.picture,
      provider: input.provider,
      googleSub: input.googleSub,
      createdAt: now,
      lastLoginAt: now
    };
    users.push(user);
  }

  writeJsonArray(usersPath, users);
  return user;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    provider: user.provider,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const sessions = pruneSessions(readJsonArray<SessionRecord>(sessionsPath));
  sessions.push({
    tokenHash: hashToken(token),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  writeJsonArray(sessionsPath, sessions);
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export function resolveSession(token: string): StoredUser | null {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const sessions = readJsonArray<SessionRecord>(sessionsPath);
  const record = sessions.find((s) => s.tokenHash === tokenHash);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    writeJsonArray(sessionsPath, sessions.filter((s) => s.tokenHash !== tokenHash));
    return null;
  }
  return findUserById(record.userId);
}

export function destroySession(token: string): void {
  if (!token) return;
  const tokenHash = hashToken(token);
  const sessions = readJsonArray<SessionRecord>(sessionsPath);
  writeJsonArray(
    sessionsPath,
    sessions.filter((s) => s.tokenHash !== tokenHash)
  );
}

export function destroyAllSessionsForUser(userId: string): void {
  const sessions = readJsonArray<SessionRecord>(sessionsPath);
  writeJsonArray(
    sessionsPath,
    sessions.filter((s) => s.userId !== userId)
  );
}

export function countOtpCreatedSince(email: string, since: number): number {
  const target = normalizeEmail(email);
  return readJsonArray<OtpChallenge>(otpPath).filter(
    (c) => c.email === target && c.createdAt >= since
  ).length;
}

export function createOtpChallenge(
  email: string,
  codeHash: string,
  ttlMs: number,
  maxAttempts: number
): OtpChallenge {
  const target = normalizeEmail(email);
  const now = Date.now();
  // Only the newest code for an address may ever be redeemed
  const remaining = pruneOtps(readJsonArray<OtpChallenge>(otpPath)).filter(
    (c) => c.email !== target
  );
  const challenge: OtpChallenge = {
    id: `otp_${crypto.randomBytes(9).toString('hex')}`,
    email: target,
    codeHash,
    expiresAt: now + ttlMs,
    attempts: 0,
    maxAttempts,
    createdAt: now
  };
  remaining.push(challenge);
  writeJsonArray(otpPath, remaining);
  return challenge;
}

export function getActiveOtp(email: string): OtpChallenge | null {
  const target = normalizeEmail(email);
  const active = pruneOtps(readJsonArray<OtpChallenge>(otpPath)).filter(
    (c) => c.email === target
  );
  if (active.length === 0) return null;
  return active.reduce((latest, c) => (c.createdAt >= latest.createdAt ? c : latest));
}

export function recordOtpFailure(id: string): number {
  const challenges = readJsonArray<OtpChallenge>(otpPath);
  const target = challenges.find((c) => c.id === id);
  if (!target) return 0;
  target.attempts += 1;
  writeJsonArray(otpPath, challenges);
  return target.attempts;
}

export function deleteOtpChallenge(id: string): void {
  const challenges = readJsonArray<OtpChallenge>(otpPath);
  writeJsonArray(
    otpPath,
    challenges.filter((c) => c.id !== id)
  );
}