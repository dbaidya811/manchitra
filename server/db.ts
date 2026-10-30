import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Place } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path: support Render persistent disk mount (/var/data) or local /server/database.sqlite
const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.resolve(__dirname, 'database.sqlite');

// Ensure parent directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable SQLite Write-Ahead Logging (WAL) mode for maximum performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subTitle TEXT,
    district TEXT,
    category TEXT,
    zone TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    rating REAL DEFAULT 4.5,
    reviewCount INTEGER DEFAULT 1,
    image TEXT,
    images TEXT,
    sourceUrl TEXT,
    description TEXT,
    highlights TEXT,
    bestTimeToVisit TEXT,
    entryFee TEXT,
    isPopular INTEGER DEFAULT 0,
    isFavorite INTEGER DEFAULT 0,
    addedBy TEXT,
    addedByEmail TEXT,
    addedOn TEXT,
    tags TEXT,
    tips TEXT,
    accuracyMeters REAL,
    isVerifiedOnSite INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_places_zone ON places(zone);
  CREATE INDEX IF NOT EXISTS idx_places_coords ON places(lat, lng);
`);

/**
 * Transforms a raw SQLite row into a frontend Place object
 */
function rowToPlace(row: any): Place {
  let images: string[] | undefined;
  if (row.images) {
    try {
      images = JSON.parse(row.images);
    } catch {
      images = [];
    }
  }

  let highlights: string[] | undefined;
  if (row.highlights) {
    try {
      highlights = JSON.parse(row.highlights);
    } catch {
      highlights = [];
    }
  }

  let tags: string[] | undefined;
  if (row.tags) {
    try {
      tags = JSON.parse(row.tags);
    } catch {
      tags = [];
    }
  }

  const lat = Number(row.lat) || 22.5726;
  const lng = Number(row.lng) || 88.3639;

  return {
    id: String(row.id),
    name: String(row.name),
    subTitle: row.subTitle || undefined,
    district: row.district || undefined,
    category: row.category || undefined,
    zone: row.zone || undefined,
    coordinates: [lat, lng],
    latitude: lat,
    longitude: lng,
    rating: Number(row.rating) || 4.5,
    reviewCount: Number(row.reviewCount) || 1,
    image: row.image || './logo.png',
    images,
    sourceUrl: row.sourceUrl || undefined,
    source_url: row.sourceUrl || undefined,
    description: row.description || '',
    highlights,
    bestTimeToVisit: row.bestTimeToVisit || undefined,
    entryFee: row.entryFee || 'Free Entry',
    isFavorite: Boolean(row.isFavorite),
    isPopular: Boolean(row.isPopular),
    addedBy: row.addedBy || 'Community Contributor',
    addedByEmail: row.addedByEmail || undefined,
    addedOn: row.addedOn || undefined,
    added_on: row.addedOn || undefined,
    tags,
    tips: row.tips || undefined
  };
}

/**
 * Reads all places from the SQLite database
 */
export function getDbPlaces(): Place[] {
  try {
    const stmt = db.prepare('SELECT * FROM places ORDER BY isPopular DESC, name ASC');
    const rows = stmt.all();
    return rows.map(rowToPlace);
  } catch (err) {
    console.error('Error reading places from SQLite:', err);
    return [];
  }
}

/**
 * Reads a single place by ID from SQLite
 */
export function getDbPlaceById(id: string): Place | null {
  try {
    const stmt = db.prepare('SELECT * FROM places WHERE id = ?');
    const row = stmt.get(id);
    return row ? rowToPlace(row) : null;
  } catch (err) {
    console.error(`Error reading place ${id} from SQLite:`, err);
    return null;
  }
}

/**
 * Inserts a new pandal place into SQLite
 */
export function insertDbPlace(place: Place, accuracyMeters?: number): Place {
  const stmt = db.prepare(`
    INSERT INTO places (
      id, name, subTitle, district, category, zone, lat, lng,
      rating, reviewCount, image, images, sourceUrl, description,
      highlights, bestTimeToVisit, entryFee, isPopular, isFavorite,
      addedBy, addedByEmail, addedOn, tags, tips, accuracyMeters,
      isVerifiedOnSite, createdAt, updatedAt
    ) VALUES (
      @id, @name, @subTitle, @district, @category, @zone, @lat, @lng,
      @rating, @reviewCount, @image, @images, @sourceUrl, @description,
      @highlights, @bestTimeToVisit, @entryFee, @isPopular, @isFavorite,
      @addedBy, @addedByEmail, @addedOn, @tags, @tips, @accuracyMeters,
      @isVerifiedOnSite, @createdAt, @updatedAt
    )
  `);

  const now = new Date().toISOString();
  const [lat, lng] = place.coordinates || [22.5726, 88.3639];

  stmt.run({
    id: place.id,
    name: place.name,
    subTitle: place.subTitle || null,
    district: place.district || 'Kolkata',
    category: place.category || 'custom',
    zone: place.zone || 'Kolkata',
    lat: Number(lat),
    lng: Number(lng),
    rating: place.rating || 4.5,
    reviewCount: place.reviewCount || 1,
    image: place.image || './logo.png',
    images: place.images ? JSON.stringify(place.images) : null,
    sourceUrl: place.sourceUrl || place.source_url || null,
    description: place.description || '',
    highlights: place.highlights ? JSON.stringify(place.highlights) : null,
    bestTimeToVisit: place.bestTimeToVisit || 'Evening (5:00 PM - 11:00 PM)',
    entryFee: place.entryFee || 'Free Entry',
    isPopular: place.isPopular ? 1 : 0,
    isFavorite: place.isFavorite ? 1 : 0,
    addedBy: place.addedBy || 'Verified On-Site Contributor',
    addedByEmail: place.addedByEmail || null,
    addedOn: place.addedOn || place.added_on || now,
    tags: place.tags ? JSON.stringify(place.tags) : null,
    tips: place.tips || null,
    accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : 10,
    isVerifiedOnSite: 1,
    createdAt: now,
    updatedAt: now
  });

  return getDbPlaceById(place.id) || place;
}

/**
 * Updates an existing place in SQLite
 */
export function updateDbPlace(
  id: string,
  updates: Partial<Place>,
  accuracyMeters?: number
): Place | null {
  const existing = getDbPlaceById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const [lat, lng] = updates.coordinates || existing.coordinates;

  const stmt = db.prepare(`
    UPDATE places SET
      name = COALESCE(@name, name),
      subTitle = COALESCE(@subTitle, subTitle),
      district = COALESCE(@district, district),
      category = COALESCE(@category, category),
      zone = COALESCE(@zone, zone),
      lat = COALESCE(@lat, lat),
      lng = COALESCE(@lng, lng),
      rating = COALESCE(@rating, rating),
      reviewCount = COALESCE(@reviewCount, reviewCount),
      image = COALESCE(@image, image),
      images = COALESCE(@images, images),
      sourceUrl = COALESCE(@sourceUrl, sourceUrl),
      description = COALESCE(@description, description),
      highlights = COALESCE(@highlights, highlights),
      bestTimeToVisit = COALESCE(@bestTimeToVisit, bestTimeToVisit),
      entryFee = COALESCE(@entryFee, entryFee),
      isPopular = COALESCE(@isPopular, isPopular),
      isFavorite = COALESCE(@isFavorite, isFavorite),
      tags = COALESCE(@tags, tags),
      tips = COALESCE(@tips, tips),
      accuracyMeters = COALESCE(@accuracyMeters, accuracyMeters),
      updatedAt = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    id,
    name: updates.name || null,
    subTitle: updates.subTitle || null,
    district: updates.district || null,
    category: updates.category || null,
    zone: updates.zone || null,
    lat: updates.coordinates ? Number(lat) : null,
    lng: updates.coordinates ? Number(lng) : null,
    rating: updates.rating ?? null,
    reviewCount: updates.reviewCount ?? null,
    image: updates.image || null,
    images: updates.images ? JSON.stringify(updates.images) : null,
    sourceUrl: updates.sourceUrl || updates.source_url || null,
    description: updates.description ?? null,
    highlights: updates.highlights ? JSON.stringify(updates.highlights) : null,
    bestTimeToVisit: updates.bestTimeToVisit || null,
    entryFee: updates.entryFee || null,
    isPopular: updates.isPopular !== undefined ? (updates.isPopular ? 1 : 0) : null,
    isFavorite: updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : null,
    tags: updates.tags ? JSON.stringify(updates.tags) : null,
    tips: updates.tips || null,
    accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : null,
    updatedAt: now
  });

  return getDbPlaceById(id);
}

