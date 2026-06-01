import { NextResponse } from 'next/server';
import { getLastUpdated } from '@/lib/db';

export async function GET() {
  try {
    const lastUpdated = getLastUpdated();
    return NextResponse.json({ lastUpdated });
  } catch (error) {
    console.error('Error fetching meta:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
