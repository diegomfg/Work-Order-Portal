import { NextRequest, NextResponse } from 'next/server';
import { upsertWorkOrders, setLastUpdated, logUpload } from '@/lib/db';
import type { WorkOrder as DbWorkOrder } from '@/lib/db';

// Camelcase shape coming from the parser / upload UI
type CamelWorkOrder = {
  id: string;
  customerId: string;
  customer: string;
  tag?: string | null;
  tech?: string | null;
  inDate: string;
  startDate?: string | null;
  complDate?: string | null;
  outDate?: string | null;
  mfr: string;
  model: string;
  desc: string;
  serial?: string | null;
  type: 'lawn' | '2cycle' | 'other';
  status: 'completed' | 'warranty' | 'nwf' | 'review' | 'inprogress';
  comments?: string | null;
};

function toDbFormat(wo: CamelWorkOrder): Omit<DbWorkOrder, 'created_at' | 'updated_at'> {
  return {
    id: parseInt(wo.id, 10),
    customer_id: parseInt(wo.customerId, 10),
    customer: wo.customer,
    tag: wo.tag || null,
    tech: wo.tech || null,
    in_date: wo.inDate,
    start_date: wo.startDate || null,
    compl_date: wo.complDate || null,
    out_date: wo.outDate || null,
    mfr: wo.mfr,
    model: wo.model,
    description: wo.desc,
    serial: wo.serial || null,
    type: wo.type,
    status: wo.status,
    comments: wo.comments || null,
  };
}

interface PublishRequest {
  workorders: CamelWorkOrder[];
  filename?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();

    if (!body.workorders || !Array.isArray(body.workorders)) {
      return NextResponse.json({ error: 'workorders array is required' }, { status: 400 });
    }

    if (body.workorders.length === 0) {
      return NextResponse.json({ error: 'workorders array cannot be empty' }, { status: 400 });
    }

    const dbWorkOrders = body.workorders.map(toDbFormat);
    const { inserted, updated } = upsertWorkOrders(dbWorkOrders);

    const now = new Date().toISOString();
    setLastUpdated(now);
    logUpload(body.filename || 'manual-upload', body.workorders.length, inserted, updated);

    return NextResponse.json({ success: true, inserted, updated, total: body.workorders.length, lastUpdated: now });
  } catch (error) {
    console.error('Error publishing work orders:', error);
    return NextResponse.json({ error: 'Failed to publish work orders' }, { status: 500 });
  }
}
