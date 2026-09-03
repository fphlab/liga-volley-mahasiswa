import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_PRODUCTION_MODE === 'true';

  // In non-production, allow normal access
  if (!isProduction) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Root path is allowed (renders the production holding display)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // In production, block API requests completely
  if (pathname.startsWith('/api')) {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  // In production, redirect all other page requests (/register, /reports, /teams, etc.) back to /
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
