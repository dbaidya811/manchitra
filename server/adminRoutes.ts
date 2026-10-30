import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { getDbPlaces, deleteDbPlace } from './db';

const ADMIN_USER = 'dbaidya811';
// sha256 of "dbaidya811"
const ADMIN_PASS_HASH = crypto.createHash('sha256').update('dbaidya811').digest('hex');

const router = Router();
const blockedIps = new Set<string>();

function hashPw(p: string) { return crypto.createHash('sha256').update(p).digest('hex'); }

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && hashPw(password || '') === ADMIN_PASS_HASH) {
    res.cookie('admin_session', '1', { httpOnly: true });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

function isAdmin(req: Request) {
  return req.cookies?.admin_session === '1';
}

router.get('/stats', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const places = getDbPlaces();
  res.json({ totalPandals: places.length });
});

router.get('/pandels', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  res.json(getDbPlaces());
});

router.delete('/pandels/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const ok = deleteDbPlace(req.params.id);
  res.json({ ok });
});

router.post('/block/:ip', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  blockedIps.add(req.params.ip);
  res.json({ ok: true });
});

export { router as adminRouter, blockedIps };
