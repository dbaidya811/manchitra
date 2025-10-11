import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { SavedPlan } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) {
      return NextResponse.json({ ok: true, plans: [] });
    }

    const db = await getDb();
    const plans = await db
      .collection<SavedPlan>("savedPlans")
      .find({ userEmail: email })
      .project({ _id: 0 })
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ ok: true, plans });
  } catch (error) {
    console.error("GET /api/saved-plans error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, name, description = "", destinations } = body || {};

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
    }
    if (!Array.isArray(destinations) || destinations.some((d) => typeof d !== "string" || !d.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_destinations" }, { status: 400 });
    }

    const db = await getDb();
    const now = Date.now();
    const plan: SavedPlan = {
      id: typeof id === "string" && id ? id : crypto.randomUUID(),
      userEmail: email,
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      destinations: destinations.map((d: string) => d.trim()),
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<SavedPlan>("savedPlans").updateOne(
      { id: plan.id, userEmail: email },
      {
        $set: {
          name: plan.name,
          description: plan.description,
          destinations: plan.destinations,
          updatedAt: plan.updatedAt,
        },
        $setOnInsert: {
          createdAt: plan.createdAt,
          id: plan.id,
          userEmail: email,
        },
      },
      { upsert: true }
    );

    const saved = await db
      .collection<SavedPlan>("savedPlans")
      .findOne({ id: plan.id, userEmail: email }, { projection: { _id: 0 } });

    return NextResponse.json({ ok: true, plan: saved ?? plan }, { status: 201 });
  } catch (error) {
    console.error("POST /api/saved-plans error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection<SavedPlan>("savedPlans").deleteOne({ id, userEmail: email });

    if (!result.deletedCount) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/saved-plans error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
