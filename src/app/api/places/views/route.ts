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

// GET: Fetch global view counts for all places from database
export async function GET(req: Request) {
  try {
    const db = await getDb();

    // Get all place views from the database
    const viewsData = await db
      .collection("place_views")
      .find({})
      .project({ _id: 0, placeId: 1, viewCount: 1, lastViewedAt: 1 })
      .toArray();

    // Convert to a map of placeId -> viewCount
    const viewCounts: Record<number, number> = {};
    viewsData.forEach((item: any) => {
      if (item.placeId && typeof item.viewCount === 'number') {
        viewCounts[item.placeId] = item.viewCount;
      }
    });

    return NextResponse.json({ ok: true, viewCounts }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("GET /api/places/views error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error", viewCounts: {} },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Increment view count for a place and trigger top places recalculation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { placeId } = body || {};

    if (typeof placeId !== "number") {
      return NextResponse.json(
        { ok: false, error: "Invalid placeId" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await getDb();

    // Increment the view count for this place (upsert if doesn't exist)
    const result = await db.collection("place_views").updateOne(
      { placeId },
      {
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() }
      },
      { upsert: true }
    );

    // Get the updated count
    const updated = await db.collection("place_views").findOne({ placeId });
    const newCount = updated?.viewCount || 1;

    // Trigger recalculation of top places in the background
    // This ensures all users see updated rankings quickly
    try {
      await fetch(`${req.nextUrl.origin}/api/places/top`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculate: true })
      });
    } catch (recalcError) {
      console.error('Failed to trigger top places recalculation:', recalcError);
      // Don't fail the request if recalculation fails
    }

    return NextResponse.json(
      { ok: true, placeId, viewCount: newCount },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    console.error("POST /api/places/views error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
