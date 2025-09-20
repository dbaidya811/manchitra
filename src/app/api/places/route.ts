import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine");
    const session = await getServerSession(authOptions);

    const db = await getDb();
    const query: Record<string, any> = {};
    if (mine && session?.user?.email) {
      query.userEmail = session.user.email;
    }
    const places = await db
      .collection("places")
      .find(query)
      .sort({ createdAt: -1, id: -1 })
      .limit(500)
      .project({ _id: 0 })
      .toArray();

    return NextResponse.json({ ok: true, places });
  } catch (e: any) {
    console.error("GET /api/places error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/places error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/places error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
