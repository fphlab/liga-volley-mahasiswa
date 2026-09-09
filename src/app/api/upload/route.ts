import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { deleteStorageFile, extractFilenameFromUrl, BUCKET_NAME } from '@/lib/storageService';
import { verifyAdminKey } from '@/lib/auth';

function generateDeleteToken(filename: string): string {
  const secret = process.env.ADMIN_SECRET_KEY || 'lvm2026_upload_secret';
  return crypto.createHmac('sha256', secret).update(filename).digest('hex');
}

function verifyDeleteToken(filename: string, token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const expected = generateDeleteToken(filename);
    const bufA = Buffer.from(token, 'hex');
    const bufB = Buffer.from(expected, 'hex');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// NFR-05: hanya JPG/PNG/WebP, maksimal 5MB.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const FORMAT_EXTENSIONS: Record<'jpeg' | 'png' | 'webp', string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

/**
 * Verifikasi magic bytes agar isi file benar-benar gambar yang diizinkan,
 * bukan sekadar mengandalkan MIME type / ekstensi yang mudah dipalsukan.
 */
function detectImageFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Rate limiting: maks 15 upload per menit per IP untuk mencegah bot/spam
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, { limit: 15, windowMs: 60 * 1000 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak permintaan upload. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
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

  try {
    const formData = await request.formData();
    const file = formData.get('file');


    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const allowedExtension = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!allowedExtension) {
      return NextResponse.json(
        { success: false, error: 'Format foto tidak didukung. Hanya file JPG, PNG, atau WebP yang diperbolehkan.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Ukuran foto terlalu besar. Maksimal 5MB.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ success: false, error: 'File foto kosong.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedFormat = detectImageFormat(buffer);
    // Tipe yang diklaim harus sesuai isi file sungguhan (anti file menyamar).
    if (!detectedFormat || FORMAT_EXTENSIONS[detectedFormat] !== allowedExtension) {
      return NextResponse.json(
        { success: false, error: 'Isi file bukan gambar JPG, PNG, atau WebP yang valid.' },
        { status: 400 }
      );
    }

    // Ekstensi diturunkan dari tipe yang sudah tervalidasi, bukan dari nama file.
    const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${allowedExtension}`;

    // 1. Simpan ke Supabase Storage jika konfigurasi Supabase aktif
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();

      let uploadResult = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

      // Bila bucket belum ada, buat otomatis lalu coba unggah ulang
      if (uploadResult.error && uploadResult.error.message.toLowerCase().includes('bucket not found')) {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE_BYTES,
          allowedMimeTypes: Array.from(ALLOWED_IMAGE_TYPES.keys()),
        });

        uploadResult = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: true,
          });
      }

      if (uploadResult.error) {
        console.error('Error uploading to Supabase Storage:', uploadResult.error);
        return NextResponse.json(
          { success: false, error: `Gagal mengunggah foto ke Supabase Storage: ${uploadResult.error.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);

      return NextResponse.json({
        success: true,
        photoUrl: publicUrlData.publicUrl,
        deleteToken: generateDeleteToken(filename),
      });
    }

    // 2. Fallback: penyimpanan lokal jika Supabase belum dikonfigurasi (development offline)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const photoUrl = `/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      photoUrl,
      deleteToken: generateDeleteToken(filename),
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengunggah foto' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint DELETE untuk membersihkan file foto dari storage.
 * Dilindungi: hanya dapat dihapus jika membawa deleteToken valid (dari sesi upload pengguna)
 * atau dipanggil oleh Panitia (Admin Key). Mencegah Storage IDOR.
 */
export async function DELETE(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`del:${clientIp}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan penghapusan foto. Coba lagi sebentar.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const photoUrl = request.nextUrl.searchParams.get('url') || body?.photoUrl;
    const deleteToken =
      request.headers.get('x-delete-token') ||
      request.nextUrl.searchParams.get('token') ||
      body?.deleteToken;

    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parameter photoUrl diperlukan' },
        { status: 400 }
      );
    }

    const filename = extractFilenameFromUrl(photoUrl);
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'URL foto tidak valid' },
        { status: 400 }
      );
    }

    // Otorisasi: Harus Panitia ATAU pemegang token delete yang sah dari sesi upload pengguna
    const isAdmin = verifyAdminKey(request);
    const isTokenValid = deleteToken && verifyDeleteToken(filename, deleteToken);

    if (!isAdmin && !isTokenValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak: Penghapusan foto memerlukan otorisasi Panitia atau Token Upload yang sah.',
        },
        { status: 403 }
      );
    }

    const deleted = await deleteStorageFile(photoUrl);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus foto dari storage' },
      { status: 500 }
    );
  }
}

