import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint verifikasi instan untuk PIN Panitia.
 * Digunakan oleh frontend untuk memvalidasi PIN sebelum membuka mode edit panitia.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pin = body?.pin || request.headers.get('x-admin-key');
    const adminSecret = process.env.ADMIN_SECRET_KEY || 'lvm2026_admin_secret_passcode';

    if (!pin || typeof pin !== 'string' || pin.trim() === '') {
      return NextResponse.json(
        { success: false, valid: false, error: 'PIN Panitia wajib diisi' },
        { status: 400 }
      );
    }

    if (pin.trim() !== adminSecret) {
      return NextResponse.json(
        { success: false, valid: false, error: 'PIN Panitia salah. Akses ditolak.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, valid: true });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Terjadi kesalahan saat memverifikasi PIN' },
      { status: 500 }
    );
  }
}
