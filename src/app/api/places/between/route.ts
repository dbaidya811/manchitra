import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = parseFloat(searchParams.get('fromLat') || '');
    const fromLon = parseFloat(searchParams.get('fromLon') || '');
    const toLat = parseFloat(searchParams.get('toLat') || '');
    const toLon = parseFloat(searchParams.get('toLon') || '');

    if (
      Number.isNaN(fromLat) ||
      Number.isNaN(fromLon) ||
      Number.isNaN(toLat) ||
      Number.isNaN(toLon)
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Calculate bounding box
    const minLat = Math.min(fromLat, toLat);
    const maxLat = Math.max(fromLat, toLat);
    const minLon = Math.min(fromLon, toLon);
    const maxLon = Math.max(fromLon, toLon);

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('manchitra');
    const collection = db.collection('places');

    // Query places within the bounding box
    const places = await collection
      .find({
        $or: [
          {
            lat: { $gte: minLat, $lte: maxLat },
            lon: { $gte: minLon, $lte: maxLon },
          },
          {
            location: {
              $regex: new RegExp(
                `^\\s*(${minLat.toFixed(2)}|${maxLat.toFixed(2)})[^,]*,\\s*(${minLon.toFixed(2)}|${maxLon.toFixed(2)})`,
                'i'
              ),
            },
          },
        ],
      })
      .limit(50)
      .toArray();

    await client.close();

    // Parse and filter places
    const results = places
      .map((p: any) => {
        let lat: number | null = null;
        let lon: number | null = null;

        if (typeof p.lat === 'number' && typeof p.lon === 'number') {
          lat = p.lat;
          lon = p.lon;
        } else if (typeof p.location === 'string' && p.location.includes(',')) {
          const parts = p.location.split(',').map((s: string) => s.trim());
          const a = parseFloat(parts[0] || '');
          const b = parseFloat(parts[1] || '');
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
              lat = a;
              lon = b;
            } else if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
              lat = b;
              lon = a;
            }
          }
        }

        if (lat === null || lon === null) return null;

        // Check if within bounding box
        if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
          return {
            id: p.id ?? p._id?.toString() ?? `${lat},${lon}`,
            name: p.tags?.name || p.name || `Place #${p.id || p._id}`,
            lat,
            lon,
          };
        }
        return null;
      })
      .filter((x: any) => x !== null);

    return NextResponse.json({ places: results, count: results.length });
  } catch (error: any) {
    console.error('Error finding places between:', error);
    return NextResponse.json(
      { error: 'Failed to find places', details: error.message },
      { status: 500 }
    );
  }
}