/**
 * Deletes a place by ID from SQLite
 */
export function deleteDbPlace(id: string): Place | null {
  const existing = getDbPlaceById(id);
  if (!existing) return null;

  const stmt = db.prepare('DELETE FROM places WHERE id = ?');
  stmt.run(id);
  return existing;
}

/**
 * Bulk imports places into SQLite in a single transaction
 */
export function bulkImportDbPlaces(places: Place[]): number {
  if (!Array.isArray(places) || places.length === 0) return 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO places (
      id, name, subTitle, district, category, zone, lat, lng,
      rating, reviewCount, image, images, sourceUrl, description,
      highlights, bestTimeToVisit, entryFee, isPopular, isFavorite,
      addedBy, addedByEmail, addedOn, tags, tips, accuracyMeters,
      isVerifiedOnSite, createdAt, updatedAt
    ) VALUES (
      @id, @name, @subTitle, @district, @category, @zone, @lat, @lng,
      @rating, @reviewCount, @image, @images, @sourceUrl, @description,
      @highlights, @bestTimeToVisit, @entryFee, @isPopular, @isFavorite,
      @addedBy, @addedByEmail, @addedOn, @tags, @tips, @accuracyMeters,
      @isVerifiedOnSite, @createdAt, @updatedAt
    )
  `);

  const now = new Date().toISOString();

  const insertMany = db.transaction((items: Place[]) => {
    let count = 0;
    for (const place of items) {
      if (!place || !place.id || !place.name) continue;
      const [lat, lng] = Array.isArray(place.coordinates)
        ? place.coordinates
        : [Number(place.latitude) || 22.5726, Number(place.longitude) || 88.3639];

      insertStmt.run({
        id: String(place.id),
        name: String(place.name),
        subTitle: place.subTitle || null,
        district: place.district || 'Kolkata',
        category: place.category || 'popular',
        zone: place.zone || 'Kolkata',
        lat: Number(lat) || 22.5726,
        lng: Number(lng) || 88.3639,
        rating: Number(place.rating) || 4.5,
        reviewCount: Number(place.reviewCount) || 1,
        image: place.image || './logo.png',
        images: place.images ? JSON.stringify(place.images) : null,
        sourceUrl: place.sourceUrl || place.source_url || null,
        description: place.description || '',
        highlights: place.highlights ? JSON.stringify(place.highlights) : null,
        bestTimeToVisit: place.bestTimeToVisit || 'Evening',
        entryFee: place.entryFee || 'Free Entry',
        isPopular: place.isPopular ? 1 : 0,
        isFavorite: place.isFavorite ? 1 : 0,
        addedBy: place.addedBy || 'Community Contributor',
        addedByEmail: place.addedByEmail || null,
        addedOn: place.addedOn || place.added_on || now,
        tags: place.tags ? JSON.stringify(place.tags) : null,
        tips: place.tips || null,
        accuracyMeters: 5,
        isVerifiedOnSite: 1,
        createdAt: now,
        updatedAt: now
      });
      count++;
    }
    return count;
  });

  return insertMany(places);
}

/**
 * Seeds SQLite database with existing places.json if empty
 */
export function seedDatabaseIfEmpty(): void {
  try {
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM places');
    const { total } = countStmt.get() as { total: number };

    if (total === 0) {
      console.log('[SQLite] Places table is empty. Seeding from places.json...');
      const candidates = [
        path.resolve(__dirname, '../src/data/places.json'),
        path.resolve(__dirname, '../data/places.json')
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8');
          const places = JSON.parse(content);
          if (Array.isArray(places) && places.length > 0) {
            const count = bulkImportDbPlaces(places);
            console.log(`[SQLite] Successfully seeded ${count} pandals into SQLite database (${DB_PATH})`);
            return;
          }
        }
      }
    } else {
      console.log(`[SQLite] Database active with ${total} pandal records at ${DB_PATH}`);
    }
  } catch (err) {
    console.error('[SQLite] Error seeding database:', err);
  }
}

// Automatically seed on module load
seedDatabaseIfEmpty();
