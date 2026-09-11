# DAFTAR KODE AKSES PORTAL LVM
## Liga Voli Mahasiswa Nasional — `ligavolimahasiswa.org`

> Cara pakai: buka halaman `/login`, ketik **satu kode** di kolom "Kode Akses", tekan Masuk.
> Sesi berlaku **7 hari** per perangkat. Tombol **Keluar** ada di navbar (samping badge peran).
> Kode bersifat rahasia per pemegang — jangan disebar. Spesifikasi hak akses: `docs/07_ROLE_BASED_PERMISSIONS_RBP.md`.
> Rencana implementasi + runbook bootstrap: `docs/08_RENCANA_IMPLEMENTASI_RBP.md` (§15–§16).

> ⚠️ **JANGAN commit kode plaintext ke git.** Dokumen ini TIDAK memuat nilai kode.
> Nilai kode hanya tampil sekali di output `POST /api/admin/bootstrap` atau di
> panel Panpel di dashboard (tombol Lihat kode), lalu disimpan/dibagikan **offline**
> (cetak / file di luar repo). File lembar kode distribusi wajib berada di luar git
> (mis. folder lokal yang tidak di-commit atau `.gitignore`).

---

## 1. Model baru: kode acak per tim (adendum §15 docs/08)

Tidak ada lagi daftar kode tetap. Setiap kode:

- dibuat acak 7 karakter saat akun/tim dibuat (seed/bootstrap atau Panpel tambah tim),
- terikat ke satu akun di tabel `access_accounts` (peran + label + ikatan tim),
- untuk peserta: label = **nama kampus** (mis. `UNESA Surabaya`), satu akun = satu tim,
- terlihat plaintext hanya oleh **Panpel** di dashboard (masked + tombol Lihat);
  peran lain tidak bisa melihat kode siapa pun.

Kode lahir bersama tim: bootstrap/seed 20 tim di bawah otomatis membuat 20 akun
peserta + mengikatnya. Tim tambahan yang dibuat Panpel setelahnya langsung mendapat
kode baru (modal sekali-tampil di form). Kode lama berpola tebakan sudah **mati
seketika** (sesi versi lama ditolak).

---

## 2. Tim peserta — 20 tim (kode diisi manual saat distribusi offline)

Wewenang peserta: mengisi & mengedit roster **tim sendiri yang terikat akunnya**
(terkunci otomatis setelah Terverifikasi), upload foto tim sendiri, melihat daftar
semua tim, Report 1/3 + ID Card semua tim, Report 2 **hanya tim sendiri**, cetak PDF.
**Tidak bisa**: membuat tim, melihat Report 2 tim lain, export Excel, hapus/verifikasi.

| # | Nama tim | Kategori | Region | Kode (diisi manual offline) |
|---|---|---|---|---|
| 1 | UNMEKA Yogyakarta | Putra | Tengah | |
| 2 | UII Yogyakarta | Putra | Tengah | |
| 3 | Universitas Semarang | Putra | Tengah | |
| 4 | UNTAG Semarang | Putra | Tengah | |
| 5 | UNJAYA Yogyakarta | Putra | Tengah | |
| 6 | UNMEKA Yogyakarta | Putri | Tengah | |
| 7 | UII Yogyakarta | Putri | Tengah | |
| 8 | Universitas Semarang | Putri | Tengah | |
| 9 | UNJAYA Yogyakarta | Putri | Tengah | |
| 10 | UNESA Surabaya | Putra | Timur | |
| 11 | Universitas Bojonegoro | Putra | Timur | |
| 12 | Universitas Negeri Malang | Putra | Timur | |
| 13 | Universitas Wiraraja | Putra | Timur | |
| 14 | STKIP PGRI Pacitan | Putra | Timur | |
| 15 | UNESA Surabaya | Putri | Timur | |
| 16 | Universitas PGRI Sumenep | Putri | Timur | |
| 17 | Universitas Negeri Malang | Putri | Timur | |
| 18 | Universitas Insan Budi Utomo | Putri | Timur | |
| 19 | UIN Tulung Agung | Putri | Timur | |
| 20 | Universitas Nusantara PGRI | Putri | Timur | |

> Sumber daftar tim: `src/lib/demoData.ts` (20 tim nyata; Regional Barat kosong).
> Label sesi peserta = nama kampus pada kolom Nama tim (tanpa suffix kategori).

---

## 3. Akun peran tetap — 5 Panpel + 5 MojiSport (kode dibagikan terpisah)

Kode akun peran juga **acak** (bukan pola berurutan) dan **tidak dicantumkan** di
dokumen ini. Nilai kode dibagikan terpisah secara offline oleh pemegang bootstrap.

| # | Label | Peran / wewenang |
|---|---|---|
| 1 | Panpel 1 | Panpel — admin penuh: semua tim, assign pemilik, verifikasi, hapus, seed (non-prod), lihat kode |
| 2 | Panpel 2 | Panpel — sama |
| 3 | Panpel 3 | Panpel — sama |
| 4 | Panpel 4 | Panpel — sama |
| 5 | Panpel 5 | Panpel — sama |
| 6 | MojiSport 1 | MojiSport — read-only semua data + laporan + Excel + PDF; tanpa tombol mutasi |
| 7 | MojiSport 2 | MojiSport — sama |
| 8 | MojiSport 3 | MojiSport — sama |
| 9 | MojiSport 4 | MojiSport — sama |
| 10 | MojiSport 5 | MojiSport — sama |

---

## 4. Alur distribusi (ringkas; detail di docs/08 §16)

1. Panpel menjalankan bootstrap (lihat runbook §16) dan **menyimpan output JSON
   sekali-tampil ke file offline** (di luar repo).
2. Panpel mengisi kolom "Kode" tabel §2 di salinan cetak/offline (bukan di git).
3. Panpel membagikan tiap kode ke manajer kampus terkait + 10 kode peran ke
   pemegangnya, lalu **menghapus `BOOTSTRAP_SECRET`** dari environment.
4. Kode hilang/rusak → Panpel generate ulang dari dashboard (ikatan tim tetap).
