/**
 * Migrasi satu arah: data/volleyball_data.json -> Supabase (Postgres).
 *
 * Pemakaian (dari root proyek):
 *   node --env-file=.env.local scripts/migrate-json-to-supabase.mjs
 *   node --env-file=.env.local scripts/migrate-json-to-supabase.mjs --force
 *
 * Tanpa --force: migrasi dibatalkan bila tabel teams sudah berisi data.
 * Dengan --force: seluruh tim lama dihapus dulu (cascade ke members).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const FORCE = process.argv.includes('--force');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.');
  console.error('Jalankan dengan: node --env-file=.env.local scripts/migrate-json-to-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dataFile = path.join(process.cwd(), 'data', 'volleyball_data.json');
if (!fs.existsSync(dataFile)) {
  console.error(`ERROR: file sumber tidak ditemukan: ${dataFile}`);
  process.exit(1);
}

function teamRow(team) {
  return {
    id: team.id,
    team_number: team.teamNumber,
    name: team.name,
    address: team.address ?? '',
    province: team.province,
    region: team.region,
    category: team.category,
    contact_person: team.contactPerson ?? '',
    contact_phone: team.contactPhone ?? '',
    status: team.status ?? 'Draft',
    created_at: team.createdAt,
    updated_at: team.updatedAt,
  };
}

function memberRows(team) {
  return (team.members ?? []).map(m => ({
    id: m.id,
    team_id: m.teamId,
    slot_index: m.slotIndex,
    reg_number: m.regNumber ?? '',
    full_name: m.fullName ?? '',
    birth_date: m.birthDate ?? '',
    nim: m.nim ?? '',
    faculty: m.faculty ?? '',
    major: m.major ?? '',
    entry_year: m.entryYear ?? '',
    team_role: m.teamRole,
    jersey_number:
      m.jerseyNumber && String(m.jerseyNumber).trim() !== '' ? m.jerseyNumber : null,
    position: m.position && m.position !== '-' ? m.position : null,
    height: m.height ?? null,
    weight: m.weight ?? null,
    photo_url: m.photoUrl ?? '',
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  }));
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const teams = raw.teams ?? [];

  console.log(`Sumber: ${teams.length} tim dari ${path.basename(dataFile)}`);

  // Cek isi tabel tujuan
  const { count: existingCount, error: countError } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error(`ERROR membaca tabel teams: ${countError.message}`);
    console.error('Pastikan Anda sudah menjalankan supabase/schema.sql di SQL Editor.');
    process.exit(1);
  }

  if ((existingCount ?? 0) > 0 && !FORCE) {
    console.error(`DIBATALKAN: tabel teams sudah berisi ${existingCount} baris.`);
    console.error('Gunakan --force untuk mengosongkan dan mengganti seluruhnya.');
    process.exit(1);
  }

  if ((existingCount ?? 0) > 0 && FORCE) {
    const { error } = await supabase.from('teams').delete().neq('id', '__none__');
    if (error) {
      console.error(`ERROR menghapus data lama: ${error.message}`);
      process.exit(1);
    }
    console.log('Data lama dihapus (--force).');
  }

  let totalMembers = 0;
  for (const [idx, team] of teams.entries()) {
    const { error: teamErr } = await supabase.from('teams').insert(teamRow(team));
    if (teamErr) {
      console.error(`GAGAL insert tim "${team.name}" (${team.teamNumber}): ${teamErr.message}`);
      process.exit(1);
    }

    const rows = memberRows(team);
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from('members').insert(chunk);
      if (error) {
        // Rollback tim ini agar tidak setengah jadi
        await supabase.from('teams').delete().eq('id', team.id);
        console.error(`GAGAL insert personel tim "${team.name}": ${error.message}`);
        process.exit(1);
      }
    }
    totalMembers += rows.length;
    console.log(`  [${idx + 1}/${teams.length}] ${team.teamNumber} — ${team.name} (${rows.length} personel) OK`);
  }

  console.log(`\nSelesai. ${teams.length} tim & ${totalMembers} personel termigrasi ke Supabase.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
