import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { CacheManager, redis } from "@/lib/redis";
import { securityMiddleware, checkEndpointRateLimit } from "@/lib/auth-check";

export const runtime = "nodejs";

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    // Check rate limiting
    const session = await getServerSession(authOptions);
    const rateLimitResult = await checkEndpointRateLimit(req, 'PLACES', session?.user?.email || undefined);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          ok: false,
          retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '500',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    const url = new URL(req.url);
    const mine = url.searchParams.get("mine");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 1000); // Increased cap: default 500, max 1000
    const search = url.searchParams.get("search");
    const userEmail = session?.user?.email || undefined;

    // Check cache first for better performance
    const cacheKey = search
      ? `places:search:${search}:${page}:${limit}`
      : userEmail
        ? `places:user:${userEmail}:${page}:${limit}`
        : `places:public:${page}:${limit}`;

    const cachedPlaces = await CacheManager.getPlacesCache(userEmail, limit);
    if (cachedPlaces && !search) {
      console.log('📋 Returning cached places:', cachedPlaces.length);
      // Implement pagination for cached results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPlaces = cachedPlaces.slice(startIndex, endIndex);

      return NextResponse.json({
        ok: true,
        places: paginatedPlaces,
        pagination: {
          page,
          limit,
          total: cachedPlaces.length,
          totalPages: Math.ceil(cachedPlaces.length / limit)
        }
      }, { headers: corsHeaders });
    }

    const db = await getDb();
    const collection = db.collection("places");

    // Build optimized query with proper indexing
    const query: Record<string, any> = {};

    if (mine && userEmail) {
      query.userEmail = userEmail;
    }

    // Add search functionality with text index
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Optimized query with proper sorting and pagination
    const places = await collection
      .find(query, {
        projection: { _id: 0 },
        sort: search ? { score: { $meta: "textScore" }, createdAt: -1 } : { createdAt: -1, id: -1 },
        skip,
        limit,
      })
      .toArray();

    // Get total count for pagination (cached separately)
    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Cache the results (only non-search results)
    if (!search) {
      await CacheManager.setPlacesCache(places, userEmail, limit);
    }

    console.log('🏛️ Fetched places from DB:', places.length, 'Total:', totalCount);
    return NextResponse.json({
      ok: true,
      places,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("🏛️ Places API error:", e);

    // Enhanced error logging for performance monitoring
    console.error("🏛️ Debug info:", {
      errorMessage: e?.message,
      errorStack: e?.stack,
      mongoUri: process.env.MONGODB_URI1 ? "Set (hidden)" : "Not set",
      mongoDb: process.env.MONGODB_DB || "Not set",
      nodeEnv: process.env.NODE_ENV || "Not set",
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ ok: false, error: e?.message || "Server error", places: [] }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json();
    // Expecting: { id, lat, lon, area, tags, photos }
    const { id, lat, lon, area, tags, photos } = body || {};
    if (typeof id !== "number" || typeof lat !== "number" || typeof lon !== "number" || !tags?.name) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const db = await getDb();
    const doc = {
      id,
      lat,
      lon,
      area: area || null,
      tags,
      photos: photos || [],
      userEmail: session?.user?.email || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existing = await db.collection("places").findOne({ id });
    if (existing) {
      const owner: string | null = existing.userEmail ?? null;
      const current: string | null = session?.user?.email ?? null;
      if (!owner || owner !== current) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      doc.createdAt = existing.createdAt || doc.createdAt;
    }

    await db
      .collection("places")
      .updateOne({ id }, { $set: doc }, { upsert: true });

    // Invalidate cache when place is created/updated
    try {
      // Clear all places cache since data changed
      await redis.del('places:public:500');
      if (session?.user?.email) {
        await redis.del(`places:${session.user.email}:500`);
      }
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("POST /api/places error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { id } = body || {};
    if (typeof id !== "number") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("places").findOne({ id });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const owner: string | null = existing.userEmail ?? null;
    const current: string | null = session?.user?.email ?? null;
    if (!owner || owner !== current) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const res = await db.collection("places").deleteOne({ id });
    if (res.deletedCount !== 1) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Invalidate cache when place is deleted
    try {
      // Clear all places cache since data changed
      await redis.del('places:public:500');
      if (session?.user?.email) {
        await redis.del(`places:${session.user.email}:500`);
      }
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("DELETE /api/places error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500, headers: corsHeaders });
  }
}
