import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET /api/feed - list public posts (newest first)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200));
    const mine = url.searchParams.get("mine");
    const session = await getServerSession(authOptions);

    const db = await getDb();
    const query: any = {};
    if (mine && session?.user?.email) {
      query.ownerEmail = session.user.email;
    }
    const posts = await db
      .collection("feed")
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .project({ _id: 0 })
      .toArray();

    return NextResponse.json({ ok: true, posts });
  } catch (e: any) {
    console.error("GET /api/feed error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST /api/feed - create a new post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { id, author, avatarUrl, cardName, text, photos, createdAt, ownerEmail, poll } = body || {};

    // Allow post if it has either text, photos, or a valid poll (cardName optional)
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasPhotos = Array.isArray(photos) && photos.length > 0;
    const pollValid = poll && Array.isArray(poll.options) && poll.options.filter((s: any) => typeof s === 'string' && s.trim().length > 0).length >= 2;
    if (typeof id !== "string" || (!hasText && !hasPhotos && !pollValid)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const db = await getDb();
    const doc: any = {
      id,
      author: typeof author === 'string' ? author : null,
      avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl : (session?.user?.image || null),
      cardName: typeof cardName === 'string' ? String(cardName) : '',
      text: typeof text === 'string' ? text : '',
      photos: Array.isArray(photos) ? photos.slice(0, 5) : [],
      createdAt: typeof createdAt === 'number' ? new Date(createdAt) : new Date(),
      updatedAt: null as Date | null,
      likes: 0,
      likedBy: [] as string[],
      ownerEmail: ownerEmail || session?.user?.email || null,
      edited: false,
    };

    // Normalize poll if provided
    if (pollValid) {
      const cleanOptions = poll.options
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 4)
        .map((s: string, i: number) => ({ id: String(i + 1), text: s.trim(), votes: 0, voters: [] as string[] }));
      doc.poll = {
        options: cleanOptions,
        allowMultiple: !!poll.allowMultiple,
        expiresAt: typeof poll.expiresAt === 'number' ? new Date(poll.expiresAt) : null,
        createdAt: new Date(),
      };
    }

    await db.collection("feed").updateOne({ id }, { $set: doc }, { upsert: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/feed error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
