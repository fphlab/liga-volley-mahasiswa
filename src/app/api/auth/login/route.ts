import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessCode } from '@/lib/accessCodes';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`login:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetTime),
        },
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code : '';

  const actor = resolveAccessCode(code);
  if (!actor) {
    return NextResponse.json(
      { success: false, error: 'Kode Akses tidak terdaftar.' },
      { status: 401 }
    );
  }

  const token = createSessionToken(actor);
  const response = NextResponse.json({
    success: true,
    role: actor.role,
    subject: actor.subject,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
