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
    const rateLimitResult = await checkEndpointRateLimit(req, 'PANDEL_SUGGESTIONS', session?.user?.email || undefined);

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
    const query = url.searchParams.get("q");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 20); // Max 20 suggestions

    if (!query || query.length < 2) {
      return NextResponse.json({
        ok: true,
        suggestions: [],
        query: query || ""
      }, { headers: corsHeaders });
    }

    // Check cache first for better performance
    const cacheKey = `pandel-suggestions:${query.toLowerCase()}:${limit}`;
    try {
      const cachedSuggestions = await redis.get(cacheKey);
      if (cachedSuggestions) {
        console.log('🎪 Returning cached pandel suggestions:', JSON.parse(cachedSuggestions).length);
        return NextResponse.json({
          ok: true,
          suggestions: JSON.parse(cachedSuggestions),
          query,
          cached: true
        }, { headers: corsHeaders });
      }
    } catch (cacheError) {
      console.error('Cache read error for pandel suggestions:', cacheError);
    }

    const db = await getDb();
    const collection = db.collection("places");

    // Search for places that contain pandel-related keywords or match the query
    const searchQuery = {
      $and: [
        // Only search in places that have names
        { "tags.name": { $exists: true, $ne: null, $ne: "" } },
        // Search in the name field with case-insensitive regex
        {
          "tags.name": {
            $regex: query,
            $options: "i"
          }
        }
      ]
    };

    // Get suggestions from database
    const suggestions = await collection
      .find(searchQuery, {
        projection: {
          _id: 0,
          id: 1,
          "tags.name": 1,
          lat: 1,
          lon: 1,
          area: 1
        },
        sort: { "tags.name": 1 },
        limit: limit
      })
      .toArray();

    // Transform suggestions to the expected format
    const formattedSuggestions = suggestions.map(place => ({
      id: place.id,
      name: place.tags?.name || "",
      lat: place.lat,
      lon: place.lon,
      area: place.area || ""
    }));

    // Cache the results for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(formattedSuggestions));
    } catch (cacheError) {
      console.error('Cache write error for pandel suggestions:', cacheError);
    }

    console.log('🎪 Fetched pandel suggestions from DB:', formattedSuggestions.length, 'for query:', query);

    return NextResponse.json({
      ok: true,
      suggestions: formattedSuggestions,
      query,
      total: formattedSuggestions.length
    }, { headers: corsHeaders });

  } catch (e: any) {
    console.error("🎪 Pandel suggestions API error:", e);

    return NextResponse.json({
      ok: false,
      error: e?.message || "Server error",
      suggestions: []
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}
