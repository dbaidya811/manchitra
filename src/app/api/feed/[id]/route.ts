import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// PATCH /api/feed/[id] - edit a post (owner only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { cardName, text, photos } = body || {};

    const db = await getDb();
    const existing = await db.collection("feed_posts").findOne({ id });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const owner: string | null = existing.ownerEmail ?? null;
    const current: string | null = session?.user?.email ?? null;
    if (!owner || owner !== current) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const updates: any = {
      updatedAt: new Date(),
      edited: true,
    };
    if (typeof cardName === 'string' && cardName.trim()) updates.cardName = cardName.trim();
    if (typeof text === 'string') updates.text = text;
    if (Array.isArray(photos)) updates.photos = photos.slice(0, 5);

    await db.collection("feed_posts").updateOne({ id }, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /api/feed/[id] error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/feed/[id] - delete a post (owner only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    const db = await getDb();
    const existing = await db.collection("feed_posts").findOne({ id });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const owner: string | null = existing.ownerEmail ?? null;
    const current: string | null = session?.user?.email ?? null;
    if (!owner || owner !== current) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await db.collection("feed_posts").deleteOne({ id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/feed/[id] error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
