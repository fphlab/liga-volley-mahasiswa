# LIGA VOLLEY MAHASISWA (LVM)

Sistem Informasi pendaftaran peserta & pelaporan **Liga Volley Mahasiswa Nasional** — 3 Regional (Barat, Tengah, Timur), kuota 36 tim (18 Putra + 18 Putri), roster terkunci 20 personel per tim (15 pemain + 5 official).

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Database ganda via konfigurasi**: PostgreSQL lokal (`pg`) untuk development, atau **Supabase** (PostgREST) untuk produksi — skema & kode identik, cukup ganti `.env.local`
- Tailwind CSS v4, next-themes, lucide-react, canvas-confetti
- exceljs untuk ekspor laporan Excel (.xlsx)

## Setup Database

Skema yang sama dipakai kedua backend: jalankan isi [`supabase/schema.sql`](supabase/schema.sql) sekali di database tujuan.

Skema ini membuat:

| Objek | Fungsi |
|---|---|
| Tabel `teams` | Identitas tim + status (`Draft`/`Lengkap`/`Terverifikasi`), `team_number` unik |
| Tabel `members` | 20 personel per tim (FK `ON DELETE CASCADE`, slot unik per tim) |
| Unique index parsial | Anti nomor jersey ganda antar pemain dalam satu tim |
| Trigger `enforce_team_quota` | Kuota maks 6 tim per regional × kategori — ditegakkan di level DB |
| Trigger `touch_updated_at` | Kolom `updated_at` otomatis |

### Opsi A — PostgreSQL lokal (development)

```bash
# buat database lalu terapkan skema
psql -U postgres -c "CREATE DATABASE liga_volley_mahasiswa"
psql -U postgres -d liga_volley_mahasiswa -f supabase/schema.sql
```

Isi `.env.local`:

```
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/liga_volley_mahasiswa
```

### Opsi B — Supabase cloud

1. Buat proyek di [supabase.com](https://supabase.com)
2. **SQL Editor** → jalankan `supabase/schema.sql`
3. Salin dari *Project Settings → API*, isi `.env.local`:

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` = akses penuh melewati RLS. Hanya dipakai di server (API routes). Jangan pernah diberi prefix `NEXT_PUBLIC_`.

Backend dipilih otomatis: bila `SUPABASE_URL` + key terisi → Supabase; selain itu `DATABASE_URL`/`PG*` → Postgres langsung; jika keduanya kosong, API memberi pesan petunjuk konfigurasi.

### Migrasi data JSON lama (opsional, ke Supabase)

```bash
node --env-file=.env.local scripts/migrate-json-to-supabase.mjs          # tolak bila tabel sudah berisi
node --env-file=.env.local scripts/migrate-json-to-supabase.mjs --force # kosongkan lalu impor ulang
```

Untuk database lokal, cukup klik tombol **"Data Demo"** di navbar aplikasi (mengisi 6 tim simulasi langsung lewat API).

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Fitur

- **Pendaftaran tim** dengan validasi kuota regional real-time dan penomoran otomatis `LVM-BRT/TGH/TMR-PA/PI-NN` (anti duplikat: mengisi celah nomor terendah yang bebas)
- **Formulir 20 personel** per tim: NIM, fakultas/jurusan, posisi bermain, tinggi/berat, nomor jersey unik (divalidasi ganda: aplikasi + unique index DB), upload foto jersey (JPG/PNG/WebP maks 5MB, divalidasi magic bytes)
- **Verifikasi panitia**: roster 20/20 dapat diverifikasi; setiap edit pasca-verifikasi menurunkan status kembali
- **Modul laporan**: Report 1 Roster Fisik, Report 2 Verifikasi Akademik, Report 3 Rekap Tim, Galeri ID Card — ekspor Excel & cetak PDF (A4 + blok tanda tangan)
- Dark/light mode, responsif mobile–desktop

## Struktur

```
supabase/schema.sql                  # Skema + trigger + index (berlaku utk lokal & Supabase)
src/lib/backend.ts                   # Kontrak backend + pemilihan via env
src/lib/backends/pgBackend.ts        # Adapter PostgreSQL langsung (lokal)
src/lib/backends/supabaseBackend.ts  # Adapter Supabase/PostgREST (cloud)
src/lib/supabaseServer.ts            # Klien admin service-role (server-only)
src/lib/db.ts                        # Orkestrasi bisnis: kuota, nomor tim, status roster
src/lib/demoData.ts / seed.ts        # Generator & seeder data demo
scripts/migrate-json-to-supabase.mjs # Impor data JSON lama -> Supabase
src/app/api/**                       # REST endpoints (teams, members, quota, seed, upload)
data/volleyball_data.json            # Sumber data lama (untuk migrasi saja)
```

## Catatan

- Foto pemain masih disimpan ke `public/uploads/`. Untuk deployment produksi sebaiknya dimigrasikan ke **Supabase Storage**.
- Nomor jersey kosong/official disimpan `NULL`; keunikan hanya ditegakkan antar pemain berjersey dalam satu tim.
