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
| Tabel `teams` | Identitas tim + status (`Draft`/`Lengkap`/`Terverifikasi`), `team_number` unik, `owner_code` (kode peserta pemilik, `''` = belum di-assign) |
| Tabel `members` | 20 personel per tim (FK `ON DELETE CASCADE`, slot unik per tim) |
| Unique index parsial | Anti nomor jersey ganda antar pemain dalam satu tim; anti satu kode peserta dipakai dua tim |
| Trigger `enforce_team_quota` | Kuota maks 6 tim per regional × kategori — ditegakkan di level DB |
| Trigger `touch_updated_at` | Kolom `updated_at` otomatis |
| Bucket `player-photos` | Supabase Storage bucket publik untuk foto jersey pemain |

> ⚠️ Bila database sudah dibuat sebelum kolom `owner_code` ada, jalankan ulang `supabase/schema.sql` — bagian `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` dan index di dalamnya idempotent dan aman dijalankan ulang di Supabase SQL Editor.

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

### Seed 20 tim nyata (data resmi event)

Seeder mengisi database dengan **20 tim nyata** (Tengah 5 Putra + 4 Putri, Timur 5 Putra + 6 Putri, Barat kosong), masing-masing berstatus `Draft` dengan 20 slot personel kosong dan tanpa pemilik. Endpoint seeder **hanya untuk Panpel** (wajib login kode `asp1`–`asp5`) dan **diblokir total di production**:

```bash
# via API (mode development, login Panpel dulu agar cookie sesi terkirim)
curl -X POST http://localhost:3000/api/seed -H 'Content-Type: application/json' -d '{}' -b cookies.txt -c cookies.txt
# dengan {"force": true} untuk mengosongkan dulu lalu mengisi ulang 20 tim
curl -X POST http://localhost:3000/api/seed -H 'Content-Type: application/json' -d '{"force": true}' -b cookies.txt -c cookies.txt
```

> Login dulu: `POST /api/auth/login` dengan body `{"code": "asp1"}` dan simpan cookie-nya (flag `-c`/`-b` di atas).

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Fitur

- **Gerbang kode akses (46 kode, RBP)** — satu kolom "Kode Akses" di `/login`; sesi cookie HttpOnly 7 hari. Panpel (`asp1`–`asp5`): admin penuh. MojiSport (`mojisport1`–`mojisport5`): read-only + laporan. Peserta (`user1`–`user36`): hanya tim sendiri. Tanpa login tidak bisa melihat atau mengubah apa pun. Lihat `docs/07_ROLE_BASED_PERMISSIONS_RBP.md` dan `docs/09_DAFTAR_46_KODE_AKSES.md`
- **Pendaftaran tim (Panpel saja)** dengan validasi kuota regional real-time dan penomoran otomatis `LVM-BRT/TGH/TMR-PA/PI-NN` (anti duplikat: mengisi celah nomor terendah yang bebas)
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
src/lib/accessCodes.ts               # 46 kode akses + peran (server-only)
src/lib/session.ts                   # Cookie sesi HMAC-SHA256 7 hari (server-only)
src/lib/auth.ts                      # Guard sesi: getActorFromRequest/verifyActor/requireActor
src/components/AuthContext.tsx       # Sesi & peran di sisi klien (useAuth)
src/app/login/page.tsx               # Halaman login satu kolom Kode Akses
src/proxy.ts                         # Gerbang middleware: holding mode + wajib login
src/lib/db.ts                        # Orkestrasi bisnis: kuota, nomor tim, status roster
src/lib/demoData.ts / seed.ts        # Data master 20 tim nyata & seeder (Panpel, non-prod)
scripts/migrate-json-to-supabase.mjs # Impor data JSON lama -> Supabase
src/app/api/**                       # REST endpoints (auth, teams, members, quota, seed, upload)
data/volleyball_data.json            # Sumber data lama (untuk migrasi saja)
```

## Catatan

- Foto pemain diunggah langsung ke **Supabase Storage** (bucket `player-photos`) ketika Supabase aktif, dengan fallback ke `public/uploads/` bila memakai Postgres lokal (offline).
- Nomor jersey kosong/official disimpan `NULL`; keunikan hanya ditegakkan antar pemain berjersey dalam satu tim.

