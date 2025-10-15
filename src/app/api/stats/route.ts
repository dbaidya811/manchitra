import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("🔍 Stats API called - attempting to connect to MongoDB...");

    // Check if environment variables are set
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI environment variable is not set");
      return NextResponse.json({
        ok: false,
        error: "Database configuration error",
        stats: {
          totalPlaces: 0,
          totalUsers: 0,
          recentUsers: []
        }
      }, { status: 500 });
    }

    const db = await getDb();

    console.log("✅ MongoDB connection successful");

    // Count total places
    const totalPlaces = await db.collection("places").countDocuments();
    console.log(`📊 Total places in database: ${totalPlaces}`);

    // Count total users from users collection
    const totalUsers = await db.collection("users").countDocuments();
    console.log(`👥 Total users in database: ${totalUsers}`);

    // Get all users with their images
    const recentUsers = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .project({ _id: 0, name: 1, email: 1, image: 1 })
      .toArray();

    console.log(`👤 Recent users found: ${recentUsers.length}`);

    // Remove duplicates based on email
    const uniqueUsers = Array.from(
      new Map(recentUsers.map((user: any) => [user.email, user])).values()
    );

    console.log(`🔄 Unique users after deduplication: ${uniqueUsers.length}`);

    return NextResponse.json({
      ok: true,
      stats: {
        totalPlaces,
        totalUsers,
        recentUsers: uniqueUsers || []
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (e: any) {
    console.error("❌ GET /api/stats error:", e);

    // Log additional debugging information
    console.error("🔍 Debug info:", {
      errorMessage: e?.message,
      errorStack: e?.stack,
      mongoUri: process.env.MONGODB_URI ? "Set (hidden)" : "Not set",
      mongoDb: process.env.MONGODB_DB || "Not set",
      nodeEnv: process.env.NODE_ENV || "Not set"
    });

    return NextResponse.json({
      ok: false,
      error: e?.message || "Server error",
      stats: {
        totalPlaces: 0,
        totalUsers: 0,
        recentUsers: []
      }
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}
