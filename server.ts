import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter, requireAuth } from './server/authRoutes';
import { corsMiddleware } from './server/cors';
import { createRateLimiter } from './server/rateLimit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Disable X-Powered-By header to hide server technology
app.disable('x-powered-by');

// Correct client IPs / secure cookies when running behind a reverse proxy or PaaS router
app.set('trust proxy', 1);

// Security: Enforce standard OWASP HTTP response headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self)');
  next();
});

// Security: Restrict maximum request body size (prevent memory exhaustion DoS)
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Allow credentialed requests from an explicitly allow-listed frontend origin
app.use(corsMiddleware);

// Paths for JSON storage
const srcPlacesJsonPath = path.resolve(__dirname, 'src/data/places.json');
const rootDataPlacesJsonPath = path.resolve(__dirname, 'data/places.json');

// Helper to ensure file exists and read places with fallback to backup
function readPlacesFromFile(): any[] {
  try {
    if (fs.existsSync(srcPlacesJsonPath)) {
      const data = fs.readFileSync(srcPlacesJsonPath, 'utf-8');
      return JSON.parse(data);
    }
    if (fs.existsSync(rootDataPlacesJsonPath)) {
      const data = fs.readFileSync(rootDataPlacesJsonPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading places from JSON, attempting backup recovery:', err);
    const backupPath = `${srcPlacesJsonPath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        return JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      } catch {
        // Fallback to empty array
      }
    }
  }
  return [];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A process killed between write and rename leaves a stale .tmp file behind.
function cleanupStaleTempFiles(): void {
  for (const targetPath of [srcPlacesJsonPath, rootDataPlacesJsonPath]) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.includes('.tmp.')) continue;
      if (!entry.startsWith(path.basename(targetPath))) continue;
      try {
        fs.unlinkSync(path.join(dir, entry));
      } catch {
        // best effort
      }
    }
  }
}

cleanupStaleTempFiles();

// Write via temp file + atomic rename, retrying transient locks. Cloud sync clients
// (OneDrive/Dropbox) and antivirus scanners briefly hold files, which otherwise
// surfaces as a spurious EPERM/EBUSY failure.
async function writeFileAtomic(targetPath: string, jsonContent: string, attempts = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const tmpPath = `${targetPath}.tmp.${Date.now()}.${attempt}`;
    try {
      fs.writeFileSync(tmpPath, jsonContent, 'utf-8');
      fs.renameSync(tmpPath, targetPath);
      return true;
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // best effort cleanup
      }
      if (attempt === attempts) {
        console.error(`Error saving places atomically to ${targetPath}:`, err);
        return false;
      }
      await sleep(25 * attempt);
    }
  }
  return false;
}

// Helper for atomic file persistence with backup.
// The primary file is authoritative (it is what reads prefer), so only its failure
// fails the request. Mirror targets are best effort: a locked or read-only mirror
// must not turn a successful write into a 500.
async function savePlacesToFile(places: any[]): Promise<boolean> {
  if (!Array.isArray(places)) return false;
  const jsonContent = JSON.stringify(places, null, 2);

  const targets = [srcPlacesJsonPath, rootDataPlacesJsonPath];

  for (let index = 0; index < targets.length; index++) {
    const targetPath = targets[index];
    let ok = false;

    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // If existing file is valid, create backup before overwriting
      if (fs.existsSync(targetPath)) {
        try {
          fs.copyFileSync(targetPath, `${targetPath}.bak`);
        } catch {
          // Backup copy failure is non-fatal
        }
      }

      ok = await writeFileAtomic(targetPath, jsonContent);
    } catch (err) {
      console.error(`Error saving places to ${targetPath}:`, err);
      ok = false;
    }

    if (!ok) {
      if (index === 0) return false;
      console.warn(
        `[places] Mirror target ${targetPath} could not be written; ${srcPlacesJsonPath} is authoritative.`
      );
    }
  }

  return true;
}

// Security: String sanitizer to prevent XSS injections
function sanitizeString(str: any, maxLen = 300): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .trim()
    .slice(0, maxLen);
}

const MAX_DATA_URL_LENGTH = 3_500_000;

// Accepts inline base64 uploads and http(s)/relative image references only
function sanitizeImageValue(value: any): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^data:/i.test(trimmed)) {
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return '';
    return trimmed.slice(0, MAX_DATA_URL_LENGTH);
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed.slice(0, 2048) : '';
  }

  return sanitizeString(trimmed, 512);
}

function sanitizeStringList(value: any, maxItems = 12, maxLen = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => sanitizeString(item, maxLen))
    .filter(Boolean);
}

interface PlaceAuthor {
  id: string;
  name: string;
  email: string;
}

class PlaceValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PlaceValidationError';
    this.status = status;
  }
}

const DEFAULT_COORDS: [number, number] = [22.5726, 88.3639];

function resolveCoordinates(body: any, fallback: [number, number]): [number, number] {
  // Kolkata & West Bengal bounding box
  const toCoords = (rawLat: any, rawLng: any): [number, number] | null => {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < 15 || lat > 30 || lng < 75 || lng > 95) return null;
    return [lat, lng];
  };

  if (Array.isArray(body.coordinates) && body.coordinates.length >= 2) {
    return toCoords(body.coordinates[0], body.coordinates[1]) || fallback;
  }
  if (body.latitude !== undefined && body.longitude !== undefined) {
    return toCoords(body.latitude, body.longitude) || fallback;
  }
  return fallback;
}

function existingCoords(existing: Record<string, any>): [number, number] {
  if (Array.isArray(existing.coordinates) && existing.coordinates.length >= 2) {
    const lat = Number(existing.coordinates[0]);
    const lng = Number(existing.coordinates[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  return DEFAULT_COORDS;
}

/**
 * Builds a sanitized place record from an allow-list of fields. Keys absent from
 * `body` fall back to `existing`, which is how PATCH preserves untouched values
 * (including legacy fields this endpoint does not manage). Server-owned keys
 * (id, contributor identity, timestamps) are never taken from the request body.
 */
function buildPlaceFromInput(
  body: any,
  opts: { id: string; author?: PlaceAuthor; existing?: Record<string, any> }
): Record<string, any> {
  const existing = opts.existing || {};
  const present = (key: string) =>
    Object.prototype.hasOwnProperty.call(body, key) &&
    body[key] !== undefined &&
    body[key] !== null;

  const text = (key: string, maxLen: number, fallback: string) =>
    present(key) ? sanitizeString(body[key], maxLen) : fallback;

  const name = present('name') ? sanitizeString(body.name, 120) : String(existing.name || '');
  if (name.length < 2) {
    throw new PlaceValidationError('Valid place name (min 2 characters) is required');
  }

  const coords =
    present('coordinates') || present('latitude') || present('longitude')
      ? resolveCoordinates(body, existingCoords(existing))
      : existingCoords(existing);

  const zoneFromBody = present('zone')
    ? sanitizeString(body.zone, 80)
    : present('district')
      ? sanitizeString(body.district, 80)
      : '';
  const districtFromBody = present('district')
    ? sanitizeString(body.district, 80)
    : present('zone')
      ? sanitizeString(body.zone, 80)
      : '';

  const image = present('image') ? sanitizeImageValue(body.image) : String(existing.image || '');
  const images = present('images')
    ? (Array.isArray(body.images) ? body.images : [])
        .slice(0, 8)
        .map((item: unknown) => sanitizeImageValue(item))
        .filter(Boolean)
    : Array.isArray(existing.images)
      ? existing.images
      : [];

  const sourceUrl = present('sourceUrl')
    ? sanitizeString(body.sourceUrl, 500)
    : present('source_url')
      ? sanitizeString(body.source_url, 500)
      : String(existing.sourceUrl || existing.source_url || '');

  const record: Record<string, any> = {
    ...existing,
    id: opts.id,
    name,
    subTitle: text('subTitle', 120, String(existing.subTitle || '')),
    zone: zoneFromBody || String(existing.zone || '') || 'Kolkata',
    district: districtFromBody || String(existing.district || '') || 'Kolkata',
    division: text('division', 80, String(existing.division || '') || 'Kolkata'),
    description: text(
      'description',
      1500,
      String(existing.description || '') || 'Durga Puja pandal in Kolkata.'
    ),
    category: text('category', 40, String(existing.category || '') || 'popular'),
    coordinates: coords,
    latitude: coords[0],
    longitude: coords[1],
    rating: present('rating')
      ? Math.min(5, Math.max(1, Number(body.rating) || 4.8))
      : Number(existing.rating) || 4.8,
    reviewCount: present('reviewCount')
      ? Math.max(1, Number(body.reviewCount) || 20)
      : Number(existing.reviewCount) || 20,
    image,
    images,
    sourceUrl,
    highlights: present('highlights') ? sanitizeStringList(body.highlights) : existing.highlights || [],
    bestTimeToVisit: text('bestTimeToVisit', 120, String(existing.bestTimeToVisit || '')),
    entryFee: text('entryFee', 60, String(existing.entryFee || '')),
    tags: present('tags') ? sanitizeStringList(body.tags) : existing.tags || [],
    tips: text('tips', 500, String(existing.tips || '')),
    updatedAt: new Date().toISOString()
  };

  if (opts.author) {
    record.addedBy = opts.author.name || opts.author.email;
    record.addedByUserId = opts.author.id;
    record.addedByEmail = opts.author.email;
    record.addedOn = existing.addedOn || new Date().toISOString();
    record.createdAt = existing.createdAt || new Date().toISOString();
    record.isFavorite = Boolean(existing.isFavorite);
    record.isPopular = Boolean(existing.isPopular);
  }

  return record;
}

function findPlaceIndex(places: any[], id: string): number {
  return places.findIndex((place) => place && place.id === id);
}

function isPlaceOwner(place: any, author: PlaceAuthor): boolean {
  return Boolean(place) && place.addedByUserId === author.id;
}

// Static image serving
if (fs.existsSync(path.resolve(__dirname, 'data/images'))) {
  app.use('/images', express.static(path.resolve(__dirname, 'data/images')));
}
if (fs.existsSync(path.resolve(__dirname, 'public'))) {
  app.use(express.static(path.resolve(__dirname, 'public')));
}

// Real authentication: email OTP + Google ID token, both issuing an httpOnly session cookie
app.use('/api/auth', authRouter);

// Health check endpoint for Cloud Run & load balancers
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes: List places with general rate limiting (300 req / 5 min)
app.get('/api/places', createRateLimiter(300, 5 * 60 * 1000), (_req, res) => {
  const places = readPlacesFromFile();
  res.json(places);
});

// Endpoint to add a new pandal. Requires a real authenticated session: the
// contributor identity is taken from the session cookie, never from the body.
app.post(
  '/api/places',
  createRateLimiter(20, 10 * 60 * 1000),
  requireAuth,
  (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid place payload' });
      }

      const newPlace = buildPlaceFromInput(body, {
        id: `place-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        author: req.user!
      });

      const currentPlaces = readPlacesFromFile();
      const updatedPlaces = [newPlace, ...currentPlaces];

      savePlacesToFile(updatedPlaces)
        .then((saved) => {
          if (!saved) {
            return res
              .status(500)
              .json({ error: 'Failed to write place data to storage' });
          }
          res.status(201).json({
            success: true,
            message: 'Pandal successfully recorded',
            place: newPlace,
            totalPlaces: updatedPlaces.length
          });
        })
        .catch((err) => {
          console.error('Error in POST /api/places:', err);
          res.status(500).json({ error: 'An unexpected server error occurred' });
        });
    } catch (err) {
      if (err instanceof PlaceValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Error in POST /api/places:', err);
      res.status(500).json({ error: 'An unexpected server error occurred' });
    }
  }
);

