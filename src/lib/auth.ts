import { NextRequest } from 'next/server';

/**
 * Validasi otentikasi Panitia / Admin menggunakan Secret Key (PIN / API Key).
 * Mendukung pembacaan dari header 'x-admin-key' atau cookie 'lvm_admin_key'.
 */
export function verifyAdminKey(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY || 'lvm2026_admin_secret_passcode';
  
  // 1. Cek header HTTP 'x-admin-key'
  const headerKey = request.headers.get('x-admin-key');
  if (headerKey && headerKey === adminSecret) {
    return true;
  }

  // 2. Cek cookie fallback 'lvm_admin_key'
  const cookieKey = request.cookies.get('lvm_admin_key')?.value;
  if (cookieKey && cookieKey === adminSecret) {
    return true;
  }

  return false;
}
