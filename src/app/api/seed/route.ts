import { NextRequest, NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/seed';
import { verifyAdminKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 1. Blokir sepenuhnya di environment production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Endpoint seeder dinonaktifkan secara permanen di mode produksi.' },
      { status: 403 }
    );
  }

  // 2. Wajibkan Secret Key / PIN Panitia bahkan di mode development
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: PIN / Secret Key Panitia diperlukan untuk menjalankan seeder.' },
      { status: 401 }
    );
  }

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
