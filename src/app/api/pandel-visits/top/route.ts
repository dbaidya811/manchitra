import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch top pandels based on visit counts from database
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "25");

    const db = await getDb();

    // Get visit counts aggregated by placeId
    const visitCounts = await db
      .collection("top.manchitra")
      .aggregate([
        {
          $group: {
            _id: "$placeId",
            visitCount: { $sum: 1 },
            lastVisited: { $max: "$visitedAt" }
          }
        },
        {
          $sort: { visitCount: -1 }
        },
        {
          $limit: limit
        }
      ])
      .toArray();

    // Get the actual place data for these IDs
    const placeIds = visitCounts.map((v: any) => v._id);

    if (placeIds.length === 0) {
      return NextResponse.json({ ok: true, topPandels: [] }, { headers: corsHeaders });
    }

    const places = await db
      .collection("places")
      .find({ id: { $in: placeIds } })
      .project({ _id: 0 })
      .toArray();

    // Create a map of placeId to place data
    const placeMap = new Map();
    places.forEach((place: any) => {
      placeMap.set(place.id, place);
    });

    // Combine places with their visit counts, maintaining sort order
    const topPandels = visitCounts
      .map((visitData: any) => {
        const place = placeMap.get(visitData._id);
        if (!place) return null;
        return {
          place,
          visits: visitData.visitCount,
          lastVisited: visitData.lastVisited
        };
      })
      .filter((item: any) => item !== null);

    return NextResponse.json({ ok: true, topPandels }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("GET /api/pandel-visits/top error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error", topPandels: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Recalculate and cache top pandels (admin function)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recalculate } = body || {};

    if (recalculate !== true) {
      return NextResponse.json(
        { ok: false, error: "Invalid request - use recalculate: true" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await getDb();

    // Get all visit counts aggregated by placeId
    const allVisits = await db
      .collection("top.manchitra")
      .aggregate([
        {
          $group: {
            _id: "$placeId",
            visitCount: { $sum: 1 }
          }
        },
        {
          $sort: { visitCount: -1 }
        }
      ])
      .toArray();

    // Get top 10 and top 25
    const top10 = allVisits.slice(0, 10);
    const top25 = allVisits.slice(0, 25);

    // Save to database for caching
    await db.collection("global_top_pandel").updateOne(
      { type: "top10" },
      {
        $set: {
          places: top10,
          lastCalculated: new Date(),
          totalPlaces: top10.length
        }
      },
      { upsert: true }
    );

    await db.collection("global_top_pandel").updateOne(
      { type: "top25" },
      {
        $set: {
          places: top25,
          lastCalculated: new Date(),
          totalPlaces: top25.length
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      top10: { count: top10.length, places: top10 },
      top25: { count: top25.length, places: top25 }
    }, { headers: corsHeaders });

  } catch (e: any) {
    console.error("POST /api/pandel-visits/top error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
