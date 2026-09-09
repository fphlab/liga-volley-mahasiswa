import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabaseServer';

export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'player-photos';

/**
 * Mengekstrak nama file dari URL foto (baik URL publik Supabase maupun URL relatif lokal /uploads/...).
 */
export function extractFilenameFromUrl(photoUrl: string): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;

  try {
    // 1. Supabase Storage URL (e.g. https://.../storage/v1/object/public/player-photos/photo_xxx.jpg)
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      const parsed = new URL(photoUrl);
      const parts = parsed.pathname.split('/');
      const filename = parts[parts.length - 1];
      return filename ? decodeURIComponent(filename) : null;
    }

    // 2. Relatif lokal (e.g. /uploads/photo_xxx.jpg)
    if (photoUrl.startsWith('/uploads/')) {
      const raw = photoUrl.replace('/uploads/', '').trim();
      return path.basename(raw) || null;
    }

    // 3. Fallback jika hanya nama file biasa
    return path.basename(photoUrl) || null;
  } catch {
    return null;
  }
}

/**
 * Menghapus satu file dari storage (Supabase Storage atau direktori lokal public/uploads).
 */
export async function deleteStorageFile(photoUrl: string): Promise<boolean> {
  if (!photoUrl || typeof photoUrl !== 'string') return false;

  const rawFilename = extractFilenameFromUrl(photoUrl);
  if (!rawFilename) return false;
  const filename = path.basename(rawFilename);

  try {
    // Jika format Supabase Storage URL dan Supabase aktif
    if (isSupabaseConfigured() && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([filename]);
      if (error) {
        console.warn(`[StorageService] Gagal menghapus file ${filename} dari Supabase:`, error.message);
        return false;
      }
      return true;
    }

    // Fallback: hapus file lokal jika ada dengan validasi boundary path (anti path-traversal)
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const localPath = path.resolve(uploadsDir, filename);
    if (localPath.startsWith(uploadsDir) && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return true;
    }
  } catch (err) {
    console.warn(`[StorageService] Error saat menghapus file ${photoUrl}:`, err);
  }

  return false;
}

/**
 * Menghapus beberapa file foto sekaligus.
 */
export async function deleteStorageFiles(photoUrls: (string | undefined | null)[]): Promise<void> {
  const validUrls = photoUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  if (validUrls.length === 0) return;

  const supabaseFiles: string[] = [];
  const localFiles: string[] = [];

  for (const url of validUrls) {
    const filename = extractFilenameFromUrl(url);
    if (!filename) continue;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      supabaseFiles.push(filename);
    } else if (url.startsWith('/uploads/')) {
      localFiles.push(filename);
    }
  }

  // Hapus dari Supabase Storage jika ada
  if (isSupabaseConfigured() && supabaseFiles.length > 0) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(BUCKET_NAME).remove(supabaseFiles);
      if (error) {
        console.warn('[StorageService] Gagal menghapus batch file dari Supabase:', error.message);
      }
    } catch (err) {
      console.warn('[StorageService] Error batch delete Supabase:', err);
    }
  }

  // Hapus dari filesystem lokal jika ada (dengan anti path-traversal)
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  for (const rawFilename of localFiles) {
    try {
      const filename = path.basename(rawFilename);
      const localPath = path.resolve(uploadsDir, filename);
      if (localPath.startsWith(uploadsDir) && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (err) {
      console.warn(`[StorageService] Gagal menghapus file lokal ${rawFilename}:`, err);
    }
  }
}
