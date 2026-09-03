import { NextResponse } from 'next/server';
import { getQuotaStats } from '@/lib/db';

export async function GET() {
  try {
    const quota = await getQuotaStats();
    return NextResponse.json({ success: true, quota });
  } catch (error) {
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
