import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("🏥 Health check called");

    // Check if environment variables are set
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        status: "error",
        message: "MONGODB_URI environment variable is not set",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const db = await getDb();

    // Try to ping the database
    await db.admin().ping();

    // Check collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    return NextResponse.json({
      status: "healthy",
      message: "Database connection successful",
      collections: collectionNames,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("🏥 Health check error:", e);

    return NextResponse.json({
      status: "error",
      message: e?.message || "Database connection failed",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
