import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// POST /api/feed/[id]/like - toggle like
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const bodyEmail = typeof body?.email === 'string' ? body.email : null;
    const unlike = !!body?.unlike;
    const email = session?.user?.email || bodyEmail;
    const { id } = params;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email required to like" }, { status: 401 });
    }

    const db = await getDb();
    const doc = await db.collection("feed").findOne({ id });
    if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const hasLiked = Array.isArray(doc.likedBy) && doc.likedBy.includes(email);

    if (unlike || hasLiked) {
      // Unlike path: remove email if present, decrement likes but not below 0
      const newLikes = Math.max(0, (typeof doc.likes === 'number' ? doc.likes : 0) - (hasLiked ? 1 : 0));
      await db.collection("feed").updateOne(
        { id },
        { $set: { likes: newLikes }, $pull: { likedBy: email } } as any
      );
      return NextResponse.json({ ok: true, liked: false, likes: newLikes });
    } else {
      // Like path: add email if missing, increment likes
      const newLikes = (typeof doc.likes === 'number' ? doc.likes : 0) + 1;
      await db.collection("feed").updateOne(
        { id },
        { $set: { likes: newLikes }, $addToSet: { likedBy: email } } as any
      );
      return NextResponse.json({ ok: true, liked: true, likes: newLikes });
    }
  } catch (e: any) {
    console.error("POST /api/feed/[id]/like error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
