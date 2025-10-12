import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    
    // Count total places
    const totalPlaces = await db.collection("places").countDocuments();
    
    // Count total users from users collection
    const totalUsers = await db.collection("users").countDocuments();
    
    // Get all users with their images
    const recentUsers = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .project({ _id: 0, name: 1, email: 1, image: 1 })
      .toArray();
    
    // Remove duplicates based on email
    const uniqueUsers = Array.from(
      new Map(recentUsers.map((user: any) => [user.email, user])).values()
    );
    
    return NextResponse.json({ 
      ok: true, 
      stats: {
        totalPlaces,
        totalUsers,
        recentUsers: uniqueUsers || []
      }
    });
  } catch (e: any) {
    console.error("GET /api/stats error", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Server error",
      stats: {
        totalPlaces: 0,
        totalUsers: 0,
        recentUsers: []
      }
    }, { status: 500 });
  }
}
