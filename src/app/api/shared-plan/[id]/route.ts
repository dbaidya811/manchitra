import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;

    // In a real app, this would fetch from your database
    // For now, we'll get it from localStorage (server-side simulation)
    if (typeof window === 'undefined') {
      // This is a server-side route, localStorage won't work here
      // In a real app, you'd query your database
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // For demo purposes, return a mock plan
    // In production, this would be:
    // const plan = await db.plans.findUnique({ where: { id: planId } });
    const mockPlan = {
      id: planId,
      name: "Sample Travel Plan",
      description: "A sample travel plan shared with you",
      destinations: ["Dhaka", "Chittagong", "Sylhet"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sharedBy: "Demo User"
    };

    return NextResponse.json({ plan: mockPlan });
  } catch (error) {
    console.error('Error fetching shared plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}
