import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

// Helper function to calculate distance between two coordinates (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// POST: Track a pandel visit for a specific email with location verification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { placeId, userEmail, userLat, userLon } = body || {};

    if (typeof placeId !== "number") {
      return NextResponse.json(
        { ok: false, error: "Invalid placeId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use session email if available, otherwise use provided email
    const email = session?.user?.email || userEmail;
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user location is provided
    if (typeof userLat !== "number" || typeof userLon !== "number") {
      return NextResponse.json(
        { ok: false, error: "User location (lat, lon) is required for visit verification" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await getDb();

    // Get the pandel location from database
    const pandel = await db.collection("places").findOne({ id: placeId });
    if (!pandel) {
      return NextResponse.json(
        { ok: false, error: "Pandel not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Extract pandel coordinates
    let pandelLat: number, pandelLon: number;

    if (typeof pandel.lat === 'number' && typeof pandel.lon === 'number') {
      pandelLat = pandel.lat;
      pandelLon = pandel.lon;
    } else if (pandel.location && typeof pandel.location === 'string' && pandel.location.includes(',')) {
      const parts = pandel.location.split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // Detect coordinate order (lat, lon) vs (lon, lat)
        if (Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180) {
          pandelLat = parts[0];
          pandelLon = parts[1];
        } else if (Math.abs(parts[0]) <= 180 && Math.abs(parts[1]) <= 90) {
          pandelLat = parts[1];
          pandelLon = parts[0];
        } else {
          return NextResponse.json(
            { ok: false, error: "Invalid pandel coordinates" },
            { status: 400, headers: corsHeaders }
          );
        }
      } else {
        return NextResponse.json(
          { ok: false, error: "Invalid pandel location format" },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "Pandel location not available" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate distance between user and pandel
    const distance = calculateDistance(userLat, userLon, pandelLat, pandelLon);
    const maxDistance = 500; // 500 meters maximum distance for valid visit

    if (distance > maxDistance) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too far from pandel location",
          distance: Math.round(distance),
          maxDistance,
          message: `You need to be within ${maxDistance}m of the pandel to mark it as visited`
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if this email has already visited this pandel
    const existingVisit = await db.collection("top.manchitra").findOne({
      placeId,
      userEmail: email
    });

    if (existingVisit) {
      return NextResponse.json(
        {
          ok: false,
          error: "Already visited",
          visitedAt: existingVisit.visitedAt,
          message: "You have already visited this pandel"
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Record the visit with location data
    const result = await db.collection("top.manchitra").insertOne({
      placeId,
      userEmail: email,
      userLat,
      userLon,
      pandelLat,
      pandelLon,
      distance,
      visitedAt: new Date(),
      createdAt: new Date()
    });

    // Get updated visit count for this pandel
    const visitCount = await db.collection("top.manchitra").countDocuments({ placeId });

    // Trigger recalculation of top pandels in the background
    try {
      await fetch(`${req.nextUrl.origin}/api/pandel-visits/top`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculate: true })
      });
    } catch (recalcError) {
      console.error('Failed to trigger top pandels recalculation:', recalcError);
      // Don't fail the request if recalculation fails
    }

    return NextResponse.json({
      ok: true,
      placeId,
      visitCount,
      visitedAt: new Date(),
      distance: Math.round(distance),
      message: "Visit recorded successfully!"
    }, { headers: corsHeaders });

  } catch (e: any) {
    console.error("POST /api/pandel-visits error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET: Get visit status and count for a specific pandel and email
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const placeId = parseInt(url.searchParams.get("placeId") || "0");
    const userEmail = url.searchParams.get("userEmail");

    if (!placeId || !userEmail) {
      return NextResponse.json(
        { ok: false, error: "placeId and userEmail are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await getDb();

    // Check if this email has visited this pandel
    const existingVisit = await db.collection("top.manchitra").findOne({
      placeId,
      userEmail: userEmail
    });

    // Get total visit count for this pandel
    const visitCount = await db.collection("top.manchitra").countDocuments({ placeId });

    return NextResponse.json({
      ok: true,
      visited: !!existingVisit,
      visitedAt: existingVisit?.visitedAt || null,
      visitCount
    }, { headers: corsHeaders });

  } catch (e: any) {
    console.error("GET /api/pandel-visits error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