// Edit a pandal. Only the contributor who created it may change it.
app.patch(
  '/api/places/:id',
  createRateLimiter(40, 10 * 60 * 1000),
  requireAuth,
  (req: Request, res: Response) => {
    try {
      const author = req.user!;
      const places = readPlacesFromFile();
      const index = findPlaceIndex(places, req.params.id);

      if (index === -1) {
        return res.status(404).json({ error: 'Pandal not found.' });
      }
      if (!isPlaceOwner(places[index], author)) {
        return res
          .status(403)
          .json({ error: 'You can only edit pandals that you added yourself.' });
      }

      const updated = buildPlaceFromInput(req.body || {}, {
        id: places[index].id,
        existing: places[index]
      });

      places[index] = updated;
      savePlacesToFile(places)
        .then((saved) => {
          if (!saved) {
            return res.status(500).json({ error: 'Failed to save your changes.' });
          }
          res.json({ success: true, place: updated });
        })
        .catch((err) => {
          console.error('Error in PATCH /api/places/:id:', err);
          res.status(500).json({ error: 'An unexpected server error occurred' });
        });
    } catch (err) {
      if (err instanceof PlaceValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Error in PATCH /api/places/:id:', err);
      res.status(500).json({ error: 'An unexpected server error occurred' });
    }
  }
);

// Delete a pandal. Only the contributor who created it may remove it.
app.delete(
  '/api/places/:id',
  createRateLimiter(40, 10 * 60 * 1000),
  requireAuth,
  (req: Request, res: Response) => {
    try {
      const author = req.user!;
      const places = readPlacesFromFile();
      const index = findPlaceIndex(places, req.params.id);

      if (index === -1) {
        return res.status(404).json({ error: 'Pandal not found.' });
      }
      if (!isPlaceOwner(places[index], author)) {
        return res
          .status(403)
          .json({ error: 'You can only delete pandals that you added yourself.' });
      }

      const [removed] = places.splice(index, 1);
      savePlacesToFile(places)
        .then((saved) => {
          if (!saved) {
            return res.status(500).json({ error: 'Failed to delete the pandal.' });
          }
          res.json({ success: true, place: removed, totalPlaces: places.length });
        })
        .catch((err) => {
          console.error('Error in DELETE /api/places/:id:', err);
          res.status(500).json({ error: 'An unexpected server error occurred' });
        });
    } catch (err) {
      console.error('Error in DELETE /api/places/:id:', err);
      res.status(500).json({ error: 'An unexpected server error occurred' });
    }
  }
);

// Destructive admin endpoint: replaces the entire dataset. Fails closed and now
// requires both a real session and the admin secret.
app.post('/api/places/bulk', requireAuth, (req: Request, res: Response) => {
  try {
    const expectedToken = (process.env.ADMIN_SYNC_TOKEN || '').trim();
    if (!expectedToken) {
      console.error('[places] ADMIN_SYNC_TOKEN is not set; refusing bulk import.');
      return res
        .status(503)
        .json({ error: 'Bulk import is disabled: ADMIN_SYNC_TOKEN is not configured.' });
    }

    const adminToken = req.headers['x-admin-token'] || req.headers['authorization'];
    if (
      adminToken !== expectedToken &&
      adminToken !== `Bearer ${expectedToken}`
    ) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Admin authorization required for bulk operations' });
    }

    const places = req.body;
    if (!Array.isArray(places)) {
      return res.status(400).json({ error: 'Payload must be an array of places' });
    }

    savePlacesToFile(places)
      .then((saved) => {
        if (!saved) {
          return res.status(500).json({ error: 'Failed to persist bulk places data' });
        }
        res.json({ success: true, count: places.length });
      })
      .catch((err) => {
        console.error('Error in POST /api/places/bulk:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  } catch (err) {
    console.error('Error in POST /api/places/bulk:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening securely on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer();
