import { NextRequest, NextResponse } from 'next/server';
import { getRecentUploads } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const uploads = getRecentUploads(Math.min(limit, 100));

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload history' },
      { status: 500 }
    );
  }
}
