import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// POST /api/stories/[id]/view - Track story view
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

    const views = story.views || [];
    
    // Add view if not already viewed
    if (!views.includes(userEmail)) {
      await db.collection("stories").updateOne(
        { id },
        { $addToSet: { views: userEmail } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
  }
}
