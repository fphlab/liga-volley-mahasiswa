import { NextRequest, NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/seed';
import { AuthError, requireActor } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 1. Blokir sepenuhnya di environment production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Endpoint seeder dinonaktifkan secara permanen di mode produksi.' },
      { status: 403 }
    );
  }

  try {
    // 2. Hanya peran panpel yang boleh menjalankan seeder, bahkan di development
    requireActor(request, ['panpel']);

    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    const result = await seedInitialData(force);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menjalankan seeder data' },
      { status: 500 }
    );
  }
}
