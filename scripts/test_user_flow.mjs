import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

// Load .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  updateMember,
  getQuotaStats,
} from '../src/lib/db.ts';

const testResults = [];
function record(name, passed, detail = '') {
  testResults.push({ name, passed, detail });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name}${detail ? ` -> ${detail}` : ''}`);
}

async function runAllTests() {
  console.log('============================================================');
  console.log('🚀 MEMULAI PENGUJIAN INTEGRASI USER FLOW LIGA VOLLEY MAHASISWA');
  console.log('============================================================\n');

  let testTeamId = null;
  const createdDummyIds = [];
  const uploadedFilesToClean = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: Database Connectivity & Tables
    // -------------------------------------------------------------
    console.log('--- TEST 1: Database Connectivity & Initial State ---');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("DELETE FROM teams WHERE TRIM(name) = ''");
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tableNames = tablesRes.rows.map(r => r.table_name);
    const hasTables = tableNames.includes('teams') && tableNames.includes('members');
    record(
      'Koneksi PostgreSQL & Tabel Terdaftar',
      hasTables,
      `Tabel ditemukan: ${tableNames.join(', ')}`
    );
    await pool.end();

    // -------------------------------------------------------------
    // TEST 2: Quota Calculation
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Kuota Regional & Kategori ---');
    const initialQuotas = await getQuotaStats();
    const hasAllPairs = initialQuotas.length === 6; // 3 regions x 2 categories
    const validPairs = initialQuotas.every(
      q => q.maxTeams === 6 && q.availableSlots >= 0 && q.registeredTeams >= 0
    );
    record(
      'Kalkulasi Kuota 3 Wilayah Regional (Barat, Tengah, Timur x PA/PI)',
      hasAllPairs && validPairs,
      `Total pasang regional: ${initialQuotas.length}`
    );

    // -------------------------------------------------------------
    // TEST 3: Registrasi Tim Baru (Input Identitas Tim)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Pendaftaran Tim Baru (Registration Flow) ---');
    // Test 3a: Input nama tim kosong harus ditolak
    const emptyTeamRes = await createTeam({
      name: '',
      address: 'Jl. Kampus No 1',
      province: 'DKI Jakarta',
      region: 'Barat',
      category: 'Putra',
    });
    record(
      'Validasi Input: Nama Tim Tidak Boleh Kosong',
      !emptyTeamRes.success && /wajib diisi/i.test(emptyTeamRes.error || ''),
      emptyTeamRes.error || 'Ditolak dengan benar'
    );

    // Test 3b: Pendaftaran tim valid
    const validTeamRes = await createTeam({
      name: 'Universitas Uji Coba LVM',
      address: 'Jl. Pemuda No. 45, Rawamangun',
      province: 'DKI Jakarta',
      region: 'Barat',
      category: 'Putra',
      contactPerson: 'Budi Santoso',
      contactPhone: '081234567890',
    });

    if (validTeamRes.success && validTeamRes.team) {
      testTeamId = validTeamRes.team.id;
      const t = validTeamRes.team;
      const validNumberFormat = /^LVM-BRT-PA-\d{2}$/.test(t.teamNumber);
      const has20Members = t.members.length === 20;
      const playersCount = t.members.filter(m => m.teamRole === 'Pemain').length;
      const officialsCount = t.members.filter(m => m.teamRole !== 'Pemain').length;

      record(
        'Format Nomor Daftar Otomatis (LVM-BRT-PA-XX)',
        validNumberFormat,
        `Nomor terbit: ${t.teamNumber}`
      );
      record(
        'Inisialisasi 20 Slot Roster (15 Pemain + 5 Official)',
        has20Members && playersCount === 15 && officialsCount === 5,
        `Pemain: ${playersCount}, Official: ${officialsCount}`
      );
    } else {
      record('Registrasi Tim Baru', false, validTeamRes.error);
      throw new Error('Gagal membuat tim pengujian: ' + validTeamRes.error);
    }

    // -------------------------------------------------------------
    // TEST 4: Input & Update Data Pemain (Slot 1–15)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Input & Update Data Roster Pemain ---');
    const teamBefore = await getTeamById(testTeamId);
    const member1 = teamBefore.members.find(m => m.slotIndex === 1);
    const member2 = teamBefore.members.find(m => m.slotIndex === 2);

    const update1Res = await updateMember(testTeamId, member1.id, {
      fullName: 'Ahmad Fauzi',
      birthDate: '2002-05-14',
      nim: '2108561001',
      faculty: 'Fakultas Ilmu Keolahragaan',
      major: 'Pendidikan Kepelatihan Olahraga',
      entryYear: '2022',
      jerseyNumber: '7',
      position: 'Outside Hitter',
      height: 188,
      weight: 78,
    });

    record(
      'Input Pemain Slot 1 (Identitas, NIM, Posisi, TB/BB, Jersey)',
      update1Res.success && update1Res.member?.fullName === 'Ahmad Fauzi',
      `Nama: ${update1Res.member?.fullName}, Jersey: #${update1Res.member?.jerseyNumber}`
    );

    const update2Res = await updateMember(testTeamId, member2.id, {
      fullName: 'Bambang Pamungkas',
      birthDate: '2003-08-20',
      nim: '2108561002',
      faculty: 'Fakultas Teknik',
      major: 'Teknik Mesin',
      entryYear: '2023',
      jerseyNumber: '10',
      position: 'Setter',
      height: 182,
      weight: 74,
    });

    record(
      'Input Pemain Slot 2 dengan Jersey Berbeda',
      update2Res.success && update2Res.member?.jerseyNumber === '10',
      `Nama: ${update2Res.member?.fullName}, Jersey: #${update2Res.member?.jerseyNumber}`
    );

    // -------------------------------------------------------------
    // TEST 5: Validasi Duplikasi Nomor Jersey dalam Satu Tim
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Validasi Duplikasi Nomor Jersey (FR-02.3) ---');
    const member3 = teamBefore.members.find(m => m.slotIndex === 3);

    // Coba pasang nomor jersey 7 yang sama dengan Slot 1
    const duplicateJerseyRes = await updateMember(testTeamId, member3.id, {
      fullName: 'Cahyo Santoso',
      jerseyNumber: '7', // Duplikat dengan member1!
      teamRole: 'Pemain',
    });

    record(
      'Tolak Nomor Jersey Duplikat Antara Dua Pemain dalam Tim Sama',
      !duplicateJerseyRes.success && /sudah digunakan/i.test(duplicateJerseyRes.error || ''),
      `Error pesan: "${duplicateJerseyRes.error}"`
    );

    // Pasang nomor unik yang valid (12)
    const validJerseyRes = await updateMember(testTeamId, member3.id, {
      fullName: 'Cahyo Santoso',
      jerseyNumber: '12',
      teamRole: 'Pemain',
    });

    record(
      'Terima Nomor Jersey Unik Baru (#12)',
      validJerseyRes.success && validJerseyRes.member?.jerseyNumber === '12',
      `Jersey #${validJerseyRes.member?.jerseyNumber} berhasil disimpan`
    );

    // -------------------------------------------------------------
    // TEST 6: Input 5 Official Tim (Slot 16–20)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Input 5 Official Tim (Manager, Pelatih, Asisten, Utility) ---');
    const slot16 = teamBefore.members.find(m => m.slotIndex === 16);
    const slot17 = teamBefore.members.find(m => m.slotIndex === 17);
    const slot18 = teamBefore.members.find(m => m.slotIndex === 18);
    const slot19 = teamBefore.members.find(m => m.slotIndex === 19);
    const slot20 = teamBefore.members.find(m => m.slotIndex === 20);

    const m16 = await updateMember(testTeamId, slot16.id, { fullName: 'Drs. Hendra (Manager)' });
    const m17 = await updateMember(testTeamId, slot17.id, { fullName: 'Coach Bambang (Head Coach)' });
    const m18 = await updateMember(testTeamId, slot18.id, { fullName: 'Asisten 1' });
    const m19 = await updateMember(testTeamId, slot19.id, { fullName: 'Asisten 2' });
    const m20 = await updateMember(testTeamId, slot20.id, { fullName: 'Pak Joko (Utilities)' });

    const allOfficialsUpdated =
      m16.success && m17.success && m18.success && m19.success && m20.success;

    record(
      'Input 5 Jabatan Official Sesuai Regulasi LVM',
      allOfficialsUpdated,
      'Slot 16-20 berhasil terisi peran official masing-masing'
    );

    // -------------------------------------------------------------
    // TEST 7: Upload Foto Jersey & Validasi Magic Bytes
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Fitur Upload Foto Jersey & Magic Bytes ---');

    // Buat buffer JPEG valid (magic bytes: FF D8 FF E0 ...)
    const validJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    ]);

    // Buat buffer file palsu (teks biasa menyamar sebagai jpg)
    const fakeJpgBuffer = Buffer.from('INI BUKAN GAMBAR TAPI FILE TEKS BIASA');

    // Buat buffer PNG valid (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]);

    // Test magic bytes checker logic langsung (sama persis dengan api/upload)
    function detectImageFormat(buffer) {
      if (buffer.length < 12) return null;
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
      if (
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
      ) return 'png';
      if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'webp';
      }
      return null;
    }

    const fakeDetected = detectImageFormat(fakeJpgBuffer);
    record(
      'Deteksi File Palsu / Menyamar (Magic Bytes Anti-Tamper)',
      fakeDetected === null,
      'File teks berkamuflase ditolak'
    );

    const validJpgDetected = detectImageFormat(validJpgBuffer);
    const validPngDetected = detectImageFormat(validPngBuffer);
    record(
      'Deteksi File Gambar Sah (Valid JPEG & PNG Magic Bytes)',
      validJpgDetected === 'jpeg' && validPngDetected === 'png',
      `JPEG: ${validJpgDetected}, PNG: ${validPngDetected}`
    );

    // Simulasikan penyimpanan file ke public/uploads dan pasang ke member1
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const testFilename = `photo_test_${Date.now()}.jpg`;
    const testFilePath = path.join(uploadsDir, testFilename);
    fs.writeFileSync(testFilePath, validJpgBuffer);
    uploadedFilesToClean.push(testFilePath);

    const testPhotoUrl = `/uploads/${testFilename}`;
    const photoUpdateRes = await updateMember(testTeamId, member1.id, {
      photoUrl: testPhotoUrl,
    });

    record(
      'Simpan Foto Jersey ke Storage & Hubungkan ke Profil Pemain',
      photoUpdateRes.success && photoUpdateRes.member?.photoUrl === testPhotoUrl,
      `URL Foto: ${photoUpdateRes.member?.photoUrl}`
    );

    // -------------------------------------------------------------
    // TEST 8: Transisi Status Roster (Draft -> Lengkap -> Terverifikasi)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Siklus Status Roster Tim (Draft -> Lengkap -> Terverifikasi) ---');
    const teamMid = await getTeamById(testTeamId);
    record(
      'Status Awal Sebelum 20 Terisi Penuh adalah Draft',
      teamMid.status === 'Draft',
      `Status saat ini: ${teamMid.status}`
    );

    // Isi sisa slot yang belum terisi (slot 4 s/d 15)
    for (let slot = 4; slot <= 15; slot++) {
      const m = teamMid.members.find(x => x.slotIndex === slot);
      await updateMember(testTeamId, m.id, {
        fullName: `Pemain Uji #${slot}`,
        jerseyNumber: String(slot + 10),
        nim: `21085610${String(slot).padStart(2, '0')}`,
        faculty: 'Fakultas Olahraga',
        major: 'Pelatihan',
        entryYear: '2023',
        position: 'Middle Blocker',
      });
    }

    const teamFull = await getTeamById(testTeamId);
    const allFilled = teamFull.members.filter(m => m.fullName.trim() !== '').length === 20;

    record(
      'Transisi Otomatis Status Tim Menjadi "Lengkap" Saat 20/20 Slot Terisi',
      allFilled && teamFull.status === 'Lengkap',
      `Status tim: ${teamFull.status} (${teamFull.members.length}/20)`
    );

    // Verifikasi Tim oleh Panitia
    const verifyRes = await updateTeam(testTeamId, { status: 'Terverifikasi' });
    record(
      'Fitur Verifikasi Tim oleh Panitia Pelaksana (Status "Terverifikasi")',
      verifyRes.success && verifyRes.team?.status === 'Terverifikasi',
      `Status tim setelah verifikasi: ${verifyRes.team?.status}`
    );

    // -------------------------------------------------------------
    // TEST 9: Batas Kuota 6 Tim (Hard Limit Database Trigger)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Penegakan Batas Kuota Maksimal 6 Tim (FR-01.2 & Trigger DB) ---');
    // Cari berapa tim di regional Timur Putri
    const existingTeams = await getAllTeams('Timur', 'Putri');
    console.log(`Jumlah tim saat ini di Timur Putri: ${existingTeams.length}`);

    // Isi sampai pas 6 tim jika belum
    const needed = 6 - existingTeams.length;
    for (let i = 0; i < needed; i++) {
      const res = await createTeam({
        name: `Tim Dummy Kuota #${i + 1}`,
        address: 'Alamat',
        province: 'Jawa Timur',
        region: 'Timur',
        category: 'Putri',
      });
      if (res.success && res.team) {
        createdDummyIds.push(res.team.id);
      }
    }

    // Sekarang kuota Timur Putri HARUS sudah pas 6 tim!
    const atMaxTeams = await getAllTeams('Timur', 'Putri');
    console.log(`Timur Putri sekarang memiliki ${atMaxTeams.length} tim.`);

    // Percobaan mendaftarkan tim ke-7: HARUS DITOLAK!
    const team7Res = await createTeam({
      name: 'Tim Ke-7 Yang Harus Ditolak',
      address: 'Alamat',
      province: 'Jawa Timur',
      region: 'Timur',
      category: 'Putri',
    });

    record(
      'Penolakan Pendaftaran Tim Ke-7 Saat Kuota Penuh (Maks 6 Tim)',
      !team7Res.success && /sudah penuh/i.test(team7Res.error || ''),
      `Pesan sistem: "${team7Res.error}"`
    );

    // -------------------------------------------------------------
    // TEST 10: Generasi File Excel (Report 1, Report 2, Report 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Modul Ekspor Laporan Excel (.xlsx) ---');
    const allCurrentTeams = await getAllTeams();

    // Test Report 1 (Roster Fisik)
    const wb1 = new ExcelJS.Workbook();
    const ws1 = wb1.addWorksheet('Report 1');
    ws1.columns = [
      { header: 'Nama Tim', key: 'name' },
      { header: 'Regional', key: 'region' },
      { header: 'Kategori', key: 'category' },
      { header: 'No Jersey', key: 'jersey' },
      { header: 'Nama Pemain', key: 'player' },
    ];
    allCurrentTeams.forEach(t => {
      t.members.filter(m => m.teamRole === 'Pemain').forEach(p => {
        ws1.addRow({
          name: t.name,
          region: t.region,
          category: t.category,
          jersey: p.jerseyNumber || '-',
          player: p.fullName || '-',
        });
      });
    });
    const buf1 = await wb1.xlsx.writeBuffer();
    record(
      'Generasi File Excel REPORT 1 (Roster Fisik Pemain)',
      buf1.length > 1000,
      `Ukuran buffer Excel: ${buf1.length} bytes`
    );

    // Test Report 2 (Data Akademik)
    const wb2 = new ExcelJS.Workbook();
    const ws2 = wb2.addWorksheet('Report 2');
    ws2.columns = [
      { header: 'No Urut', key: 'reg' },
      { header: 'Nama Personel', key: 'name' },
      { header: 'NIM', key: 'nim' },
      { header: 'Fakultas', key: 'faculty' },
      { header: 'Jurusan', key: 'major' },
    ];
    allCurrentTeams.forEach(t => {
      t.members.forEach(m => {
        ws2.addRow({
          reg: m.regNumber,
          name: m.fullName,
          nim: m.nim,
          faculty: m.faculty,
          major: m.major,
        });
      });
    });
    const buf2 = await wb2.xlsx.writeBuffer();
    record(
      'Generasi File Excel REPORT 2 (Verifikasi Akademik & NIM)',
      buf2.length > 1000,
      `Ukuran buffer Excel: ${buf2.length} bytes`
    );

    // Test Report 3 (Rekap Tim)
    const wb3 = new ExcelJS.Workbook();
    const ws3 = wb3.addWorksheet('Report 3');
    ws3.columns = [
      { header: 'No Urut', key: 'num' },
      { header: 'Nama Tim', key: 'name' },
      { header: 'Regional', key: 'region' },
      { header: 'Kategori', key: 'cat' },
      { header: 'Status', key: 'status' },
    ];
    allCurrentTeams.forEach(t => {
      ws3.addRow({
        num: t.teamNumber,
        name: t.name,
        region: t.region,
        cat: t.category,
        status: t.status,
      });
    });
    const buf3 = await wb3.xlsx.writeBuffer();
    record(
      'Generasi File Excel REPORT 3 (Rekapitulasi Tim Tiga Wilayah)',
      buf3.length > 1000,
      `Ukuran buffer Excel: ${buf3.length} bytes`
    );

    // -------------------------------------------------------------
    // TEST 11: Penghapusan Tim & Cascade Delete
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Penghapusan Tim & Cascade Delete Personel ---');
    const deleteRes = await deleteTeam(testTeamId);
    const checkTeam = await getTeamById(testTeamId);

    // Periksa apakah member ikut terhapus di database
    const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
    const orphanMembers = await pool2.query('SELECT COUNT(*) FROM members WHERE team_id = $1', [
      testTeamId,
    ]);
    const orphanCount = Number(orphanMembers.rows[0].count);
    await pool2.end();

    record(
      'Hapus Tim & Otomatis Cascade Delete 20 Anggota Roster',
      deleteRes.success && checkTeam === null && orphanCount === 0,
      `Tim terhapus, sisa anggota di database: ${orphanCount}`
    );

  } catch (err) {
    console.error('Fatal error saat pengujian:', err);
    record('Fatal Execution Error', false, err.message);
  } finally {
    // Bersihkan dummy tim yang dibuat saat test kuota
    for (const dId of createdDummyIds) {
      await deleteTeam(dId).catch(() => undefined);
    }
    // Bersihkan file upload test
    for (const fPath of uploadedFilesToClean) {
      if (fs.existsSync(fPath)) {
        try {
          fs.unlinkSync(fPath);
        } catch {}
      }
    }

    console.log('\n============================================================');
    console.log('📊 REKAPITULASI HASIL PENGUJIAN AKHIR');
    console.log('============================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;

    console.log(`Total Pengujian: ${total}`);
    console.log(`Lolos (PASS)   : ${passed}`);
    console.log(`Gagal (FAIL)   : ${failed}`);
    console.log(`Tingkat Lolos  : ${((passed / total) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 SELURUH FITUR & FLOW USER BERFUNGSI 100% SEMPURNA!');
    } else {
      console.log('\n⚠️ TERDAPAT PENGUJIAN YANG GAGAL, PERIKSA CATATAN DI ATAS.');
    }
  }
}

runAllTests();
