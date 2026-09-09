/**
 * Script Pemeliharaan: Pembersihan File Foto Yatim (Orphaned Photos)
 *
 * Menemukan dan menghapus file foto di Supabase Storage (dan public/uploads lokal)
 * yang tidak lagi direferensikan oleh personel manapun di tabel `members`.
 *
 * Pemakaian (dari root proyek):
 *   node --env-file=.env.local scripts/cleanup-orphaned-photos.mjs           # Mode simulasi (dry-run)
 *   node --env-file=.env.local scripts/cleanup-orphaned-photos.mjs --delete  # Hapus file secara permanen
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SHOULD_DELETE = process.argv.includes('--delete');
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'player-photos';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function extractFilename(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/');
      return parts[parts.length - 1] || null;
    }
    if (url.startsWith('/uploads/')) {
      return url.replace('/uploads/', '').trim() || null;
    }
    return path.basename(url) || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== PEMERIKSAAN FILE FOTO YATIM (ORPHANED PHOTOS) ===');
  console.log(`Mode: ${SHOULD_DELETE ? 'EKSEKUSI HAPUS (--delete)' : 'SIMULASI (dry-run, tambahkan --delete untuk menghapus)'}\n`);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log('Supabase tidak dikonfigurasi. Memeriksa folder lokal public/uploads...');
    checkLocalOnly();
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Ambil seluruh photo_url aktif dari tabel members
  console.log('1. Mengambil referensi foto aktif dari database Supabase...');
  const { data: members, error: memberError } = await supabase
    .from('members')
    .select('id, full_name, photo_url')
    .neq('photo_url', '');

  if (memberError) {
    console.error('Gagal membaca tabel members:', memberError.message);
    process.exit(1);
  }

  const referencedFilenames = new Set();
  (members || []).forEach(m => {
    const filename = extractFilename(m.photo_url);
    if (filename) referencedFilenames.add(filename);
  });

  console.log(`Ditemukan ${members?.length || 0} personel dengan foto terdaftar di database.`);

  // 2. Ambil daftar file di Supabase Storage bucket
  console.log(`\n2. Memeriksa isi bucket "${BUCKET_NAME}"...`);
  const { data: files, error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1000 });

  if (storageError) {
    console.error(`Gagal membaca bucket "${BUCKET_NAME}":`, storageError.message);
    process.exit(1);
  }

  const orphanedFiles = (files || []).filter(f => !referencedFilenames.has(f.name) && f.name !== '.emptyFolderPlaceholder');

  console.log(`Total file di storage: ${files?.length || 0}`);
  console.log(`File terpakai: ${files?.length - orphanedFiles.length}`);
  console.log(`File yatim (tidak terhubung ke personel): ${orphanedFiles.length}`);

  if (orphanedFiles.length > 0) {
    console.log('\nDaftar file yatim di Supabase Storage:');
    orphanedFiles.forEach(f => console.log(` - ${f.name} (${f.metadata?.size || 'unknown'} bytes)`));

    if (SHOULD_DELETE) {
      console.log('\nMenghapus file yatim...');
      const fileNamesToDelete = orphanedFiles.map(f => f.name);
      const { error: delError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(fileNamesToDelete);

      if (delError) {
        console.error('Gagal menghapus file dari bucket:', delError.message);
      } else {
        console.log(`Berhasil menghapus ${fileNamesToDelete.length} file yatim dari Supabase Storage!`);
      }
    } else {
      console.log('\nJalankan dengan flag --delete untuk menghapus file-file di atas.');
    }
  } else {
    console.log('Semua file di Supabase Storage valid dan terhubung ke data personel.');
  }

  console.log('\n=== SELESAI ===');
}

function checkLocalOnly() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Direktori public/uploads tidak ditemukan.');
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  console.log(`Ditemukan ${files.length} file di public/uploads.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
