import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;

    if (!shareId) {
      return NextResponse.json({ ok: false, error: "missing_share_id" }, { status: 400 });
    }

    const db = await getDb();

    // Find the shared plan
    const sharedPlan = await db.collection("sharedPlans").findOne({
      shareId,
      expiresAt: { $gt: Date.now() }
    });

    if (!sharedPlan) {
      return NextResponse.json({ ok: false, error: "share_not_found_or_expired" }, { status: 404 });
    }

    // Increment access count
    await db.collection("sharedPlans").updateOne(
      { shareId },
      { $inc: { accessCount: 1 } }
    );

    return NextResponse.json({
      ok: true,
      plan: sharedPlan.planData,
      originalUserEmail: sharedPlan.originalUserEmail,
      createdAt: sharedPlan.createdAt
    });
  } catch (error) {
    console.error("GET /api/share/[shareId] error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const email = session?.user?.email as string | undefined;

    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { shareId } = params;

    if (!shareId) {
      return NextResponse.json({ ok: false, error: "missing_share_id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    if (action !== "add_to_my_plans") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const db = await getDb();

    // Find the shared plan
    const sharedPlan = await db.collection("sharedPlans").findOne({
      shareId,
      expiresAt: { $gt: Date.now() }
    });

    if (!sharedPlan) {
      return NextResponse.json({ ok: false, error: "share_not_found_or_expired" }, { status: 404 });
    }

    const planData = sharedPlan.planData;

    // Check if user already has this plan
    const existingPlan = await db.collection("savedPlans").findOne({
      userEmail: email,
      name: planData.name,
      description: planData.description,
      destinations: { $all: planData.destinations }
    });

    if (existingPlan) {
      return NextResponse.json({ ok: false, error: "plan_already_exists" }, { status: 409 });
    }

    // Add plan to user's saved plans
    const now = Date.now();
    const newPlan = {
      ...planData,
      id: crypto.randomUUID(),
      userEmail: email,
      createdAt: now,
      updatedAt: now
    };

    await db.collection("savedPlans").insertOne(newPlan);

    return NextResponse.json({
      ok: true,
      plan: newPlan,
      message: "Plan added to your saved plans successfully"
    });
  } catch (error) {
    console.error("POST /api/share/[shareId] error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
