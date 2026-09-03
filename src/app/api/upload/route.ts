import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Ekstensi diturunkan dari tipe yang sudah tervalidasi, bukan dari nama file.
    const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${allowedExtension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const photoUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, photoUrl });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengunggah foto' },
      { status: 500 }
    );
  }
}
