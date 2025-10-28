import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { SavedPlan } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { planId } = body || {};

    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_plan_id" }, { status: 400 });
    }

    const db = await getDb();

    // Verify the plan belongs to the user
    const plan = await db.collection<SavedPlan>("savedPlans").findOne({
      id: planId,
      userEmail: email
    });

    if (!plan) {
      return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 404 });
    }

    // Generate a unique share ID
    const shareId = crypto.randomUUID();

    // Store the share info in database
    await db.collection("sharedPlans").insertOne({
      shareId,
      planId,
      originalUserEmail: email,
      planData: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        destinations: plan.destinations,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      accessCount: 0
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${shareId}`;

    return NextResponse.json({ ok: true, shareId, shareUrl });
  } catch (error) {
    console.error("POST /api/share error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
