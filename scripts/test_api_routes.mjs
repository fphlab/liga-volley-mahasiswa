import fs from 'fs';
import path from 'path';

// Load .env.local
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

import { NextRequest } from 'next/server';
import { GET as getQuotaRoute } from '../src/app/api/quota/route.ts';
import { GET as getTeamsRoute, POST as postTeamRoute } from '../src/app/api/teams/route.ts';
import { GET as getTeamByIdRoute, PUT as putTeamRoute, DELETE as deleteTeamRoute } from '../src/app/api/teams/[id]/route.ts';
import { PUT as putMemberRoute } from '../src/app/api/teams/[id]/members/route.ts';
import { POST as uploadRoute } from '../src/app/api/upload/route.ts';

const results = [];
function record(name, pass, msg = '') {
  results.push({ name, pass, msg });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${name}${msg ? ` -> ${msg}` : ''}`);
}

async function runApiTests() {
  console.log('============================================================');
  console.log('🌐 PENGUJIAN LAYER HTTP API ROUTES (NEXT.JS ROUTE HANDLERS)');
  console.log('============================================================\n');

  let testTeamId = null;
  const createdUploadFiles = [];

  try {
    // -------------------------------------------------------------
    // API 1: GET /api/quota
    // -------------------------------------------------------------
    console.log('--- API 1: GET /api/quota ---');
    const quotaRes = await getQuotaRoute();
    const quotaJson = await quotaRes.json();
    record(
      'GET /api/quota merespons status 200 dengan data kuota',
      quotaRes.status === 200 && quotaJson.success === true && Array.isArray(quotaJson.quota),
      `Total pasang kuota: ${quotaJson.quota?.length}`
    );

    // -------------------------------------------------------------
    // API 2: GET /api/teams
    // -------------------------------------------------------------
    console.log('\n--- API 2: GET /api/teams ---');
    const teamsReq = new NextRequest('http://localhost:3000/api/teams?region=Barat&category=Putra');
    const teamsRes = await getTeamsRoute(teamsReq);
    const teamsJson = await teamsRes.json();
    record(
      'GET /api/teams dengan query filter (region & category)',
      teamsRes.status === 200 && teamsJson.success === true && Array.isArray(teamsJson.teams),
      `Jumlah tim ditemukan: ${teamsJson.teams?.length}`
    );

    // -------------------------------------------------------------
    // API 3: POST /api/teams (Validation & Creation)
    // -------------------------------------------------------------
    console.log('\n--- API 3: POST /api/teams ---');
    // 3a: Missing fields rejected
    const badReq = new NextRequest('http://localhost:3000/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });
    const badRes = await postTeamRoute(badReq);
    const badJson = await badRes.json();
    record(
      'POST /api/teams menolak request tanpa field wajib (400 Bad Request)',
      badRes.status === 400 && badJson.success === false,
      `Pesan: "${badJson.error}"`
    );

    // 3b: Valid team creation
    const goodReq = new NextRequest('http://localhost:3000/api/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Institut Teknologi Uji Coba LVM',
        address: 'Jl. Ganesha No. 10',
        province: 'Jawa Barat',
        region: 'Barat',
        category: 'Putra',
        contactPerson: 'Agus Subagyo',
        contactPhone: '081399887766',
      }),
    });
    const goodRes = await postTeamRoute(goodReq);
    const goodJson = await goodRes.json();
    record(
      'POST /api/teams berhasil membuat tim baru (201 Created)',
      goodRes.status === 201 && goodJson.success === true && Boolean(goodJson.team?.id),
      `ID: ${goodJson.team?.id}, No: ${goodJson.team?.teamNumber}`
    );
    testTeamId = goodJson.team?.id;

    // -------------------------------------------------------------
    // API 4: GET /api/teams/[id]
    // -------------------------------------------------------------
    console.log('\n--- API 4: GET /api/teams/[id] ---');
    const getDetailReq = new NextRequest(`http://localhost:3000/api/teams/${testTeamId}`);
    const getDetailRes = await getTeamByIdRoute(getDetailReq, { params: Promise.resolve({ id: testTeamId }) });
    const getDetailJson = await getDetailRes.json();
    record(
      'GET /api/teams/[id] mengambil detail tim beserta 20 anggota roster',
      getDetailRes.status === 200 && getDetailJson.success === true && getDetailJson.team?.members?.length === 20,
      `Nama tim: ${getDetailJson.team?.name}, Roster: ${getDetailJson.team?.members?.length} anggota`
    );

    // -------------------------------------------------------------
    // API 5: POST /api/upload (File Upload API Handler)
    // -------------------------------------------------------------
    console.log('\n--- API 5: POST /api/upload (Photo Upload Handler) ---');
    // 5a: Upload tanpa file ditolak
    const emptyForm = new FormData();
    const emptyUploadReq = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: emptyForm,
    });
    const emptyUploadRes = await uploadRoute(emptyUploadReq);
    const emptyUploadJson = await emptyUploadRes.json();
    record(
      'POST /api/upload menolak request tanpa file (400 Bad Request)',
      emptyUploadRes.status === 400 && emptyUploadJson.success === false,
      `Error: "${emptyUploadJson.error}"`
    );

    // 5b: Upload file teks menyamar ditolak oleh magic bytes
    const fakeForm = new FormData();
    const fakeBlob = new Blob(['MALICIOUS_OR_PLAIN_TEXT_PAYLOAD'], { type: 'image/jpeg' });
    fakeForm.append('file', fakeBlob, 'fake.jpg');
    const fakeUploadReq = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: fakeForm,
    });
    const fakeUploadRes = await uploadRoute(fakeUploadReq);
    const fakeUploadJson = await fakeUploadRes.json();
    record(
      'POST /api/upload menolak file palsu yang menyamar JPEG (Magic Bytes Validation)',
      fakeUploadRes.status === 400 && /bukan gambar/i.test(fakeUploadJson.error || ''),
      `Error: "${fakeUploadJson.error}"`
    );

    // 5c: Upload file JPEG sungguhan (valid magic bytes FF D8 FF ...)
    const validJpgBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    ]);
    const validForm = new FormData();
    const validBlob = new Blob([validJpgBytes], { type: 'image/jpeg' });
    validForm.append('file', validBlob, 'player_jersey.jpg');
    const validUploadReq = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: validForm,
    });
    const validUploadRes = await uploadRoute(validUploadReq);
    const validUploadJson = await validUploadRes.json();
    record(
      'POST /api/upload menerima gambar valid & menghasilkan URL publik',
      validUploadRes.status === 200 && validUploadJson.success === true && Boolean(validUploadJson.photoUrl),
      `URL Foto terbit: ${validUploadJson.photoUrl}`
    );

    if (validUploadJson.photoUrl) {
      const diskPath = path.join(process.cwd(), 'public', validUploadJson.photoUrl.replace(/^\//, ''));
      createdUploadFiles.push(diskPath);
      record(
        'File fisik benar-benar tersimpan di folder public/uploads/',
        fs.existsSync(diskPath),
        `Path: ${diskPath}`
      );
    }

    // -------------------------------------------------------------
    // API 6: PUT /api/teams/[id]/members (Update Roster Member)
    // -------------------------------------------------------------
    console.log('\n--- API 6: PUT /api/teams/[id]/members ---');
    const firstMember = getDetailJson.team.members[0];
    const updateMemberReq = new NextRequest(`http://localhost:3000/api/teams/${testTeamId}/members`, {
      method: 'PUT',
      body: JSON.stringify({
        memberId: firstMember.id,
        updates: {
          fullName: 'Bintang Perkasa',
          jerseyNumber: '15',
          position: 'Opposite',
          height: 192,
          weight: 82,
          photoUrl: validUploadJson.photoUrl,
        },
      }),
    });
    const updateMemberRes = await putMemberRoute(updateMemberReq, { params: Promise.resolve({ id: testTeamId }) });
    const updateMemberJson = await updateMemberRes.json();
    record(
      'PUT /api/teams/[id]/members memperbarui personel & menautkan foto',
      updateMemberRes.status === 200 && updateMemberJson.success === true && updateMemberJson.member?.fullName === 'Bintang Perkasa',
      `Nama: ${updateMemberJson.member?.fullName}, Foto: ${updateMemberJson.member?.photoUrl}`
    );

    // -------------------------------------------------------------
    // API 7: PUT /api/teams/[id] (Update Team & Verification)
    // -------------------------------------------------------------
    console.log('\n--- API 7: PUT /api/teams/[id] ---');
    const updateTeamReq = new NextRequest(`http://localhost:3000/api/teams/${testTeamId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Terverifikasi',
      }),
    });
    const updateTeamRes = await putTeamRoute(updateTeamReq, { params: Promise.resolve({ id: testTeamId }) });
    const updateTeamJson = await updateTeamRes.json();
    record(
      'PUT /api/teams/[id] memperbarui data tim / status verifikasi',
      updateTeamRes.status === 200 && updateTeamJson.success === true && updateTeamJson.team?.status === 'Terverifikasi',
      `Status baru: ${updateTeamJson.team?.status}`
    );

    // -------------------------------------------------------------
    // API 8: DELETE /api/teams/[id] (Delete Team API)
    // -------------------------------------------------------------
    console.log('\n--- API 8: DELETE /api/teams/[id] ---');
    const deleteReq = new NextRequest(`http://localhost:3000/api/teams/${testTeamId}`, { method: 'DELETE' });
    const deleteRes = await deleteTeamRoute(deleteReq, { params: Promise.resolve({ id: testTeamId }) });
    const deleteJson = await deleteRes.json();
    record(
      'DELETE /api/teams/[id] menghapus tim dan merespons sukses',
      deleteRes.status === 200 && deleteJson.success === true,
      deleteJson.message || 'Tim berhasil dihapus'
    );

  } catch (err) {
    console.error('API Test Error:', err);
    record('API Test Uncaught Error', false, err.message);
  } finally {
    // Bersihkan file yang di-upload saat testing
    for (const f of createdUploadFiles) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    }

    console.log('\n============================================================');
    console.log('📊 REKAPITULASI PENGUJIAN API HTTP');
    console.log('============================================================');
    const total = results.length;
    const pass = results.filter(r => r.pass).length;
    const fail = results.filter(r => !r.pass).length;
    console.log(`Total: ${total}, PASS: ${pass}, FAIL: ${fail}`);
    console.log(`Kelulusan: ${((pass / total) * 100).toFixed(1)}%`);
  }
}

runApiTests();
