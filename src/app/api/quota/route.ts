import { NextRequest, NextResponse } from 'next/server';
import { getQuotaStats } from '@/lib/db';
import { AuthError, requireActor } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    requireActor(request);

    const quota = await getQuotaStats();
    return NextResponse.json({ success: true, quota });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error fetching quota:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Gagal mengambil data kuota',
      },
      { status: 500 }
    );
  }
}
