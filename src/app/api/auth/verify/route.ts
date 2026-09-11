import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessCode } from '@/lib/accessCodes';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`verify:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: `Terlalu banyak percobaan verifikasi. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code : typeof body?.pin === 'string' ? body.pin : '';

  let actor;
  try {
    actor = await resolveAccessCode(code);
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json(
      { success: false, valid: false, error: 'Layanan autentikasi sedang tidak tersedia. Coba lagi nanti.' },
      { status: 500 }
    );
  }
  if (!actor) {
    return NextResponse.json(
      { success: false, valid: false, error: 'Kode Akses tidak terdaftar.' },
      { status: 401 }
    );
  }

  const token = createSessionToken(actor);
  const response = NextResponse.json({
    success: true,
    valid: true,
    role: actor.role,
    subject: actor.subject,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}