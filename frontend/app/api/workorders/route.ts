import { NextRequest, NextResponse } from 'next/server';
import { getAllWorkOrders, getStatusCounts, getTotalCount } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const workorders = getAllWorkOrders({ status, type });

    if (includeStats) {
      const statusCounts = getStatusCounts();
      const total = getTotalCount();
      return NextResponse.json({
        workorders,
        stats: {
          total,
          ...statusCounts,
        },
      });
    }

    return NextResponse.json({ workorders });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}
