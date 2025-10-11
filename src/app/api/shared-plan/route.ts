import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { SharedPlan } from '@/lib/types';

// GET /api/shared-plan - List all shared plans
export async function GET() {
  try {
    const db = await getDb();

    // Fetch all shared plans from MongoDB
    const plans = await db.collection<SharedPlan>('sharedPlans')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching shared plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

// POST /api/shared-plan - Create a new shared plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description = "", destinations, sharedBy } = body;

    // Validate required fields
    if (!name || !Array.isArray(destinations)) {
      return NextResponse.json(
        { error: 'Name and destinations are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Create new shared plan
    const newPlan: SharedPlan = {
      id: crypto.randomUUID(),
      name,
      description,
      destinations,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sharedBy: sharedBy || 'Anonymous User'
    };

    // Insert into database
    await db.collection<SharedPlan>('sharedPlans').insertOne(newPlan);

    return NextResponse.json({ plan: newPlan }, { status: 201 });
  } catch (error) {
    console.error('Error creating shared plan:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}
