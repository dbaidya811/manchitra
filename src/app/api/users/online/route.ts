import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();

    // Get users who have been active recently (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const users = await db
      .collection("users")
      .find(
        {
          $or: [
            { updatedAt: { $gte: twentyFourHoursAgo } },
            { createdAt: { $gte: twentyFourHoursAgo } }
          ]
        },
        {
          projection: {
            _id: 0,
            email: 1,
            name: 1,
            image: 1,
            updatedAt: 1,
            createdAt: 1
          }
        }
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(40)
      .toArray();

    // Filter out users without proper data
    const validUsers = users.filter(user =>
      user.email &&
      user.name &&
      user.email.includes('@') // Basic email validation
    );

    console.log(`Online users API: Found ${validUsers.length} valid active users`);

    return NextResponse.json({
      ok: true,
      users: validUsers,
      count: validUsers.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("online-users fetch failed", error);
    return NextResponse.json({
      ok: false,
      error: "failed_to_fetch",
      users: [],
      count: 0
    }, { status: 500 });
  }
}
