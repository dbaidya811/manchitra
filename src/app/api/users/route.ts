import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { _id: 0, name: 1, email: 1, image: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ createdAt: -1, email: 1 })
      .toArray();

    return NextResponse.json({ ok: true, users });
  } catch (error: any) {
    console.error("GET /api/users error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Server error" }, { status: 500 });
  }
}
