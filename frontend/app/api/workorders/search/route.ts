import { NextRequest, NextResponse } from 'next/server';
import { searchWorkOrders, WorkOrder as DbWorkOrder } from '@/lib/db';

function toCamelFormat(wo: Omit<DbWorkOrder, 'tech'>) {
  return {
    id: String(wo.id),
    customerId: String(wo.customer_id),
    customer: wo.customer,
    tag: wo.tag ?? '',
    inDate: wo.in_date,
    startDate: wo.start_date ?? null,
    complDate: wo.compl_date ?? null,
    outDate: wo.out_date ?? null,
    mfr: wo.mfr,
    model: wo.model,
    desc: wo.description,
    serial: wo.serial ?? '',
    type: wo.type,
    status: wo.status,
    comments: wo.comments ?? '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const rows = searchWorkOrders(query.trim());
    const workorders = rows.map(toCamelFormat);

    return NextResponse.json({ workorders });
  } catch (error) {
    console.error('Error searching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to search work orders' },
      { status: 500 }
    );
  }
}
