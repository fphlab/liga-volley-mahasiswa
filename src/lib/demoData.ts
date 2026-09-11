import { Team, Region, Category } from './types';
import { buildDefaultMembers } from './db';

/**
 * Data master 20 tim nyata Liga Voli Mahasiswa (BAGIAN 3.1–3.2 docs/08).
 * Regional Barat dikosongkan (keputusan no. 6).
 *
 * Setiap tim di-seed dengan 20 slot personel KOSONG (via buildDefaultMembers)
 * berstatus Draft dan tanpa pemilik (ownerCode ''), untuk kemudian diisi
 * oleh peserta dan di-assign Panpel melalui UI (Opsi B).
 */

interface RealTeamSeed {
  name: string;
  province: string;
  region: Region;
  category: Category;
  address: string;
  contactPerson: string;
  contactPhone: string;
  ownerCode: string;
}

const realTeamsData: RealTeamSeed[] = [
  // ---- Regional Tengah — Putra (5) ----
  { name: 'UNMEKA Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UII Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Semarang', province: 'Jawa Tengah', region: 'Tengah', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UNTAG Semarang', province: 'Jawa Tengah', region: 'Tengah', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UNJAYA Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  // ---- Regional Tengah — Putri (4) ----
  { name: 'UNMEKA Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UII Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Semarang', province: 'Jawa Tengah', region: 'Tengah', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UNJAYA Yogyakarta', province: 'DI Yogyakarta', region: 'Tengah', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  // ---- Regional Timur — Putra (5) ----
  { name: 'UNESA Surabaya', province: 'Jawa Timur', region: 'Timur', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Bojonegoro', province: 'Jawa Timur', region: 'Timur', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Negeri Malang', province: 'Jawa Timur', region: 'Timur', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Wiraraja', province: 'Jawa Timur', region: 'Timur', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'STKIP PGRI Pacitan', province: 'Jawa Timur', region: 'Timur', category: 'Putra', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  // ---- Regional Timur — Putri (6) ----
  { name: 'UNESA Surabaya', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas PGRI Sumenep', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Negeri Malang', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Insan Budi Utomo', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'UIN Tulung Agung', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
  { name: 'Universitas Nusantara PGRI', province: 'Jawa Timur', region: 'Timur', category: 'Putri', address: '', contactPerson: '', contactPhone: '', ownerCode: '' },
];

/** Bangun 20 tim nyata: 20 slot kosong per tim, status Draft, tanpa pemilik. */
export function buildDemoTeams(): Team[] {
  const sequenceByPair = new Map<string, number>();

  return realTeamsData.map((seed) => {
    const regCode = seed.region === 'Barat' ? 'BRT' : seed.region === 'Tengah' ? 'TGH' : 'TMR';
    const catCode = seed.category === 'Putra' ? 'PA' : 'PI';
    const pairKey = `${regCode}-${catCode}`;
    const seq = (sequenceByPair.get(pairKey) ?? 0) + 1;
    sequenceByPair.set(pairKey, seq);

    const teamNumber = `LVM-${pairKey}-${String(seq).padStart(2, '0')}`;
    const teamId = `team_real_${regCode.toLowerCase()}_${catCode.toLowerCase()}_${seq}`;
    const nowIso = new Date().toISOString();

    return {
      id: teamId,
      teamNumber,
      name: seed.name,
      address: seed.address,
      province: seed.province,
      region: seed.region,
      category: seed.category,
      contactPerson: seed.contactPerson,
      contactPhone: seed.contactPhone,
      ownerCode: seed.ownerCode,
      members: buildDefaultMembers(teamId, teamNumber),
      status: 'Draft' as const,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}
