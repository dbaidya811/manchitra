import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// POST /api/feed/[id]/like - toggle like
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email || null;
    const { id } = params;

    const db = await getDb();
    const doc = await db.collection("feed").findOne({ id });
    if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // If user logged in, toggle membership in likedBy, else just increment likes once per request
    if (email) {
      const hasLiked = Array.isArray(doc.likedBy) && doc.likedBy.includes(email);
      if (hasLiked) {
        await db.collection("feed").updateOne(
          { id },
          { $inc: { likes: -1 }, $pull: { likedBy: email } } as any
        );
        return NextResponse.json({ ok: true, liked: false });
      } else {
        await db.collection("feed").updateOne(
          { id },
          { $inc: { likes: 1 }, $addToSet: { likedBy: email } } as any
        );
        return NextResponse.json({ ok: true, liked: true });
      }
    } else {
      // anonymous like - simple increment
      await db.collection("feed").updateOne({ id }, { $inc: { likes: 1 } });
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    console.error("POST /api/feed/[id]/like error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
