import { NextRequest, NextResponse } from 'next/server';
import { upsertWorkOrders, setLastUpdated, logUpload, WorkOrder } from '@/lib/db';

type WorkOrderInput = Omit<WorkOrder, 'created_at' | 'updated_at'>;

interface PublishRequest {
  workorders: WorkOrderInput[];
  filename?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();

    if (!body.workorders || !Array.isArray(body.workorders)) {
      return NextResponse.json(
        { error: 'workorders array is required' },
        { status: 400 }
      );
    }

    if (body.workorders.length === 0) {
      return NextResponse.json(
        { error: 'workorders array cannot be empty' },
        { status: 400 }
      );
    }

    // Validate each work order has required fields
    for (const wo of body.workorders) {
      if (!wo.id || !wo.customer_id || !wo.customer || !wo.in_date || !wo.mfr || !wo.model || !wo.description || !wo.type || !wo.status) {
        return NextResponse.json(
          { error: 'Each work order must have: id, customer_id, customer, in_date, mfr, model, description, type, status' },
          { status: 400 }
        );
      }
    }

    // Upsert work orders
    const { inserted, updated } = upsertWorkOrders(body.workorders);

    // Update last_updated timestamp
    const now = new Date().toISOString();
    setLastUpdated(now);

    // Log the upload
    const filename = body.filename || 'manual-upload';
    logUpload(filename, body.workorders.length, inserted, updated);

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      total: body.workorders.length,
      lastUpdated: now,
    });
  } catch (error) {
    console.error('Error publishing work orders:', error);
    return NextResponse.json(
      { error: 'Failed to publish work orders' },
      { status: 500 }
    );
  }
}
