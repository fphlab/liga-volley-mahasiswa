import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const envConfig = process.env.NEXT_PUBLIC_PRODUCTION_MODE;
  // If explicitly set, respect the setting ('true' or 'false').
  // Only fallback to checking NODE_ENV if NEXT_PUBLIC_PRODUCTION_MODE is undefined or empty.
  const isHolding =
    envConfig !== undefined && envConfig !== ''
      ? envConfig === 'true'
      : process.env.NODE_ENV === 'production';

  // In non-production or when holding mode is disabled, allow normal access
  if (!isHolding) {
    return NextResponse.next();
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
