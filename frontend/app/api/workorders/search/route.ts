import { NextRequest, NextResponse } from 'next/server';
import { searchWorkOrders } from '@/lib/db';

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

    // Search by WO ID, customer ID, or serial number
    // Note: tech field is excluded from results (customer-facing endpoint)
    const workorders = searchWorkOrders(query.trim());

    return NextResponse.json({ workorders });
  } catch (error) {
    console.error('Error searching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to search work orders' },
      { status: 500 }
    );
  }
}
