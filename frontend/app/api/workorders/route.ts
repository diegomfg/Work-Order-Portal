import { NextRequest, NextResponse } from 'next/server';
import { getAllWorkOrders, getWorkOrdersPaginated, getStatusCounts, getTotalCount } from '@/lib/db';

const VALID_LIMITS = [10, 20, 50];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (pageParam !== null || limitParam !== null) {
      const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
      const limit = VALID_LIMITS.includes(parseInt(limitParam ?? '20', 10))
        ? parseInt(limitParam ?? '20', 10)
        : 20;
      const { workorders, total } = getWorkOrdersPaginated(page, limit, { status, type });
      return NextResponse.json({
        workorders,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    const workorders = getAllWorkOrders({ status, type });

    if (includeStats) {
      const statusCounts = getStatusCounts();
      const total = getTotalCount();
      return NextResponse.json({
        workorders,
        stats: { total, ...statusCounts },
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
