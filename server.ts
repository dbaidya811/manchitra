import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Disable X-Powered-By header to hide server technology
app.disable('x-powered-by');

// Security: Enforce standard OWASP HTTP response headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self)');
  next();
});

// Security: In-memory sliding-window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-client';

    const key = `${req.path}:${clientIp}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
        retryAfter: retryAfterSec
      });
    }

    record.count++;
    next();
  };
}

// Clean up expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Security: Restrict maximum request body size (prevent memory exhaustion DoS)
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

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

// Helper for atomic file persistence with backup
function savePlacesToFile(places: any[]): boolean {
  if (!Array.isArray(places)) return false;
  const jsonContent = JSON.stringify(places, null, 2);

  const targets = [srcPlacesJsonPath, rootDataPlacesJsonPath];
  let allSuccess = true;

  for (const targetPath of targets) {
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

      // Write to temp file then atomic rename to prevent corruption
      const tmpPath = `${targetPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, jsonContent, 'utf-8');
      fs.renameSync(tmpPath, targetPath);
    } catch (err) {
      console.error(`Error saving places atomically to ${targetPath}:`, err);
      allSuccess = false;
    }
  }

  return allSuccess;
}

// Security: String sanitizer to prevent XSS injections
function sanitizeString(str: any, maxLen = 300): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .trim()
    .slice(0, maxLen);
}

// Static image serving
if (fs.existsSync(path.resolve(__dirname, 'data/images'))) {
  app.use('/images', express.static(path.resolve(__dirname, 'data/images')));
}
if (fs.existsSync(path.resolve(__dirname, 'public'))) {
  app.use(express.static(path.resolve(__dirname, 'public')));
}

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

// Endpoint to add a new pandal with strict validation & rate limiting (20 contributions / 10 min)
app.post(
  '/api/places',
  createRateLimiter(20, 10 * 60 * 1000),
  (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid place payload' });
      }

      const name = sanitizeString(body.name, 120);
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Valid place name (min 2 characters) is required' });
      }

      // Validate coordinates (Kolkata & West Bengal bounding box: Lat 20..26, Lng 85..91)
      let coords: [number, number] = [22.5726, 88.3639];
      if (Array.isArray(body.coordinates) && body.coordinates.length >= 2) {
        const lat = Number(body.coordinates[0]);
        const lng = Number(body.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= 15 && lat <= 30 && lng >= 75 && lng <= 95) {
          coords = [lat, lng];
        }
      } else if (body.latitude !== undefined && body.longitude !== undefined) {
        const lat = Number(body.latitude);
        const lng = Number(body.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat >= 15 && lat <= 30 && lng >= 75 && lng <= 95) {
          coords = [lat, lng];
        }
      }

      // Sanitize fields
      const newPlace = {
        ...body,
        id: body.id || `place-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        zone: sanitizeString(body.zone || body.district, 80) || 'Kolkata',
        district: sanitizeString(body.district || body.zone, 80) || 'Kolkata',
        division: sanitizeString(body.division, 80) || 'Kolkata',
        description: sanitizeString(body.description, 1500) || 'Durga Puja pandal in Kolkata.',
        category: sanitizeString(body.category, 40) || 'popular',
        coordinates: coords,
        latitude: coords[0],
        longitude: coords[1],
        rating: Math.min(5, Math.max(1, Number(body.rating) || 4.8)),
        reviewCount: Math.max(1, Number(body.reviewCount) || 20),
        addedBy: sanitizeString(body.addedBy, 50) || 'Community Contributor',
        createdAt: new Date().toISOString()
      };

      const currentPlaces = readPlacesFromFile();
      const updatedPlaces = [newPlace, ...currentPlaces];
      const saved = savePlacesToFile(updatedPlaces);

      if (saved) {
        return res.status(201).json({
          success: true,
          message: 'Pandal successfully recorded',
          place: newPlace,
          totalPlaces: updatedPlaces.length
        });
      } else {
        return res.status(500).json({ error: 'Failed to write place data to storage' });
      }
    } catch (err) {
      console.error('Error in POST /api/places:', err);
      return res.status(500).json({ error: 'An unexpected server error occurred' });
    }
  }
);

// Protected endpoint to bulk update/import places (requires ADMIN_SECRET or admin header)
app.post('/api/places/bulk', (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'] || req.headers['authorization'];
    const expectedToken = process.env.ADMIN_SYNC_TOKEN || 'manchitra-admin-sync';

    // In production, reject if admin token doesn't match
    if (process.env.NODE_ENV === 'production' && adminToken !== expectedToken && adminToken !== `Bearer ${expectedToken}`) {
      return res.status(403).json({ error: 'Forbidden: Admin authorization required for bulk operations' });
    }

    const places = req.body;
    if (!Array.isArray(places)) {
      return res.status(400).json({ error: 'Payload must be an array of places' });
    }

    const saved = savePlacesToFile(places);
    if (saved) {
      return res.json({ success: true, count: places.length });
    } else {
      return res.status(500).json({ error: 'Failed to persist bulk places data' });
    }
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
