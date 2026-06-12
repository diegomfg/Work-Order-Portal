import { NextRequest, NextResponse } from 'next/server';
import { updateWorkOrder } from '@/lib/db';

const VALID_STATUSES = ['completed', 'warranty', 'nwf', 'review', 'inprogress'];
const ALLOWED_FIELDS = ['status', 'customer', 'customer_id', 'mfr', 'description', 'tag', 'tech', 'comments'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const woId = parseInt(id, 10);
    if (isNaN(woId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status as string)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    if (updates.customer_id !== undefined) {
      const cid = parseInt(String(updates.customer_id), 10);
      if (isNaN(cid) || cid <= 0) {
        return NextResponse.json({ error: 'Invalid customer_id' }, { status: 400 });
      }
      updates.customer_id = cid;
    }

    updateWorkOrder(woId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}
