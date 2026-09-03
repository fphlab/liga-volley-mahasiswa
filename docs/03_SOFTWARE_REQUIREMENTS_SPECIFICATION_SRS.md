# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## SISTEM PENDAFTARAN & PELAPORAN LIGA VOLLEY MAHASISWA (LVM)
**Versi Dokumen:** 1.0  
**Status:** Approved / Ready for Baseline  

---

### 1. PENDAHULUAN

#### 1.1 Tujuan
Dokumen ini mendefinisikan seluruh kebutuhan fungsional, non-fungsional, aturan bisnis, dan spesifikasi antarmuka dari Sistem Web Pendaftaran dan Pelaporan Liga Volley Mahasiswa Nasional.

#### 1.2 Lingkup Pengguna
1. **Manajer Tim / Official Kampus**: Mendaftarkan identitas tim, melengkapi data 20 anggota, mengunggah foto jersey resmi.
2. **Panitia / Administrator Liga**: Memantau kuota 3 regional, memverifikasi keabsahan data kemahasiswaan atlet, mengunduh laporan Excel, dan mencetak lembar verifikasi pertandingan.

---

### 2. KEBUTUHAN FUNGSIONAL (FUNCTIONAL REQUIREMENTS)

#### FR-01: Manajemen Wilayah Regional & Batasan Kuota
- **FR-01.1**: Sistem harus mengelompokkan peserta ke dalam 3 Regional resmi:
  - *Regional Barat*: DKI Jakarta, Jawa Barat, Banten.
  - *Regional Tengah*: Jawa Tengah, DI Yogyakarta.
  - *Regional Timur*: Jawa Timur, Bali.
- **FR-01.2**: Sistem harus membatasi kuota maksimal **6 Tim Putra** dan **6 Tim Putri** untuk setiap regional (Total 36 Tim).
- **FR-01.3**: Sistem harus secara otomatis memblokir pendaftaran baru jika kuota regional yang dipilih telah mencapai 6 tim.
- **FR-01.4**: Sistem harus menghasilkan Nomor Daftar Tim otomatis (contoh: `LVM-BRT-PA-01`).

#### FR-02: Manajemen Roster 20 Personel per Tim
- **FR-02.1**: Sistem wajib mengunci alokasi personel per tim tepat pada **20 orang**:
  - Slot 1 - 15: Pemain (15 Orang)
  - Slot 16: Team Manager (1 Orang)
  - Slot 17: Head Coach (1 Orang)
  - Slot 18 - 19: Assistant Pelatih (2 Orang)
  - Slot 20: Utilities (1 Orang)
- **FR-02.2**: Kolom input wajib untuk setiap personel mencakup:
  - Nomor Urut Pendaftaran
  - Nama Lengkap
  - Tanggal Lahir (YYYY-MM-DD)
  - Nomor Induk Mahasiswa (NIM)
  - Fakultas & Jurusan
  - Tahun Masuk / Angkatan
  - Posisi dalam Tim (Role)
  - Nomor Jersey (Khusus Pemain)
  - Posisi Bermain: Setter, Outside Hitter, Opposite Hitter, Middle Blocker, Libero (Khusus Pemain)
  - Tinggi Badan (cm) & Berat Badan (kg) (Khusus Pemain)
  - Upload Foto dengan Jersey Voli Resmi (Rasio 3:4)
- **FR-02.3**: Sistem wajib menolak input jika terdapat duplikasi Nomor Jersey di antara pemain dalam satu tim yang sama.
- **FR-02.4**: Sistem harus menandai status tim sebagai `Lengkap` hanya apabila seluruh 20 slot telah terisi lengkap.

#### FR-03: Modul Pelaporan (Reports) Sesuai Standar Draft
- **FR-03.1 (REPORT 1 - Roster Fisik & Posisi)**:
  - Menyajikan tabel: `NO. JERSEY` | `NAMA PEMAIN` | `POSISI` | `TINGGI` | `BERAT` | `FAKULTAS` | `FOTO`.
- **FR-03.2 (REPORT 2 - Verifikasi Data Akademik)**:
  - Menyajikan tabel: `NO. URUT DAFTAR` | `NAMA PEMAIN / PERSONEL` | `TIM / KAMPUS` | `NIM` | `FAKULTAS` | `JURUSAN` | `TAHUN MASUK`.
- **FR-03.3 (REPORT 3 - Rekapitulasi Tim & Regional)**:
  - Menyajikan tabel: `NO. URUT TEAM` | `NAMA TEAM` | `ASAL PROPINSI` | `REGIONAL` | `KATEGORI` | `KELENGKAPAN ROSTER (20)` | `STATUS`.
- **FR-03.4 (Galeri ID Card)**:
  - Menampilkan kartu identitas peserta berfoto dengan nomor jersey dan NIM untuk akreditasi lapangan.
- **FR-03.5 (Filter & Search)**:
  - Menyediakan filter instan berdasarkan: Wilayah Regional, Kategori (Putra/Putri), dan Nama Tim.

#### FR-04: Ekspor Data & Pencetakan Resmi
- **FR-04.1**: Menyediakan tombol unduh data ke format **Microsoft Excel (.xlsx)** untuk Report 1, Report 2, dan Report 3.
- **FR-04.2**: Menyediakan stylesheet cetak khusus (*@media print*) format kertas A4 siap cetak ke PDF lengkap dengan blok tanda tangan Panitia, Koordinator Regional, dan Manajer Tim.

---

### 3. KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

| Kode | Kategori | Spesifikasi |
| :--- | :--- | :--- |
| **NFR-01** | **Responsivitas** | Antarmuka adaptif untuk layar Desktop (1920x1080), Laptop (1366x768), Tablet, dan Smartphone (360px - 480px). |
| **NFR-02** | **Tema Visual** | Mendukung fitur beralih **Light Mode** dan **Dark Mode** secara instan. |
| **NFR-03** | **Performa** | Waktu muat halaman (*page load*) di bawah 1.5 detik pada koneksi internet standar. |
| **NFR-04** | **Integritas Data** | Penyimpanan lokal & awan dengan struktur JSON/SQLite yang tahan terhadap *crash* dan gangguan jaringan. |
| **NFR-05** | **Keamanan Foto** | Kompresi dan validasi tipe file gambar (hanya menerima file `.jpg`, `.png`, `.webp` maksimal 5MB). |
