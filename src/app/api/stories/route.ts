import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET /api/stories - Get all stories (last 24 hours)
export async function GET() {
  try {
    const db = await getDb();
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    const stories = await db
      .collection("stories")
      .find({ createdAt: { $gt: twentyFourHoursAgo } })
      .sort({ createdAt: -1 })
      .project({ _id: 0 })
      .toArray();

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

// POST /api/stories - Create a new story
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const db = await getDb();
    
    const newStory = {
      id: Date.now().toString(),
      userEmail: session.user.email,
      userName: session.user.name || "User",
      userAvatar: session.user.image || "",
      imageUrl,
      createdAt: Date.now(),
      likes: [],
      views: []
    };

    await db.collection("stories").insertOne(newStory);

    return NextResponse.json({ story: newStory });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
