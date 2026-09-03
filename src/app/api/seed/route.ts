import { NextRequest, NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/seed';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    const result = await seedInitialData(force);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menjalankan seeder data' },
      { status: 500 }
    );
  }
}
