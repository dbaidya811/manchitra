import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// DELETE /api/stories/[id] - Delete a story (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const db = await getDb();

    const story = await db.collection("stories").findOne({ id });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if user is the owner
    if (story.userEmail !== session.user.email) {
      return NextResponse.json({ error: "Not authorized to delete this story" }, { status: 403 });
    }

    await db.collection("stories").deleteOne({ id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}
