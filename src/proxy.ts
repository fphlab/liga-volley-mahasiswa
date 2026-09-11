import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/verify',
  // Bootstrap satu tembakan: harus bisa dipanggil SEBELUM ada akun apapun
  // (proteksi berlapis di route: BOOTSTRAP_SECRET + rate-limit + guard kosong).
  '/api/admin/bootstrap',
]);

function isPublicPage(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/') || pathname === '/production' || pathname.startsWith('/production/');
}

export function proxy(request: NextRequest) {
  const envConfig = process.env.NEXT_PUBLIC_PRODUCTION_MODE;
  // If explicitly set, respect the setting ('true' or 'false').
  // Only fallback to checking NODE_ENV if NEXT_PUBLIC_PRODUCTION_MODE is undefined or empty.
  const isHolding =
    envConfig !== undefined && envConfig !== ''
      ? envConfig === 'true'
      : process.env.NODE_ENV === 'production';

  // In non-production or when holding mode is disabled, enforce the session gate
  if (!isHolding) {
    const actor = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (actor) {
      return NextResponse.next();
    }
    const { pathname } = request.nextUrl;
    if (pathname.startsWith('/api/') || pathname === '/api') {
      if (PUBLIC_API_PATHS.has(pathname)) {
        return NextResponse.next();
      }
      return NextResponse.json(
        { success: false, error: 'Autentikasi diperlukan.' },
        { status: 401 }
      );
    }
    if (isPublicPage(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL('/login?from=' + encodeURIComponent(pathname), request.url)
    );
  }

  // Allow access if user has bypassed the holding display
  const bypassCookie = request.cookies.get('lvm_portal_bypass');
  if (bypassCookie?.value === '1') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Root path is allowed (renders the production holding display)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // In production holding mode, block API requests completely
  if (pathname.startsWith('/api')) {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  // In production holding mode, redirect all other page requests (/register, /reports, /teams, etc.) back to /
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
