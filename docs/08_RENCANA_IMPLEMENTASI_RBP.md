# RENCANA IMPLEMENTASI ROLE-BASED PERMISSIONS (RBP) & GERBANG 46 KODE AKSES
## Liga Voli Mahasiswa Nasional (LVM) — `ligavolimahasiswa.org`

> **Status dokumen:** RENCANA DISETUJUI — siap dieksekusi per gelombang.
> **Dokumen acuan:** `docs/07_ROLE_BASED_PERMISSIONS_RBP.md` (spesifikasi matriks hak akses).
> **Tanggal penyusunan:** 11 September 2026.
> **Tujuan dokumen ini:** satu sumber kebenaran yang lengkap dan rinci (tanpa singkatan) agar implementasi bisa dilanjutkan kapan pun — oleh sesi AI mana pun atau manusia — tanpa kehilangan konteks.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Keputusan Final yang Disepakati](#2-keputusan-final-yang-disepakati)
3. [Data Master 20 Tim Nyata](#3-data-master-20-tim-nyata)
4. [Kondisi Awal Codebase](#4-kondisi-awal-codebase)
5. [Temuan Riset Teknis Penting](#5-temuan-riset-teknis-penting)
6. [Kontrak Beku](#6-kontrak-beku)
7. [Status Implementasi Saat Ini](#7-status-implementasi-saat-ini)
8. [Rencana Task T1–T12 (Detail)](#8-rencana-task-t1t12-detail)
9. [Urutan Eksekusi & Paralelisasi](#9-urutan-eksekusi--paralelisasi)
10. [Runbook Operasional Manual](#10-runbook-operasional-manual)
11. [Daftar 46 Kode Akses](#11-daftar-46-kode-akses)
12. [Risiko & Mitigasi](#12-risiko--mitigasi)
13. [Definition of Done](#13-definition-of-done)

---

## 1. Ringkasan Eksekutif

Portal LVM (`ligavolimahasiswa.org`) harus dibatasi aksesnya: **tidak semua orang boleh memasukkan atau melihat data**. Solusinya adalah **Single-Field Gatekeeper Access Code** — satu kolom "Kode Akses" di halaman login — dengan total **46 kode** dalam **3 peran**:

| Peran | Kode | Jumlah | Hak akses inti |
|---|---|---|---|
| Panpel (Panitia Pelaksana) | `asp1`–`asp5` | 5 | Admin penuh: kelola semua tim, verifikasi, hapus, assign pemilik, seed |
| MojiSport (Broadcaster & Media Partner) | `mojisport1`–`mojisport5` | 5 | Read-only semua data + laporan + Excel + PDF; tanpa tombol mutasi |
| Peserta (Manajer Tim Kampus) | `user1`–`user36` | 36 | Kelola **hanya tim sendiri** (belum Terverifikasi); Report 2 hanya tim sendiri; tanpa Excel; tanpa buat tim |

Pengikatan peserta ke tim dilakukan lewat kolom baru **`owner_code`** di tabel `teams` (**Opsi B**: Panpel yang menempelkan kode ke tim melalui UI, bukan otomatis saat pendaftaran). Satu kode = satu tim (ditegakkan unique partial index). Saat ini terdaftar **20 tim nyata** (Tengah 9, Timur 11, Barat 0 dari kuota 36).

---

## 2. Keputusan Final yang Disepakati

Hasil diskusi dan jawaban user (chat 11/9/2026):

1. **Jumlah kode final = 46** (5 Panpel + 5 MojiSport + 36 Peserta). Angka "35" di dokumen 07 adalah typo; kuota resmi 36 tim sehingga 1 kode = 1 tim membutuhkan 36 kode peserta.
2. **Seed dijalankan oleh developer** — 20 tim nyata diimpor ke database (menggantikan 6 tim demo).
3. **Peserta TIDAK dapat membuat tim sendiri.** Pembuatan tim hanya oleh Panpel. (Menyimpang dari baris 4 matriks dokumen 07 yang membolehkan peserta daftar "sesuai slot akun" — keputusan ini membatalkannya.)
4. **Report 2 (Akademik/NIM) untuk Peserta = hanya timnya sendiri.** (Tafsir resmi atas sel "Terbatas" di dokumen 07.)
5. **`ADMIN_SECRET_KEY` dihapus total.** Tidak ada login super-admin cadangan. Semua akses lewat 46 kode. Konsekuensi: secret HMAC untuk delete-token upload dialihkan ke `ACCESS_SESSION_SECRET`.
6. **Regional Barat dikosongkan.** Tidak ada data palsu; dashboard menampilkan 0/6. Bukan blocker rilis.

Keputusan tambahan yang diambil selama perencanaan:

7. **Opsi B untuk pemetaan kode→tim**: Panpel menempelkan `owner_code` ke tim via UI dropdown (dengan validasi 1 kode ≤ 1 tim, bisa reassign). Rekomendasi awal "otomatis terikat saat daftar" DIBATALKAN karena keputusan no. 3.
8. **Sesi = cookie HttpOnly bertanda tangan HMAC-SHA256**, nama `lvm_access_session`, masa aktif **7 hari** (sesuai dokumen 07 §5.A.1).
9. **Tafsir matriks untuk Peserta**: boleh **melihat** daftar semua tim (baris 3 dokumen 07 tetap berlaku), tetapi **edit hanya tim sendiri** dan **Report 2 hanya tim sendiri**. Excel disembunyikan untuk Peserta.
10. **Endpoint `/api/auth/verify` lama dipertahankan** sebagai alias login (kompatibilitas skrip & frontend lama), tetapi didelegasikan ke kode akses baru.

---

## 3. Data Master 20 Tim Nyata

Sumber: pesan user 11/9/2026 (+62 818-764-058). Venue hanya catatan (GOR UII Yogyakarta, GOR UNESA Surabaya) — tidak masuk skema.

### 3.1 Regional Tengah (9 tim)

**Putra — 5 tim:**

| # | Nama tim (import) | Provinsi | Region |
|---|---|---|---|
| 1 | UNMEKA Yogyakarta | DI Yogyakarta | Tengah |
| 2 | UII Yogyakarta | DI Yogyakarta | Tengah |
| 3 | Universitas Semarang | Jawa Tengah | Tengah |
| 4 | UNTAG Semarang | Jawa Tengah | Tengah |
| 5 | UNJAYA Yogyakarta | DI Yogyakarta | Tengah |

**Putri — 4 tim:**

| # | Nama tim (import) | Provinsi | Region |
|---|---|---|---|
| 1 | UNMEKA Yogyakarta | DI Yogyakarta | Tengah |
| 2 | UII Yogyakarta | DI Yogyakarta | Tengah |
| 3 | Universitas Semarang | Jawa Tengah | Tengah |
| 4 | UNJAYA Yogyakarta | DI Yogyakarta | Tengah |

### 3.2 Regional Timur (11 tim)

**Putra — 5 tim:**

| # | Nama tim (import) | Provinsi | Region |
|---|---|---|---|
| 1 | UNESA Surabaya | Jawa Timur | Timur |
| 2 | Universitas Bojonegoro | Jawa Timur | Timur |
| 3 | Universitas Negeri Malang | Jawa Timur | Timur |
| 4 | Universitas Wiraraja | Jawa Timur | Timur |
| 5 | STKIP PGRI Pacitan | Jawa Timur | Timur |

**Putri — 6 tim:**

| # | Nama tim (import) | Provinsi | Region |
|---|---|---|---|
| 1 | UNESA Surabaya | Jawa Timur | Timur |
| 2 | Universitas PGRI Sumenep | Jawa Timur | Timur |
| 3 | Universitas Negeri Malang | Jawa Timur | Timur |
| 4 | Universitas Insan Budi Utomo | Jawa Timur | Timur |
| 5 | UIN Tulung Agung | Jawa Timur | Timur |
| 6 | Universitas Nusantara PGRI | Jawa Timur | Timur |

### 3.3 Regional Barat (0 tim)

Dikosongkan sesuai keputusan no. 6. Slot tersisa: Barat 12 + Tengah 3 (Putra 1, Putri 2) + Timur 1 (Putra 1) = **16 slot tersisa** dari kuota 36.

### 3.4 Verifikasi identitas kampus ambigu (hasil pencarian internet, 11/9/2026)

| Singkatan | Nama resmi | Alamat | Sumber |
|---|---|---|---|
| UNMEKA | **Universitas Nusa Megarkencana** Yogyakarta | Jl. A.M. Sangaji No. 49, Cokrodiningratan, Kec. Jetis, Kota Yogyakarta, DIY 55233. Situs `unmeka.ac.id`; kode SINTA 051032 | SINTA Kemdiktisaintek, situs kampus, Brave Search |
| UNTAG | **Universitas 17 Agustus 1945 Semarang** | Jl. Pawiyatan Luhur, Bendan Duwur, Kota Semarang, Jawa Tengah. Situs `untagsmg.ac.id` | Wikipedia ID |

Keduanya masuk Regional Tengah sesuai `REGIONS_CONFIG` — **tidak perlu perubahan aturan region**.

### 3.5 Nilai import per tim (untuk T3)

- `name`: sesuai tabel di atas.
- `province`: sesuai tabel di atas.
- `region` / `category`: sesuai pengelompokan.
- `address`, `contactPerson`, `contactPhone`: **kosong (`''`)** — data tidak diberikan; Panpel melengkapi kemudian via UI.
- `status`: `Draft`.
- `ownerCode`: `''` (belum di-assign; Panpel assign via UI T5/T7).
- `members`: 20 slot kosong (15 Pemain slot 1–15 + 5 Official slot 16–20) via `buildDefaultMembers`.
- `teamNumber`: dihitung saat seed via `generateTeamNumber` (mengisi celah terendah). Pada DB kosong hasilnya: `LVM-TGH-PA-01` s/d `-05`, `LVM-TGH-PI-01` s/d `-04`, `LVM-TMR-PA-01` s/d `-05`, `LVM-TMR-PI-01` s/d `-06`.
- **Perlu konfirmasi user**: nama tampilan "UNTAG" (default import: `UNTAG Semarang`) dan nama lengkap "UNJAYA Yogyakarta" (diduga Universitas Jenderal Achmad Yani — belum terverifikasi dari internet).

---

## 4. Kondisi Awal Codebase

(Diringkas dari eksplorasi penuh repo pada 11/9/2026; detail file ada di jawaban studi awal.)

### 4.1 Stack & struktur

- Next.js **16.3.2** (App Router) + React 19 + TypeScript + Tailwind v4. Package manager: ada `bun.lock` dan `package-lock.json`.
- Database ganda via konfigurasi: PostgreSQL lokal (`pg`) atau Supabase (PostgREST). Kontrak `DataBackend` di `src/lib/backend.ts`; adapter `src/lib/backends/pgBackend.ts` & `supabaseBackend.ts`; orkestrasi bisnis `src/lib/db.ts`; mapper `src/lib/rowMappers.ts`; tipe `src/lib/types.ts`.
- Skema tunggal `supabase/schema.sql`: tabel `teams` (status Draft/Lengkap/Terverifikasi, `team_number` unik), `members` (20 slot, cascade), trigger kuota 6 tim terverifikasi per regional×kategori (dengan `pg_advisory_xact_lock`), partial unique index jersey, trigger `updated_at`, RLS aktif tanpa policy publik, bucket Storage `player-photos`.
- Domain: 3 Regional (Barat: DKI Jakarta/Jawa Barat/Banten; Tengah: Jawa Tengah/DIY; Timur: Jawa Timur/Bali), 2 kategori, kuota 36 tim, 20 personel/tim (15 Pemain + 5 Official: Manager, Head Coach, 2 Asisten, Utilities).
- Halaman: `/` (= register identitas tim), `/dashboard`, `/reports` (Report 1/2/3 + ID Card, ekspor Excel/PDF), `/teams/[id]` (lembar tim + verifikasi), `/teams/[id]/roster` (form 20 slot), `/production` (holding).
- API: `teams` (GET/POST), `teams/[id]` (GET/PUT/DELETE), `teams/[id]/members` (PUT), `quota` (GET), `upload` (POST/DELETE), `seed` (POST, blokir di production), `auth/verify` (POST PIN).
- Auth lama: satu PIN bersama `ADMIN_SECRET_KEY` (fallback `lvm2026_admin_secret_passcode`), disimpan frontend di `sessionStorage` (`lvm_admin_key`), dikirim via header `x-admin-key`, prompt `prompt()` di dashboard/team/roster. Tidak ada peran, tidak ada cookie sesi, tidak ada middleware auth (file `src/proxy.ts` hanya untuk production holding mode).
- Upload foto: validasi magic bytes JPG/PNG/WebP, maks 5MB, rate-limit per IP (`src/lib/rateLimit.ts`), Supabase Storage atau fallback `public/uploads/` (di-`.gitignore`).
- Security headers + CSP di `next.config.ts` (catatan: `script-src` memuat `unsafe-eval`).
- Skrip: `scripts/migrate-json-to-supabase.mjs`, `test_api_routes.mjs`, `test_user_flow.mjs`, `cleanup-orphaned-photos.mjs`, `generate_official_docx.mjs`, `convert_to_docx.mjs`. Data lama `data/volleyball_data.json`.
- Dokumen: `docs/01`–`06` (proposal/SPK/SRS/UAT/manual/BAST, .md + .docx), `docs/07_ROLE_BASED_PERMISSIONS_RBP.md` (spesifikasi RBP, untracked).

### 4.2 Kondisi git saat dokumen ini ditulis

- Commit terakhir: `8bbe728 feat(reports): add committee verification status filter and dark badge for print logo` (sudah mencakup 4 file yang sebelumnya uncommitted: `globals.css`, `reports/page.tsx`, `teams/[id]/page.tsx`, `exportExcel.ts`).
- **Belum di-commit (working tree)**: seluruh hasil T1 + T2 (lihat §7). Belum ada commit untuk RBP.

---

## 5. Temuan Riset Teknis Penting

Hasil riset paralel 3 subagent (read-only) pada 11/9/2026 — diringkas tanpa penghilangan poin penting:

### 5.1 Konvensi Next.js 16 — middleware → proxy

- Mulai Next 16, Middleware **diganti nama menjadi Proxy**; fungsionalitas sama. File: `proxy.ts`/`proxy.js` di root atau `src/`. Export: fungsi bernama `proxy` atau default export. `middleware.ts` masih didukung tetapi **deprecated**.
- Rujukan lokal: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15`, `.../03-api-reference/03-file-conventions/proxy.md:58`, `.../03-file-conventions/middleware.md:11-13`, `.../02-guides/upgrading/version-16.md:616`.
- **Runtime proxy = Node.js dan TIDAK bisa dikonfigurasi** (`proxy.md:221-223`, `:774`). Konsekuensi: `node:crypto` (`createHmac`, `timingSafeEqual`, `Buffer`) aman dipakai di `proxy.ts` dan lib yang diimpornya. Web Crypto juga tersedia sebagai global. Runtime edge sendiri deprecated (`version-16.md:17`).
- API cookie tidak berubah: request `get/getAll/has/set/delete/clear`; response `get/getAll/set/delete`. `NextResponse.next/redirect/rewrite/json` tidak berubah. `NextResponse.json` boleh dipakai di proxy (401 untuk `/api/*`); `NextResponse.redirect` untuk halaman.
- `config.matcher` tetap didukung termasuk negative lookahead. Catatan: `/_next/data` tetap dijalankan walau di-exclude (disengaja, alasan keamanan).
- Hindari `NextResponse.next({ headers })`; gunakan `NextResponse.next({ request: { headers } })` bila perlu meneruskan header.
- Peringatan keamanan resmi: proxy **bukan satu-satunya lapisan auth** — verifikasi juga di route handler (`proxy.md:217-219`).
- Tipe `NextMiddleware` deprecated → `NextProxy` (`next/dist/server/web/types.d.ts:51,63`); bisa `import type { NextProxy } from 'next/server'`.
- Repo sudah benar (`src/proxy.ts` mengekspor `proxy` + `config.matcher`) — tidak perlu rename.

### 5.2 Peta titik sentuh auth lama & RBAC

- **Tidak ada** konsep `owner_code`/role/peserta/mojispot/panpel di repo (grep hanya menemukan `teamRole` Pemain/Official).
- Satu-satunya choke point: `src/lib/auth.ts` `verifyAdminKey` (header `x-admin-key` → cookie `lvm_admin_key` → banding `ADMIN_SECRET_KEY`).
- Cookie `lvm_admin_key` sebenarnya **jalur mati** (frontend tidak pernah set cookie, hanya sessionStorage).
- `ADMIN_SECRET_KEY` dipakai di 3 tempat: `src/lib/auth.ts:8`, `src/app/api/auth/verify/route.ts:11`, `src/app/api/upload/route.ts:11` (sebagai secret HMAC delete-token).
- Frontend `lvm_admin_key` tersebar di: `dashboard/page.tsx` (`getAdminKey` :63, `handleDeleteTeam` :103, header DELETE :115, clear 401 :123), `teams/[id]/page.tsx` (`getAdminKey` :46, `handleVerifyTeam` :86, header PUT :100, clear :109), `roster/page.tsx` (`isPanitiaMode` init :60-65, toggle :69-98, `isEditable` :238 & :422, header member-save :244-253, clear 401 :283, header finalize :334-340, tombol Mode Panitia :449-470, banner Draft :744-763, banner read-only :764-780, banner aktif :781-795, semua input `disabled={!isEditable}`, action rows :1080-1163, finalize bersyarat :1122).
- Logika edit saat ini: **siapa pun** bisa edit tim berstatus Draft (`isEditable = isPanitiaMode || status==='Draft'`) — celah yang ditutup RBP.
- Reports: tombol Excel di `reports/page.tsx:278-284`, print di `:286-292`, ekspor di `handleExportExcel` `:224-248`. Rantai filter: `availableTeamsForSelect` (:61-70) → `filteredTeams` (:73-77, **titik scope utama Peserta**) → `report1Teams` (:90-142), `report3Teams` (:145-164), `allFilteredMembers` (:168-176) → `searchedReport2Members` (:179-199), `searchedIdCards` (:201-222). Dropdown status verifikasi & tim di `:392-414`. Blok tanda tangan cetak `:914-927`.
- Excel murni client-side (`exportExcel.ts`: `exportReport1ToExcel` :58, `exportReport2ToExcel` :88, `exportReport3ToExcel` :117 + helper `buildWorksheet` :27, `downloadWorkbook` :44, `sanitizeCellValue` :17) — gating = UI + scope data `GET /api/teams`.
- API routes & akses saat ini: `GET teams`/`POST teams`/`GET [id]`/`GET quota`/`POST upload` = **tanpa auth**; `PUT [id]` = admin kecuali finalisasi Draft→Lengkap; `DELETE [id]` = admin; `PUT members` = admin kecuali status Draft; `DELETE upload` = admin ATAU delete-token; `POST seed` = admin + blokir production.
- `db.ts` yang butuh kesadaran peran/owner: `getAllTeams` :79, `getTeamById` :86, `getQuotaStats` :91, `generateTeamNumber` :120, `insertTeamWithMembers` :137, `clearAllTeams` :143, `createTeam` :205 (bangun Team :250-264, cek kuota :232-241), `updateTeam` :314 (whitelist `TEAM_PATCH_FIELDS` :303-312, cek kuota verifikasi :320-337), `deleteTeam` :374, `updateMember` :426 (jersey :454-463, status :492-506), `withDatabaseLock` :35.
- Pola context yang bisa ditiru untuk AuthContext: `AppModeContext.tsx`; penempatan provider: `layout.tsx:5`; guard shell: `AppShell.tsx:17-21`; link nav: `Navbar.tsx:22-26` (+ tombol Daftar Tim `:74-89`, `:136-152`); form publik: `page.tsx`; upload/delete: `PhotoUpload.tsx:63,72,120` (di-gate via prop `disabled`, dipakai roster `:1071`).

### 5.3 Skema, seed, backend aktif

- `supabase/schema.sql` satu-satunya file SQL; `create table if not exists` membuat kolom baru **tidak** tertambah di DB existing — migrasi harus `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` di dalam file yang sama agar fresh & existing sama-sama benar. Trigger/index sudah idempotent.
- Backend aktif dev = **Supabase** (`.env.local` berisi `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; `DATABASE_URL`/`PG*` tidak ada). Konsekuensi: DDL harus dijalankan di **Supabase SQL Editor**.
- `.env.local` juga berisi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PRODUCTION_MODE`, `ADMIN_SECRET_KEY`. `.env.example` **tidak sinkron** (tidak mendokumentasikan pasangan `SUPABASE_*`).
- `buildDefaultMembers` (`db.ts:148-203`) **tidak diekspor**; menghasilkan 20 slot kosong (15 Pemain + 5 Official) — tepat untuk seed tim nyata. `insertTeamWithMembers` memakai `team.members` apa adanya. Roster mengandalkan tepat 20 baris (`teams/[id]/page.tsx:144-146`, roster `:535,:582,:657`).
- Seed saat ini: 6 tim demo hardcoded (`demoData.ts:9-64`), semua `teamNumber` suffix `-01` (akan bentrok bila diganti 20 tim tanpa penomoran unik), status `Lengkap` dengan personel acak. Seeder menolak bila DB tidak kosong kecuali `force` (yang me-`clearAllTeams` dulu).
- `scripts/migrate-json-to-supabase.mjs` `teamRow()` daftar kolom eksplisit tanpa `owner_code` (aman bila kolom `not null default ''`, opsional tambah mapping).
- Test scripts tidak memakai auth apa pun, tetapi `test_api_routes.mjs:217-227` verifikasi tanpa header admin (bergantung jalur finalize/`NODE_ENV`) dan `test_user_flow.mjs:360-386` mengandalkan hitungan kuota — keduanya terpengaruh perubahan seed 6→20 tim dan harus disesuaikan di T12.

---

## 6. Kontrak Beku

Bagian ini **tidak boleh diubah** tanpa persetujuan user, agar task paralel tidak tabrakan.

### 6.1 Kode akses & peran (`src/lib/accessCodes.ts` — SUDAH ADA di working tree)

```ts
export type AccessRole = 'panpel' | 'mojisport' | 'peserta';
export interface Actor { role: AccessRole; subject: string; ownerCode: string; }
```

- `asp1`..`asp5` → `{ role:'panpel', subject:<kode>, ownerCode:'' }`
- `mojisport1`..`mojisport5` → `{ role:'mojisport', subject:<kode>, ownerCode:'' }`
- `user1`..`user36` → `{ role:'peserta', subject:<kode>, ownerCode:<kode> }`
- `resolveAccessCode(input)`: trim + lowercase, banding SHA-256 digest + `timingSafeEqual`, return `Actor | null`.
- `listAccessCodes()`: untuk dropdown Panpel (T5).
- `getSessionSecret()`: baca `ACCESS_SESSION_SECRET`; kosong → di non-production fallback `'lvm-dev-access-session-secret'`; di production → throw.

### 6.2 Sesi (`src/lib/session.ts` — SUDAH ADA di working tree)

- Cookie: `SESSION_COOKIE = 'lvm_access_session'`; `HttpOnly`, `SameSite=Lax`, `Secure` hanya production, `path='/'`, `maxAge` 7 hari.
- Token: `base64url(JSON)` + `.` + `base64url(HMAC-SHA256(payloadB64, secret))`. Payload `{ sub, role, owner, iat, exp }`, TTL 7 hari.
- `createSessionToken(actor)`, `verifySessionToken(token)` (cek HMAC + exp + whitelist role), `sessionCookieOptions()`.
- Tanpa impor `next/server` — aman untuk proxy & route.

### 6.3 Auth guard (`src/lib/auth.ts` — SUDAH DITULIS ULANG di working tree)

- `getActorFromRequest(request): Actor | null` (baca cookie sesi).
- `verifyActor(request, allowedRoles?): Actor | null`.
- `requireActor(request, allowedRoles?): Actor` — throw `AuthError` (`status` 401 belum login / 403 role salah).
- `verifyAddrinKey` dipertahankan sebagai **shim deprecated sementara** = `getActorFromRequest(request)?.role === 'panpel'` (header `x-admin-key` diabaikan). **Wajib dihapus di T5** setelah upload/seed/routes migrasi.

### 6.4 Endpoint auth (SUDAH ADA di working tree)

| Endpoint | Method | Perilaku |
|---|---|---|
| `/api/auth/login` | POST `{code}` | Rate-limit `login:<ip>` 10/menit → 429. Gagal → 401 `{success:false, error:'Kode Akses tidak terdaftar.'}`. Sukses → set cookie + `{success:true, role, subject}` |
| `/api/auth/logout` | POST | Hapus cookie (`maxAge:0`) + `{success:true}` |
| `/api/auth/session` | GET | `{authenticated, role?, subject?, ownerCode?}` |
| `/api/auth/verify` | POST `{code\|pin}` | Alias kompatibilitas: delegasi ke `resolveAccessCode`, set cookie juga, return `{success, valid, role?, subject?}`. Rate-limit `verify:<ip>` 10/menit. **Tanpa `ADMIN_SECRET_KEY`** |

### 6.5 Endpoint baru untuk T5 (BELUM ADA — harus dibuat)

| Endpoint | Method | Perilaku |
|---|---|---|
| `/api/teams/[id]/owner` (atau sisipkan di `PUT [id]`) | PUT `{ownerCode}` | Panpel saja. Validasi 1 kode ≤ 1 tim. `''` = lepas pemilik |
| `/api/auth/codes` | GET | Panpel saja. `{codes:[{code, role, usedByTeamId, usedByTeamName}]}` untuk dropdown assign |

### 6.6 Matriks izin final (acuan implementasi T5–T10)

| # | Aksi | Panpel | Mojisport | Peserta | Publik |
|---|---|---|---|---|---|
| 1 | Masuk portal | ✅ | ✅ | ✅ | ❌ (Gatekeeper `/login`) |
| 2 | Dashboard & metrik kuota | ✅ semua | ✅ semua | ✅ semua | ❌ |
| 3 | Daftar semua tim & profil | ✅ | ✅ | ✅ (lihat saja) | ❌ |
| 4 | Buat tim baru | ✅ | ❌ | ❌ | ❌ |
| 5 | Assign/lepas `owner_code` | ✅ | ❌ | ❌ | ❌ |
| 6 | Edit roster 20 personel | ✅ semua | ❌ | ✅ hanya tim sendiri & status Draft | ❌ |
| 7 | Upload/hapus foto | ✅ semua | ❌ | ✅ hanya tim sendiri | ❌ |
| 8 | Finalisasi Draft→Lengkap | ✅ | ❌ | ✅ hanya tim sendiri | ❌ |
| 9 | Verifikasi / batal verifikasi | ✅ | ❌ | ❌ | ❌ |
| 10 | Report 1, 3, ID Card | ✅ | ✅ | ✅ | ❌ |
| 11 | Report 2 (akademik) | ✅ semua | ✅ semua | ✅ hanya tim sendiri | ❌ |
| 12 | Cetak PDF | ✅ | ✅ | ✅ | ❌ |
| 13 | Export Excel | ✅ | ✅ | ❌ disembunyikan | ❌ |
| 14 | Hapus tim | ✅ | ❌ | ❌ | ❌ |
| 15 | Seed | ✅ (non-prod) | ❌ | ❌ | ❌ |

### 6.7 Aturan kepemilikan

- Kolom DB `owner_code`, domain `ownerCode`, default `''` (= belum di-assign).
- Unique partial index: satu kode hanya untuk satu tim; `''` boleh banyak.
- Cek kepemilikan server-side: bandingkan `actor.ownerCode` dengan `team.owner_code` (baca fresh dari DB via `findTeamOwner`, bukan dari input klien).
- Status `Terverifikasi` mengunci edit Peserta (tetap bisa dibatalkan Panpel).

---

## 7. Status Implementasi Saat Ini

### 7.1 SELESAI — T1 Session & Auth Core (kode ada di working tree, BELUM di-commit)

File baru:
- `src/lib/accessCodes.ts` (83 baris) — sesuai kontrak §6.1.
- `src/lib/session.ts` (103 baris) — sesuai kontrak §6.2.
- `src/app/api/auth/login/route.ts` (49 baris) — sesuai kontrak §6.4 (rate-limit header lengkap).
- `src/app/api/auth/logout/route.ts` (14 baris) — sesuai kontrak.
- `src/app/api/auth/session/route.ts` (16 baris) — sesuai kontrak.

File diubah:
- `src/lib/auth.ts` — tulis ulang: `AuthError`, `getActorFromRequest`, `verifyActor`, `requireActor`, shim `verifyAdminKey` (deprecated, hapus di T5).
- `src/app/api/auth/verify/route.ts` — delegasi kode akses + set cookie + rate-limit (catatan kosmetik: tidak ada newline akhir file).

Verifikasi yang sudah dilakukan: `npx tsc --noEmit` — **tidak ada error dari file T1**.

### 7.2 SELESAI SEBAGIAN — T2 Skema & plumbing `owner_code` (kode ada di working tree, BELUM di-commit)

Sudah dikerjakan:
- `supabase/schema.sql`: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS owner_code text not null default ''` + unique partial index + komentar. ✅
- `src/lib/types.ts`: `Team.ownerCode: string`. ✅
- `src/lib/rowMappers.ts`: `TeamRow.owner_code` + mapping `mapTeamRow`. ✅
- `src/lib/backends/pgBackend.ts`: filter `ownerCode` di `fetchTeamsWithMembers`, `findTeamOwner`, `owner_code` di INSERT + objek return. ✅ (catatan kosmetik: baris `findUsedTeamNumbers` tergabung dengan baris `const result` — tetap compile, rapikan di T12)
- `src/lib/backends/supabaseBackend.ts`: filter `ownerCode`, `findTeamOwner`, `owner_code` di `teamPayload`. ✅
- `src/lib/backend.ts`: filter `ownerCode` di interface + `findTeamOwner?` (opsional). ✅
- `src/lib/db.ts`: `ownerCode: ''` pada objek tim baru di `createTeam`. ✅
- `scripts/migrate-json-to-supabase.mjs`: **belum** ditambah `owner_code` (opsional, aman karena default).

**Sisa T2 yang BELUM dikerjakan** (harus diselesaikan sebelum/seiring T5):
- R2.1 — `src/lib/db.ts` `TEAM_PATCH_FIELDS` (baris ~304): tambah `ownerCode: 'owner_code'` agar assign via `updateTeam` lolos whitelist.
- R2.2 — `src/lib/db.ts` `getAllTeams` (baris 79): tambah parameter `filterOwnerCode?: string` dan teruskan ke `backend.fetchTeamsWithMembers({ ..., ownerCode })`.
- R2.3 — Putuskan `findTeamOwner` tetap opsional (`?`) atau wajib; T5 harus menangani kedua kasus (gunakan `backend.findTeamOwner?.(...)` dengan fallback baca via `fetchTeamWithMembers` bila undefined).

### 7.3 Verifikasi kompilasi terakhir (11/9/2026)

`npx tsc --noEmit` → **1 error tersisa**, di `src/lib/demoData.ts(157,3)`: objek tim demo tidak memiliki `ownerCode` (wajar — `Team.ownerCode` kini required). Error ini **disengaja dibiarkan** dan akan hilang saat T3 mengganti `demoData.ts`.

### 7.4 BELUM DIKERJAKAN SAMA SEKALI — T3 s/d T12

Termasuk: seed 20 tim, halaman `/login`, `AuthContext`, badge Navbar, guard `proxy.ts`, guard semua API routes (masih shim), gating dashboard/team/roster/reports/register, `.env.example`, dokumentasi daftar kode, dan QA.

---

## 8. Rencana Task T1–T12 (Detail)

> T1 = selesai (verifikasi akhir di T12). T2 = sisa R2.1–R2.3. Di bawah ini langkah rinci per task agar bisa dikerjakan sesi mana pun.

### T1 · Session & Auth Core — ✅ SELESAI (kode di working tree)

Checklist verifikasi ulang (bila dilanjutkan sesi baru):
- [x] `accessCodes.ts`: 5 asp + 5 mojisport + 36 user, `timingSafeEqual`, `getSessionSecret` (throw di production bila kosong).
- [x] `session.ts`: format token, TTL 7 hari, opsi cookie, tanpa `next/server`.
- [x] `auth.ts`: `AuthError`, `getActorFromRequest`, `verifyActor`, `requireActor`, shim `verifyAdminKey`.
- [x] `login/logout/session/verify` routes + rate-limit + pesan Indonesia.
- [ ] Uji manual di T12: login 46 kode, cookie ter-set, exp 7 hari, `/api/auth/session` benar.

### T2 · Skema & plumbing `owner_code` — ⏳ SISA R2.1–R2.3

Kerjakan sisa ini (file: `src/lib/db.ts`):
1. Tambah `ownerCode: 'owner_code'` ke `TEAM_PATCH_FIELDS`.
2. Ubah `getAllTeams(filterRegion?, filterCategory?, filterOwnerCode?)` dan teruskan filter ke backend.
3. (Opsional) Jadikan `findTeamOwner` required di interface bila kedua backend sudah punya (keduanya sudah punya).
4. Jalankan `npx tsc --noEmit` — harus 0 error terkait (error demoData ditangani T3).

### T3 · Seed 20 tim nyata — ⏳ BELUM

File: `src/lib/demoData.ts`, `src/lib/seed.ts`, `src/lib/db.ts` (ekspor `buildDefaultMembers`), `.env.example` (opsional).

Langkah:
1. Di `src/lib/db.ts`, ubah `function buildDefaultMembers` menjadi `export function buildDefaultMembers` (tanpa mengubah isi).
2. Di `src/lib/demoData.ts`:
   a. Ganti `sampleTeamsData` dengan 20 entri sesuai §3 (nama, provinsi, region, kategori; address/PIC/phone kosong).
   b. Tambahkan field `ownerCode: ''` pada tiap entri dan tipe data (agar tsc lolos).
   c. Tulis ulang `buildDemoTeams()`: untuk tiap entri, buat `teamId` deterministik (`team_real_tgh_pa_1` dst.), hitung `teamNumber` via pola prefix + nomor urut per pasangan region×kategori (`LVM-TGH-PA-01…05`, `LVM-TGH-PI-01…04`, `LVM-TMR-PA-01…05`, `LVM-TMR-PI-01…06`) — JANGAN semua `-01`. Bangun `members` via `buildDefaultMembers(teamId, teamNumber)`. Status `Draft`. `createdAt/updatedAt` = now ISO.
   d. HAPUS `generateDemoMembers` dan nama acak bila tidak dipakai lagi (hindari dead code).
3. `src/lib/seed.ts`: tidak perlu ubah logika (sudah pakai `buildDemoTeams` + `insertTeamWithMembers`); pastikan tipe cocok.
4. Verifikasi: `npx tsc --noEmit` 0 error; jalankan seed sesuai §10 (runbook) dan pastikan tepat 20 tim × 20 slot.
5. Catat: `test_user_flow.mjs` mengasumsikan hitungan kuota lama — sesuaikan di T12.

### T4 · UI Login + AuthContext + Navbar — ⏳ BELUM

File baru: `src/app/login/page.tsx`, `src/components/AuthContext.tsx`.
File edit: `src/app/layout.tsx`, `src/components/Navbar.tsx`. JANGAN sentuh `AppShell.tsx` (milik T6).

Langkah:
1. `AuthContext.tsx` (`'use client'`): state `{status:'loading'|'authed'|'guest', role?, subject?, ownerCode?}`; `useEffect` fetch `/api/auth/session`; `login(code)` → POST `/api/auth/login` lalu refresh state; `logout()` → POST `/api/auth/logout` lalu state guest + redirect `/login`. Export `AuthProvider` + `useAuth()`.
2. `layout.tsx`: bungkus `AppShell` dengan `AuthProvider` (di dalam `AppModeProvider`).
3. `login/page.tsx`: satu kolom "Kode Akses" + tombol Masuk; bila `authed` redirect ke `/dashboard` (atau `?from=`); error Indonesia; styling selaras tema (ungu/pink neon). Jika `isProductionHolding` aktif, tetap tampilkan `ProductionLanding` (ikuti pola halaman lain).
4. `Navbar.tsx`: bila authed tampilkan badge peran — Panpel `🛡️ Panpel (aspN)` ungu, MojiSport `📺 MojiSport (mojisportN)` biru toska, Peserta `🏐 Peserta (userN)` hijau — plus tombol **Keluar** (panggil `logout`). Bila guest, sembunyikan nav links & tombol aksi (atau tampilkan tombol "Masuk").
5. Acceptance: login 3 peran → badge benar; refresh → tetap login; Keluar → ke `/login`.

### T5 · Guard API per peran — ⏳ BELUM (pekerjaan terbesar)

File: `src/app/api/teams/route.ts`, `src/app/api/teams/[id]/route.ts`, `src/app/api/teams/[id]/members/route.ts`, `src/app/api/teams/[id]/owner/route.ts` (baru, atau alternatif sisipkan di PUT `[id]`), `src/app/api/quota/route.ts`, `src/app/api/upload/route.ts`, `src/app/api/seed/route.ts`, `src/app/api/auth/codes/route.ts` (baru), `src/lib/auth.ts` (hapus shim), `src/lib/db.ts` (R2.1–R2.3 bila belum).

Pola umum setiap route: bungkus handler dengan try/catch `AuthError` → `NextResponse.json({success:false, error: err.message}, {status: err.status})`.

Langkah per endpoint:
1. `GET /api/teams`: wajib sesi (semua peran). Query `region`/`category` tetap. (Scope Peserta TIDAK di sini — Peserta boleh lihat semua tim; scope hanya untuk Report 2 di T9 dan edit di bawah.)
2. `POST /api/teams`: **Panpel saja** (keputusan no. 3). Tolak Mojisport/Peserta dengan 403. Hapus sifat publik.
3. `GET /api/teams/[id]`: wajib sesi (semua peran).
4. `PUT /api/teams/[id]`:
   - Wajib sesi. Ambil tim dulu (404 bila tidak ada).
   - Bila body hanya `{status:'Lengkap'}` dari status `Draft` (finalisasi): Panpel ATAU Peserta pemilik.
   - Bila `{status:'Terverifikasi'}` atau batal verifikasi: **Panpel saja** (cek kuota tetap di `db.updateTeam`).
   - Field lain (nama/wilayah/kontak): **Panpel saja**.
   - `{ownerCode}`: **Panpel saja**, validasi unik (cek semua tim; tolak bila kode sudah dipakai tim lain kecuali tim yang sama).
5. `DELETE /api/teams/[id]`: **Panpel saja**.
6. `PUT /api/teams/[id]/members`: wajib sesi. Panpel → semua. Peserta → hanya bila `findTeamOwner(teamId) === actor.ownerCode` DAN `team.status === 'Draft'` (baca status fresh dari DB). Mojisport → 403. Hapus aturan lama "non-admin boleh bila Draft" (kini harus pemilik).
7. `GET /api/quota`: wajib sesi (semua peran).
8. `POST /api/upload`: wajib sesi; tolak Mojisport (403). Peserta & Panpel boleh. (Konteks tim divalidasi saat save member, bukan saat upload — didokumentasikan.)
9. `DELETE /api/upload`: Panpel ATAU delete-token valid (tetap). Ganti secret HMAC `ADMIN_SECRET_KEY` → `getSessionSecret()` dari `accessCodes.ts`. Hapus impor `verifyAdminKey`.
10. `POST /api/seed`: ganti `verifyAdminKey` → `requireActor(request, ['panpel'])`. Tetap blokir production.
11. `GET /api/auth/codes` (baru): Panpel saja. Kembalikan `{success:true, codes:[{code, role, usedByTeamId|null, usedByTeamName|null}]}` (baca semua tim sekali, petakan `owner_code`).
12. Hapus shim `verifyAdminKey` dari `src/lib/auth.ts`. Hapus semua referensi `ADMIN_SECRET_KEY` di `src/` (verifikasi via grep). Tambah `ACCESS_SESSION_SECRET` ke `.env.example` (atau T11).
13. Acceptance: matriks uji §6.6 untuk tiap endpoint × 3 peran + guest (401/403/200). Lihat T12.

### T6 · Gerbang Middleware — ⏳ BELUM

File: `src/proxy.ts`, `src/components/AppShell.tsx`. (Opsional: `AppModeContext.tsx` bila perlu.)

Langkah:
1. `src/proxy.ts`: impor `verifySessionToken`, `SESSION_COOKIE` dari `@/lib/session` (aman — Node runtime, tanpa `next/server` di lib).
   - Pertahankan logika holding mode yang ada.
   - Bila holding tidak aktif: baca cookie sesi. Bila tidak valid:
     - path `/api/*` (kecuali `/api/auth/login`, `/api/auth/session`, dan aset) → `NextResponse.json({success:false, error:'Autentikasi diperlukan.'}, {status:401})`.
     - halaman (kecuali `/login`, `/production`) → `NextResponse.redirect(new URL('/login?from='+pathname, request.url))`.
   - Bila valid → `NextResponse.next()`.
   - JANGAN blokir `_next/static`, `_next/image`, `favicon.ico`, file statis (matcher existing sudah benar).
2. `AppShell.tsx`: tambah guard klien sebagai lapis kedua — bila bukan holding/production dan sesi guest (dari `useAuth`) dan pathname bukan `/login` → `router.replace('/login')`.
3. Acceptance: tanpa cookie → `/dashboard` redirect `/login`, `/api/teams` 401; dengan cookie → lolos.

### T7 · Gating Dashboard — ⏳ BELUM

File: `src/app/dashboard/page.tsx`.

Langkah:
1. Hapus `getAdminKey` + seluruh `sessionStorage lvm_admin_key` + `prompt()` PIN. Gunakan `useAuth()`.
2. Tombol **Hapus**: render hanya bila `role==='panpel'`; header `x-admin-key` dihapus (cookie otomatis terkirim).
3. Tombol **Daftar Tim Baru** (hero + navbar konteks): hanya Panpel.
4. Link **Roster**: tampil untuk semua; pembatasan edit ada di halaman roster (T8). Untuk Mojisport & Peserta non-pemilik, pertimbangkan label "Lihat" (opsional).
5. Tambah UI assign owner (Panpel): dropdown di tiap baris tim berisi 36 kode + status pakai (fetch `/api/auth/codes`); simpan via `PUT /api/teams/[id]` `{ownerCode}`. (Alternatif penempatan: halaman detail tim — pilih SATU tempat, jangan dua.)
6. Error 401/403 dari API → tampilkan alert Indonesia; 401 → `logout()` + redirect login.
7. Acceptance: tiap peran melihat tombol sesuai matriks.

### T8 · Gating Team Detail + Roster — ⏳ BELUM

File: `src/app/teams/[id]/page.tsx`, `src/app/teams/[id]/roster/page.tsx`.

Langkah:
1. Hapus `getAdminKey`/`isPanitiaMode`/toggle Mode Panitia/banner terkait di kedua file. Gunakan `useAuth()`.
2. Definisikan helper lokal (atau `src/lib/permissions.ts` bila ingin dipakai ulang):
   `canEditTeam(actor, team) = actor.role==='panpel' || (actor.role==='peserta' && team.ownerCode !== '' && team.ownerCode === actor.ownerCode && team.status === 'Draft')`
   `canVerify = actor.role === 'panpel'`
   `isReadOnlyViewer = actor.role === 'mojisport' || (peserta && !canEditTeam(...))`
3. Detail tim: tombol **Verifikasi** hanya Panpel; link **Edit 20 Personel** disembunyikan untuk Mojisport & Peserta non-pemilik; tombol Cetak untuk semua; badge Terverifikasi untuk semua.
4. Roster: `isEditable = canEditTeam(...)`; semua `disabled={!isEditable}` tetap; banner disesuaikan peran (Draft milik sendiri → ajakan isi; terkunci → pesan hubungi Panpel; Mojisport → mode lihat). HAPUS banner/toggle "Mode Panitia" lama. Header `x-admin-key` dihapus dari fetch (cookie otomatis).
5. Finalisasi (`handleFinalizeSubmission`): boleh Panpel atau Peserta pemilik; pesan konfirmasi tetap.
6. Acceptance: Peserta tim A membuka roster tim B → read-only penuh; Mojisport → read-only di mana pun; Panpel → penuh.

### T9 · Gating Reports & Export — ⏳ BELUM

File: `src/app/reports/page.tsx`, `src/lib/exportExcel.ts` (kemungkinan tanpa ubah).

Langkah:
1. Gunakan `useAuth()` + `team.ownerCode`.
2. Peserta: scope `filteredTeams` ke tim dengan `ownerCode === actor.ownerCode` (satu tim). Sembunyikan tombol **Excel**, dropdown region/kategori/status (atau disable), dan filter tim. Report 1/2/3 + ID Card + PDF hanya menampilkan tim sendiri.
3. Mojisport & Panpel: semua tab + filter + Excel + PDF seperti sekarang.
4. Pastikan data untuk ekspor Peserta tidak pernah memuat tim lain (scope di hulu `filteredTeams` menjalar ke semua memo turunan).
5. Acceptance: login `userN` → hanya 1 tim di semua tab; tidak ada tombol Excel; Mojisport → semua tim + Excel, tanpa tombol mutasi (tidak ada di halaman ini).

### T10 · Form Pendaftaran hanya Panpel — ⏳ BELUM

File: `src/app/page.tsx` (formulir), `src/app/register/page.tsx` (re-export), `src/components/Navbar.tsx` (tombol Daftar — koordinasi dengan T4/T7 agar satu keputusan).

Langkah:
1. Bila `role !== 'panpel'`: jangan render form; tampilkan panel informasi ("Pendaftaran tim dilakukan oleh Panpel. Peserta mengelola tim yang di-assign.") + link ke dashboard.
2. LocalStorage draft (`lvm_team_register_draft`) hanya dipakai Panpel.
3. `POST /api/teams` sudah dikunci di T5 (lapis server).
4. Acceptance: Peserta/Mojisport membuka `/` → tidak ada form; Panpel → form normal.

### T11 · Konfigurasi & Dokumentasi — ⏳ BELUM

File: `.env.example`, `README.md`, `docs/07_ROLE_BASED_PERMISSIONS_RBP.md`, baru: `docs/09_DAFTAR_46_KODE_AKSES.md`.

Langkah:
1. `.env.example`: tambah `ACCESS_SESSION_SECRET` (wajib di production, opsional dev); HAPUS `ADMIN_SECRET_KEY`; tambah `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (sinkronkan dengan `.env.local` aktual); dokumentasikan `NEXT_PUBLIC_PRODUCTION_MODE`.
2. `README.md`: perbarui bagian Fitur (gatekeeper 46 kode, peran), Setup (langkah DDL `owner_code`, seed 20 tim, env baru), dan hapus klaim "Data Demo" bila sudah diganti seed nyata.
3. `docs/07...`: tambahkan catatan status implementasi + koreksi 35→36 + keputusan no. 3–6 (atau seluruh §2 dokumen ini).
4. Buat `docs/09_DAFTAR_46_KODE_AKSES.md`: tabel 46 kode + kolom assignment untuk Panpel.
5. Acceptance: `.env.example` tanpa `ADMIN_SECRET_KEY`; README akurat.

### T12 · Verifikasi & QA — ⏳ BELUM (prosedur)

1. `npx tsc --noEmit` → 0 error. `npm run lint` → bersih.
2. `grep -rn "ADMIN_SECRET_KEY\|verifyAdminKey\|lvm_admin_key\|x-admin-key\|isPanitiaMode\|getAdminKey" src/ scripts/` → nol hasil.
3. Nyalakan dev server; jalankan matriks curl §6.6 (guest 401/redirect; tiap peran × tiap endpoint).
4. Seed di Supabase dev (setelah DDL §10.1): `POST /api/seed {"force":true}` → 20 tim × 20 slot, nomor urut benar.
5. Uji browser: login 3 peran, badge Navbar, assign owner, edit roster pemilik vs non-pemilik, Report 2 peserta, tombol Excel, logout.

---

## 9. Urutan Eksekusi & Paralelisasi

```
Gelombang 1:  T1 ‖ T2            (fondasi; file disjoint)
Gelombang 2:  T3 ‖ T4 ‖ T5       (setelah T1+T2; butuh kontrak §6 beku)
Gelombang 3:  T6 ‖ T7 ‖ T8 ‖ T9 ‖ T10   (setelah T1,T2,T4,T5)
Gelombang 4:  T11 ‖ T12
```

Aturan paralel: dua task boleh jalan bersamaan hanya bila himpunan file-nya disjoint (lihat daftar file tiap task di §8).

---

## 10. Runbook Operasional Manual

### 10.1 DDL `owner_code` (wajib, oleh manusia via Supabase SQL Editor)

```sql
alter table public.teams
  add column if not exists owner_code text not null default '';

create unique index if not exists teams_owner_code_unique
  on public.teams (owner_code)
  where owner_code <> '';
```

Verifikasi: `select column_name from information_schema.columns where table_name='teams';` harus memuat `owner_code`.

### 10.2 Seed 20 tim nyata

1. Pastikan §10.1 sudah jalan (tanpa kolom, seed gagal).
2. Pastikan `NODE_ENV` bukan production dan login Panpel (`POST /api/auth/login {"code":"asp1"}`, simpan cookie).
3. `POST /api/seed` dengan body `{"force": true}` — **menghapus seluruh data lama** lalu mengisi 20 tim.
4. Verifikasi: `GET /api/teams` → 20 tim; tiap tim 20 anggota; nomor `LVM-TGH-PA-01…05`, `LVM-TGH-PI-01…04`, `LVM-TMR-PA-01…05`, `LVM-TMR-PI-01…06`.

### 10.3 Assign pemilik (Opsi B, oleh Panpel via UI)

Dashboard → kolom **Pemilik** → pilih `userN` → Simpan. Satu kode satu tim (ditolak bila dipakai tim lain). `''` = lepas.

### 10.4 Env production

Wajib set `ACCESS_SESSION_SECRET` (string acak ≥32 karakter). Tanpa ini, login di production melempar error dan semua sesi ditolak.

---

## 11. Daftar 46 Kode Akses

Lihat `docs/09_DAFTAR_46_KODE_AKSES.md` (siap cetak/dibagikan). Ringkasnya:

- Panpel: `asp1`, `asp2`, `asp3`, `asp4`, `asp5`
- MojiSport: `mojisport1`, `mojisport2`, `mojisport3`, `mojisport4`, `mojisport5`
- Peserta: `user1` … `user36`

**Total 46 kode.** Tidak ada kredensial lain.

---

## 12. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| DDL belum dijalankan → insert/update `owner_code` gagal | Runbook §10.1; `mapTeamRow` memakai `?? ''` sehingga baca tetap aman |
| Seed `force` menghapus data lama | Backup dulu (export Excel / snapshot Supabase); seed hanya non-production |
| `ADMIN_SECRET_KEY` dihapus total → delete-token upload lama invalid | Token diterbitkan ulang otomatis saat upload baru; secret kini `ACCESS_SESSION_SECRET` |
| Kode sederhana mudah ditebak | Rate-limit login 10/menit/IP + `timingSafeEqual`; risiko diterima user |
| Session fixation / cookie dicuri | HttpOnly + SameSite=Lax + Secure (prod) + HMAC; TTL 7 hari sesuai spec |
| `.env.example` tidak sinkron | Diperbaiki di T11 (Supabase + secret baru terdokumentasi) |
| Test scripts mengasumsikan 6 tim demo | Disesuaikan di T12 |

---

## 13. Definition of Done

- [ ] `tsc` 0 error, `lint` bersih.
- [ ] Grep sisa auth lama nol hasil.
- [ ] Matriks curl §6.6 lolos semua (tabel QA T12).
- [ ] Seed menghasilkan 20 tim × 20 slot di database tujuan.
- [ ] 20 tim ter-assign ke `userN` oleh Panpel (kolom docs/09 terisi).
- [ ] Browser test 3 peran lolos (badge, tombol, Report 2, Excel, logout).
- [ ] Dokumen 07/08/09 final; `.env.example` akurat; commit di `main`.

---

## 14. Status Akhir Implementasi (11 September 2026)

> **Update 12 September 2026 (pagi):** DDL §10.1 + tabel `access_accounts` §15.2 **sudah diterapkan langsung ke Supabase project `lvm` via Management API** (token MCP `supabase-fph`). Terverifikasi: kolom `teams.owner_code` ada, tabel `access_accounts` 9 kolom ada, index `teams_owner_code_unique` ada, data utuh (4 tim, 80 anggota, 0 akun). Langkah manual SQL Editor **tidak lagi diperlukan**.

- T1–T10: **kode selesai**, `tsc` 0 error, `lint` bersih, sisa auth lama nol.
- T11: **selesai** (env, README, docs/07 status, docs/09).
- T12: QA runtime lolos 17 cek (login 3 peran + case-insensitive, gate guest 401/redirect `/login?from=`, matriks 403, `/api/auth/codes` = 46 kode, logout, halaman `/login`, data existing utuh 4 tim × 20 slot).
- **TERTUNDA (butuh manusia)**: DDL §10.1 di Supabase SQL Editor → seed `force` §10.2 → assign 20 tim §10.3.
- Seluruh pekerjaan di-commit di `main` (lihat riwayat git).

---

## 15. Adendum: Kode Acak per Nama Kampus via Tabel Database (12 September 2026)

> **Latar:** user meminta kode tidak lagi berpola tebakan (`asp1`, `user1`) melainkan acak 7 karakter (contoh `A3FO7VU`, `U74IO98`), tidak hardcoded, label memakai **nama kampus**, Panpel **bisa melihat** kode, dan alur terintegrasi: **Panpel tambah tim → kode otomatis tergenerate**. Keputusan dikunci di chat 11–12/9/2026.

### 15.1 Keputusan terkunci adendum

1. Format kode: 7 karakter, alfabet 32 simbol tanpa ambigu (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), via `crypto.randomBytes`, cek duplikat ke DB.
2. Penyimpanan: tabel `access_accounts` (Opsi B). Kode disimpan **terenkripsi AES-256-GCM** (kunci `ACCESS_CODE_KEY` env-only) agar Panpel bisa melihat; lookup login memakai `code_hash` sha256.
3. Label = nama kampus saja (`UNESA Surabaya`), tanpa suffix kategori. `id` slug tetap unik (suffix kategori di id bila tabrakan: `unesa-surabaya-putri`); id boleh terlihat di API/DB, yang rahasia hanya kodenya.
4. `teams.owner_code` menyimpan **id akun** (stabil walau kode diregenerate).
5. Tidak ada kode cadangan menganggur: kode lahir bersama tim (seed/bootstrap atau tambah tim).
6. Kode lama (`asp1`, `user1`…) dan cookie lama **mati seketika** via session `v: 2`.
7. `docs/09` dibersihkan dari kode plaintext (label + status ikatan saja); lembar kode hanya file terpisah di luar git.

### 15.2 Skema `access_accounts`

```sql
create table if not exists public.access_accounts (
  id          text primary key,
  code_hash   text not null unique,
  code_enc    text not null,
  role        text not null check (role in ('panpel','mojisport','peserta')),
  label       text not null,
  team_id     text references public.teams(id) on delete set null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- + trigger touch_updated_at + RLS enable tanpa policy (pola sama: service-role only)
```

Masuk `supabase/schema.sql` (idempotent); satu run SQL Editor mencakup ini + DDL `owner_code` §10.1 yang tertunda. Env baru: `ACCESS_CODE_KEY` (32 byte), `BOOTSTRAP_SECRET` (proteksi bootstrap, dihapus setelah dipakai).

### 15.3 Task T13–T19 (rinci)

**T13 · Skema + env.** Tulis tabel §15.2 ke `supabase/schema.sql`; tambah `ACCESS_CODE_KEY` + `BOOTSTRAP_SECRET` ke `.env.example`; dokumentasikan di runbook. Acceptance: file SQL valid, instruksi run satu langkah.

**T14 · Modul akun + auth async.** Baru `src/lib/accounts.ts`; tambah method ke interface `DataBackend` + implementasi `pgBackend` & `supabaseBackend` (`findAccountByHash`, `listAccounts`, `createAccounts`, `setRevoked`, `rotateHash`). Hapus total daftar hardcoded di `accessCodes.ts`; `resolveAccessCode` jadi async (trim+uppercase → sha256 → lookup `revoked=false` → `Actor{role, subject: label, ownerCode: id}`). Session payload `v: 2`, tolak versi lama. `getActorFromRequest` async + cek revoke per request; proxy tetap cek cepat HMAC+versi. Acceptance: `tsc` bersih, kode lama ditolak, sesi lama invalid.

**T15 · Bootstrap satu tembakan** (`POST /api/admin/bootstrap`, baru). Guard: secret env (`timingSafeEqual`) + rate-limit ketat + tolak bila akun sudah ada (kecuali `force:true`). Generate 30 kode (5+5+20, cek duplikat) → insert akun (label nama kampus) → buat 20 tim via `buildDemoTeams` → ikat otomatis. Response plaintext sekali tampil `{accounts, assignments}`; tidak di-commit. Acceptance: DB kosong → 30 akun + 20 tim + 20 ikatan dalam satu panggilan.

**T16 · Auto-generate saat Panpel tambah tim.** Hook di `POST /api/teams` (panpel-only): selesai `createTeam` → generate kode + akun + ikat → kembalikan kode di response → form `/` tampilkan modal sekali-tampil (salin & bagikan). Acceptance: tambah tim → kode muncul sekali, tersimpan terenkripsi.

**T17 · Panel kode di dashboard.** Ubah kolom Pemilik (`dashboard/page.tsx` baris 183–205, 461–690): label kampus + tombol Lihat kode (masked + reveal, panpel-only), Generate ulang (id & ikatan tetap), Cabut akses. `GET /api/auth/codes` naik fungsi (dekripsi + label + ikatan). Acceptance: matriks peran tiap aksi (peserta/mojisport 403).

**T18 · UI + dokumen.** Login tak berubah (satu kolom); badge Navbar tampilkan label kampus; `docs/09` tanpa kode; adendum `docs/08` (bagian ini); runbook bootstrap + distribusi + penghapusan `BOOTSTRAP_SECRET`.

**T19 · QA skema baru.** Bootstrap bersih; login tiap peran; kode lama ditolak; revoke memutus akses; regenerate tak memutus ikatan; kode terlihat hanya oleh panpel; `tsc` + `lint` bersih; lalu DDL + seed + assign betulan.

### 15.4 Gelombang eksekusi adendum

```
Gelombang A:  T13 ‖ T14   (skema di file SQL vs kode; disjoint)
Gelombang B:  T15 ‖ T16   (setelah T14; bootstrap vs hook create — file beda)
Gelombang C:  T17 ‖ T18   (setelah T14–T16)
Gelombang D:  T19
```

### 15.5 Risiko tambahan adendum

| Risiko | Mitigasi |
|---|---|
| Bocor DB saja → kode aman (terenkripsi); bocor DB + env → kode terbaca | Diterima eksplisit (syarat fitur "dilihat admin"); kunci tidak di git |
| Kode tampil sekali hilang sebelum disalin | Regenerate oleh Panpel kapan pun (ikatan tim tetap) |
| Slug id tabrakan | Suffix kategori/nomor otomatis + unique constraint DB |
| Cookie lama masih valid kriptografis | Ditolak via `v: 2` |
| Akun direvoke tapi sesi masih hidup | Cek revoke async per request terproteksi; proxy tetap cepat |

---

## 16. Status Adendum §15

### 16.1 Status T13–T18 (12 September 2026)

| Task | Status | Keterangan |
|---|---|---|
| T13 · Skema + env | Selesai | Tabel `access_accounts` di `supabase/schema.sql`; `ACCESS_CODE_KEY` + `BOOTSTRAP_SECRET` di `.env.example`; lihat laporan gelombang |
| T14 · Modul akun + auth async | Selesai | `src/lib/accounts.ts`, backend `findAccountByHash`/`listAccounts`/`createAccounts`/`setRevoked`/`rotateHash`, `resolveAccessCode` async, sesi `v: 2`; lihat laporan gelombang |
| T15 · Bootstrap satu tembakan | Selesai | `POST /api/admin/bootstrap` (30 kode: 5 Panpel + 5 MojiSport + 20 peserta, ikat otomatis); lihat laporan gelombang |
| T16 · Auto-generate saat Panpel tambah tim | Selesai | Hook `POST /api/teams` + modal sekali-tampil di form `/`; lihat laporan gelombang |
| T17 · Panel kode di dashboard | Selesai | Label kampus + Lihat kode + generate ulang + cabut akses; `GET /api/auth/codes` panpel-only; lihat laporan gelombang |
| T18 · UI label + dokumen (task ini) | Selesai | Badge Navbar generik (tanpa ubah kode — sudah benar); `docs/09` tulis ulang tanpa plaintext; §16 ini; sapuan `README.md` + `docs/07` |

### 16.2 Runbook BARU bootstrap (menggantikan §10.2–§10.3 yang usang)

> §10.1 tetap berlaku untuk `owner_code`, tetapi DDL kini mencakup tabel
> `access_accounts` (satu run, langkah 1 di bawah). Langkah seed lama §10.2
> (login Panpel + `POST /api/seed`) dan assign manual §10.3 (pilih `userN` di
> dashboard) **usang dan digantikan** langkah 2–5 di bawah: bootstrap membuat
> akun + tim + ikatan sekaligus, dan kode peserta tidak lagi dipilih dari daftar
> tetap melainkan lahir acak bersama tim.

**Langkah 1 — DDL satu run (manusia via Supabase SQL Editor).**

Jalankan seluruh isi `supabase/schema.sql` terbaru. Isinya mencakup:

- `ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS owner_code ...` + unique
  partial index (§10.1 — menutup DDL yang tertunda);
- `CREATE TABLE IF NOT EXISTS public.access_accounts (...)` + trigger
  `touch_updated_at` + RLS enable tanpa policy (service-role only) — lihat §15.2.

Verifikasi:

```sql
select column_name from information_schema.columns where table_name = 'teams';
-- harus memuat owner_code
select table_name from information_schema.tables where table_name = 'access_accounts';
-- harus 1 baris
```

**Langkah 2 — Set secret sementara.**

Di environment server (bukan di repo), set:

- `ACCESS_CODE_KEY` (kunci enkripsi 32 byte, tetap dipakai seterusnya),
- `ACCESS_SESSION_SECRET` (secret sesi, tetap dipakai seterusnya),
- `BOOTSTRAP_SECRET` (proteksi bootstrap, **sementara — dihapus langkah 5**).

**Langkah 3 — Panggil bootstrap (satu tembakan).**

```bash
curl -X POST "$APP_URL/api/admin/bootstrap" \
  -H 'Content-Type: application/json' \
  -d "{\"secret\": \"$BOOTSTRAP_SECRET\"}" \
  -o bootstrap-output.json
```

(Nilai asli tidak pernah ditulis di dokumen/repo — `$BOOTSTRAP_SECRET` dibaca
dari environment operator.) Response berisi `{accounts, assignments}` dengan
**seluruh kode plaintext sekali-tampil**: 5 Panpel + 5 MojiSport + 20 peserta
terikat ke 20 tim.

**Langkah 4 — Simpan output offline.**

Pindahkan `bootstrap-output.json` ke media offline (di luar repo), dan salin
kolom Kode tabel `docs/09_DAFTAR_46_KODE_AKSES.md` §2 ke **salinan cetak** (bukan
commit). Verifikasi cepat: login satu kode tiap peran; `GET /api/auth/codes`
sebagai Panpel menampilkan 30 akun + ikatan.

**Langkah 5 — Hapus `BOOTSTRAP_SECRET`.**

Hapus variabel `BOOTSTRAP_SECRET` dari environment server dan restart aplikasi.
Bootstrap yang terpanggil setelahnya harus gagal (secret tidak dikenal).

**Langkah 6 — Distribusi kode.**

Bagikan tiap kode peserta ke manajer kampus terkait + 10 kode peran ke
pemegangnya melalui jalur offline. Kode hilang → Panpel generate ulang dari
dashboard (ikatan tim tetap; lihat laporan T17).