import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { _id: 0, email: 1, name: 1, image: 1, updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(40)
      .toArray();

    return NextResponse.json({ ok: true, users });
  } catch (error) {
    console.error("online-users fetch failed", error);
    return NextResponse.json({ ok: false, error: "failed_to_fetch" }, { status: 500 });
  }
}
