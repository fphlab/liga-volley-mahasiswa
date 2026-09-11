# DAFTAR 46 KODE AKSES PORTAL LVM
## Liga Voli Mahasiswa Nasional — `ligavolimahasiswa.org`

> Cara pakai: buka halaman `/login`, ketik **satu kode** di kolom "Kode Akses", tekan Masuk.
> Sesi berlaku **7 hari** per perangkat. Tombol **Keluar** ada di navbar (samping badge peran).
> Kode bersifat rahasia per pemegang — jangan disebar. Spesifikasi hak akses: `docs/07_ROLE_BASED_PERMISSIONS_RBP.md`.
> Rencana implementasi: `docs/08_RENCANA_IMPLEMENTASI_RBP.md`.

---

## 1. Panpel — Panitia Pelaksana (5 kode, admin penuh)

Wewenang: melihat semua, membuat tim, assign/lepas pemilik tim, edit semua roster, upload foto semua tim, verifikasi/batal verifikasi, hapus tim, export Excel, cetak PDF, seed (non-production).

| # | Kode | Keterangan |
|---|---|---|
| 1 | `asp1` | Panpel 1 |
| 2 | `asp2` | Panpel 2 |
| 3 | `asp3` | Panpel 3 |
| 4 | `asp4` | Panpel 4 |
| 5 | `asp5` | Panpel 5 |

---

## 2. MojiSport — Broadcaster & Media Partner (5 kode, read-only)

Wewenang: melihat semua tim & laporan (termasuk Report 2 akademik), export Excel, cetak PDF. **Tidak ada** tombol simpan/edit/hapus/verifikasi/buat tim.

| # | Kode | Keterangan |
|---|---|---|
| 1 | `mojisport1` | MojiSport 1 |
| 2 | `mojisport2` | MojiSport 2 |
| 3 | `mojisport3` | MojiSport 3 |
| 4 | `mojisport4` | MojiSport 4 |
| 5 | `mojisport5` | MojiSport 5 |

---

## 3. Peserta — Manajer Tim Kampus (36 kode, hanya tim sendiri)

Wewenang: mengisi & mengedit roster **tim yang di-assign Panpel** (terkunci otomatis setelah Terverifikasi), upload foto tim sendiri, melihat daftar semua tim, Report 1/3 + ID Card semua tim, Report 2 **hanya tim sendiri**, cetak PDF. **Tidak bisa**: membuat tim, melihat Report 2 tim lain, export Excel, hapus/verifikasi.

> **Alur assignment (Opsi B):** Panpel login → Dashboard → kolom **Pemilik** di tiap tim → pilih kode → Simpan. Satu kode hanya untuk satu tim.

| # | Kode | Tim yang di-assign (diisi Panpel) |
|---|---|---|
| 1 | `user1` | |
| 2 | `user2` | |
| 3 | `user3` | |
| 4 | `user4` | |
| 5 | `user5` | |
| 6 | `user6` | |
| 7 | `user7` | |
| 8 | `user8` | |
| 9 | `user9` | |
| 10 | `user10` | |
| 11 | `user11` | |
| 12 | `user12` | |
| 13 | `user13` | |
| 14 | `user14` | |
| 15 | `user15` | |
| 16 | `user16` | |
| 17 | `user17` | |
| 18 | `user18` | |
| 19 | `user19` | |
| 20 | `user20` | |
| 21 | `user21` | |
| 22 | `user22` | |
| 23 | `user23` | |
| 24 | `user24` | |
| 25 | `user25` | |
| 26 | `user26` | |
| 27 | `user27` | |
| 28 | `user28` | |
| 29 | `user29` | |
| 30 | `user30` | |
| 31 | `user31` | |
| 32 | `user32` | |
| 33 | `user33` | |
| 34 | `user34` | |
| 35 | `user35` | |
| 36 | `user36` | |

**Total: 46 kode** (5 + 5 + 36).
