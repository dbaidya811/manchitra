import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// POST /api/stories/[id]/like - Toggle like on a story
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userEmail = session.user.email;
    const db = await getDb();

    const story = await db.collection("stories").findOne({ id });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const likes = story.likes || [];
    const hasLiked = likes.includes(userEmail);

    if (hasLiked) {
      // Unlike
      await db.collection("stories").updateOne(
        { id },
        { $pull: { likes: userEmail } } as any
      );
    } else {
      // Like
      await db.collection("stories").updateOne(
        { id },
        { $addToSet: { likes: userEmail } }
      );
    }

    return NextResponse.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
