import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Klien Supabase untuk sisi SERVER (API routes Next.js).
 *
 * Memakai SERVICE ROLE KEY yang melewati RLS — karena itu variabel ini
 * WAJIB tetap rahasia: tanpa prefix NEXT_PUBLIC_ dan hanya dipakai di
 * dalam folder src/app/api/**. Jangan pernah mengimpor modul ini dari
 * Client Component.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Ambil klien admin (singleton per proses). Melempar error berbahasa
 * Indonesia yang jelas bila .env.local belum dikonfigurasi.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ' +
      'pada file .env.local (lihat .env.example dan README bagian "Setup Supabase").'
    );
  }

  cachedClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      // Server-side: tidak ada sesi browser yang perlu dipersistenkan.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
