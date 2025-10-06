import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// Schema stored in collection "history" (DB from getDb):
// { type: 'visit' | 'search', name, lat, lon, time, status?, userEmail?, createdAt }

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    const db = await getDb();
    const col = db.collection("history");

    const query: Record<string, any> = {};
    if (email) query.userEmail = email;
    // If not logged in, return empty to avoid leaking others' history
    if (!email) return NextResponse.json({ ok: true, items: [] });

    const items = await col
      .find(query)
      .project({ _id: 0 })
      .sort({ time: -1 })
      .limit(1000)
      .toArray();

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("GET /api/history error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    const body = await req.json().catch(() => ({}));
    const { type, data } = body || {};
    if (type !== "visit" && type !== "search") {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }
    if (!data || typeof data.name !== "string" || typeof data.lat !== "number" || typeof data.lon !== "number") {
      return NextResponse.json({ ok: false, error: "invalid_data" }, { status: 400 });
    }

    // If client sent user's current position, derive visited/not-visited automatically.
    // Equality: treat as visited if within ~30 meters.
    const userLat: number | undefined = typeof data.userLat === 'number' ? data.userLat : undefined;
    const userLon: number | undefined = typeof data.userLon === 'number' ? data.userLon : undefined;
    const epsM: number = typeof data.epsM === 'number' && data.epsM > 0 ? data.epsM : 30;
    const haversineM = (aLat: number, aLon: number, bLat: number, bLon: number) => {
      const R = 6371000;
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
      const h = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };
    let derivedStatus: 'visited' | 'not-visited' | undefined = undefined;
    if (typeof userLat === 'number' && typeof userLon === 'number') {
      const d = haversineM(userLat, userLon, data.lat, data.lon);
      derivedStatus = d <= epsM ? 'visited' : 'not-visited';
    }

    const item = {
      type,
      name: data.name,
      lat: data.lat,
      lon: data.lon,
      time: typeof data.time === "number" ? data.time : Date.now(),
      status: data.status === "visited" || data.status === "not-visited" ? data.status : derivedStatus,
      userEmail: email || null,
      createdAt: new Date(),
    };

    const db = await getDb();
    await db.collection("history").insertOne(item);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/history error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const db = await getDb();
    await db.collection("history").deleteMany({ userEmail: email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/history error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
