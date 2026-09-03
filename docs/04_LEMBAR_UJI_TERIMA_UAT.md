# LEMBAR UJI TERIMA PENGGUNA (UAT)
## USER ACCEPTANCE TESTING - LIGA VOLLEY MAHASISWA (LVM)
**Tanggal Pengujian:** ____________________  
**Lokasi Pengujian:** Sekretariat Panitia Pelaksana LVM / Online  
**Versi Aplikasi:** 1.0 (Next.js Stable)  

---

### 1. DATA PENGUJI (TESTER / PANITIA)
- **Nama Penguji 1:** __________________________________ (Ketua Panitia / Penanggung Jawab)
- **Nama Penguji 2:** __________________________________ (Koordinator Pertandingan / IT)
- **Nama Penguji 3:** __________________________________ (Perwakilan Manajer Tim)
- **Vendor Pendamping:** __________________________________ (Lead Developer)

---

### 2. MATRIKS SKENARIO PENGUJIAN

| No | Modul / Fitur yang Diuji | Skenario Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
|:--:| :--- | :--- | :--- | :---: | :--- |
| **1** | **Pendaftaran Tim Baru** | Mengisi nama tim, provinsi DKI Jakarta, kategori Putra. | Tim berhasil dibuat dengan nomor otomatis `LVM-BRT-PA-XX` dan terhubung ke Regional Barat. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **2** | **Validasi Kuota 6 Tim** | Mendaftarkan tim ke-7 pada regional & kategori yang sama. | Sistem menolak pendaftaran dan memunculkan peringatan kuota penuh (6 Tim). | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **3** | **Navigasi 20 Slot Roster** | Membuka editor roster di laptop dan HP. | Pada desktop tampil 20 slot di sidebar; pada HP tampil carousel horizontal 1-20 yang praktis. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **4** | **Input 15 Pemain** | Mengisi NIM, Fakultas, Jurusan, TB/BB, Posisi Main. | Data tersimpan dengan benar pada masing-masing slot pemain. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **5** | **Validasi Duplikasi Jersey** | Memasukkan nomor jersey yang sama pada dua pemain berbeda dalam satu tim. | Sistem menolak dan menampilkan pesan error duplikasi nomor punggung. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **6** | **Input 5 Official** | Mengisi 1 Manager, 1 Head Coach, 2 Asisten, 1 Utility. | Sistem mengunci komposisi jabatan official sesuai regulasi kejuaraan. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **7** | **Upload Foto Jersey** | Mengunggah foto berformat JPG/PNG untuk pemain. | Foto berhasil tampil pada preview slot, lembar tim, dan ID Card. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **8** | **REPORT 1 (Roster Fisik)** | Membuka tab Report 1 dan memfilter tim/regional. | Tabel menampilkan No Jersey, Nama, Posisi, TB, BB, Fakultas, dan Foto Jersey. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **9** | **REPORT 2 (Data Akademik)** | Membuka tab Report 2 dan memeriksa kolom NIM & Jurusan. | Menampilkan No Urut Daftar, Nama, NIM, Fakultas, Jurusan, Angkatan. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **10** | **REPORT 3 (Rekap Regional)** | Memeriksa rekapitulasi tim 3 regional. | Menampilkan rekapitulasi tim per regional beserta status kelengkapan roster (20/20). | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **11** | **Export Excel (.xlsx)** | Mengklik tombol "Export Excel" pada modul laporan. | File `.xlsx` terunduh dan data rapi saat dibuka di Microsoft Excel. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **12** | **Cetak Dokumen PDF** | Menekan tombol "Cetak Laporan (PDF)" atau Cetak Lembar Tim. | Tampilan cetak rapi dalam kertas A4 tanpa header browser yang mengganggu dan terdapat kolom tanda tangan. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **13** | **Fitur Light & Dark Mode** | Mengklik tombol switch tema (Matahari / Bulan). | Tema antarmuka berganti secara mulus antara mode terang dan gelap. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |
| **14** | **Responsivitas Layar HP** | Mengakses aplikasi melalui browser smartphone. | Seluruh form, tabel kartu, dan tombol dapat dioperasikan dengan mudah via layar sentuh. | [ &nbsp; ] PASS<br>[ &nbsp; ] FAIL | |

---

### 3. KESIMPULAN HASIL PENGUJIAN

Berdasarkan hasil pengujian di atas, Panitia Pelaksana menyatakan bahwa:
- [ &nbsp; ] **DITERIMA TANPA CATATAN** : Sistem telah memenuhi 100% spesifikasi kebutuhan dan siap digunakan (*Go-Live*).
- [ &nbsp; ] **DITERIMA DENGAN CATATAN MINOR** : Sistem dapat digunakan dengan perbaikan kecil yang tidak menghambat operasional pendaftaran.
- [ &nbsp; ] **DITOLAK / PERLU PERBAIKAN MAYOR** : Sistem membutuhkan perbaikan fungsi mendasar sebelum dapat diserahkan.

**Catatan Tambahan Penguji:**  
_________________________________________________________________________________  
_________________________________________________________________________________  

---

<br>

| PERWAKILAN PENGUJI / PANITIA | PERWAKILAN VENDOR / IT |
| :---: | :---: |
| <br><br><br> | <br><br><br> |
| **( _________________________________ )** | **( _________________________________ )** |
| Koordinator UAT Panitia LVM | Lead Developer Vendor |
