import {
  Team,
  Member,
  Region,
  Category,
  MAX_TEAMS_PER_REGION_CATEGORY,
  RegionalQuota,
} from './types';
import { BackendError, getDataBackend } from './backend';

// ============================================================
// LAPISAN DATA — ORKESTRASI BISNIS
// Query mentah didelegasikan ke backend aktif (PostgreSQL lokal via
// node-postgres, atau Supabase cloud via PostgREST) yang dipilih otomatis
// dari .env.local. API publik modul ini stabil sehingga halaman & route
// tidak perlu tahu backend mana yang dipakai.
//
// Aturan bisnis yang tetap dijaga di sini:
//   - kuota maks 6 tim per regional x kategori (backstop: trigger DB)
//   - nomor daftar tim unik, mengisi celah terendah yang bebas
//     (backstop: unique constraint + retry)
//   - jersey pemain unik dalam satu tim (backstop: partial unique index)
//   - status tim Draft/Lengkap/Terverifikasi dihitung ulang tiap edit member
// ============================================================

/**
 * Mutex in-process: menyerialisasi siklus baca-modifikasi-tulis multi-langkah
 * (mis. hitung nomor tim -> insert) agar dua request bersamaan di satu proses
 * tidak saling menimpa. Penegakan akhir tetap di database.
 */
let dbLock: Promise<unknown> = Promise.resolve();

export function withDatabaseLock<T>(operation: () => T | Promise<T>): Promise<T> {
  const run = dbLock.then(operation);
  dbLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function teamNumberPrefix(region: Region, category: Category): string {
  const regCode = region === 'Barat' ? 'BRT' : region === 'Tengah' ? 'TGH' : 'TMR';
  const catCode = category === 'Putra' ? 'PA' : 'PI';
  return `LVM-${regCode}-${catCode}-`;
}

function describeBackendError(error: unknown): string | null {
  if (error instanceof BackendError) {
    switch (error.kind) {
      case 'quota_exceeded':
        return error.detail || 'Kuota tim untuk regional & kategori ini sudah penuh.';
      case 'team_number_unique':
        return 'Nomor daftar tim sudah digunakan.';
      case 'member_unique':
        return error.detail || 'Data personel melanggar aturan keunikan (jersey/slot).';
    }
  }
  if (error instanceof Error && /Kuota untuk Regional/i.test(error.message)) {
    return error.message;
  }
  return null;
}

// ============================================================
// READ
// ============================================================

export async function getAllTeams(filterRegion?: Region, filterCategory?: Category): Promise<Team[]> {
  const backend = await getDataBackend();
  return backend.fetchTeamsWithMembers(
    filterRegion || filterCategory ? { region: filterRegion, category: filterCategory } : undefined
  );
}

export async function getTeamById(id: string): Promise<Team | null> {
  const backend = await getDataBackend();
  return backend.fetchTeamWithMembers(id);
}

export async function getQuotaStats(): Promise<RegionalQuota[]> {
  const backend = await getDataBackend();
  const pairs = await backend.fetchRegionCategoryPairs();

  const regions: Region[] = ['Barat', 'Tengah', 'Timur'];
  const categories: Category[] = ['Putra', 'Putri'];

  const stats: RegionalQuota[] = [];
  for (const region of regions) {
    for (const category of categories) {
      const count = pairs.filter(p => p.region === region && p.category === category).length;
      stats.push({
        region,
        category,
        maxTeams: MAX_TEAMS_PER_REGION_CATEGORY,
        registeredTeams: count,
        availableSlots: Math.max(0, MAX_TEAMS_PER_REGION_CATEGORY - count),
      });
    }
  }
  return stats;
}

/**
 * Nomor daftar tim berikutnya untuk pasangan regional+kategori.
 * Mengisi celah nomor terendah yang bebas sehingga tidak ada duplikat,
 * sekalipun ada tim yang telah dihapus.
 */
export async function generateTeamNumber(region: Region, category: Category): Promise<string> {
  const backend = await getDataBackend();
  const prefix = teamNumberPrefix(region, category);
  const usedNumbers = await backend.findUsedTeamNumbers(prefix);

  let nextNum = 1;
  while (usedNumbers.has(nextNum)) {
    nextNum += 1;
  }
  return `${prefix}${String(nextNum).padStart(2, '0')}`;
}

// ============================================================
// INSERT
// ============================================================

/** Sisipkan satu tim beserta seluruh personelnya secara atomik (dipakai seeder). */
export async function insertTeamWithMembers(team: Team): Promise<Team> {
  const backend = await getDataBackend();
  return backend.createTeamWithMembers(team);
}

/** Hapus seluruh tim & personelnya (khusus seeder force / reset). */
export async function clearAllTeams(): Promise<void> {
  const backend = await getDataBackend();
  return backend.deleteAllTeams();
}

function buildDefaultMembers(teamId: string, teamNumber: string): Member[] {
  const nowIso = new Date().toISOString();
  const base = {
    teamId,
    regNumber: '',
    fullName: '',
    birthDate: '',
    nim: '',
    faculty: '',
    major: '',
    entryYear: '',
    jerseyNumber: '',
    position: '-' as const,
    height: undefined,
    weight: undefined,
    photoUrl: '',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const regPrefix = teamNumber.replace('LVM-', '');
  const members: Member[] = [];

  // Slot 1–15: Pemain
  for (let i = 1; i <= 15; i++) {
    members.push({
      ...base,
      id: `mem_${teamId}_${i}`,
      slotIndex: i,
      regNumber: `${regPrefix}-${String(i).padStart(2, '0')}`,
      entryYear: '2023',
      teamRole: 'Pemain',
    });
  }

  // Slot 16–20: Official (1 Manager, 1 Head Coach, 2 Asisten Pelatih, 1 Utilities)
  const officialRoles: Member['teamRole'][] = [
    'Team Manager',
    'Head Coach',
    'Assistant Pelatih',
    'Assistant Pelatih',
    'Utilities',
  ];
  officialRoles.forEach((role, idx) => {
    const slotIndex = 16 + idx;
    members.push({
      ...base,
      id: `mem_${teamId}_${slotIndex}`,
      slotIndex,
      regNumber: `${regPrefix}-${slotIndex}`,
      teamRole: role,
    });
  });

  return members;
}

export function createTeam(data: {
  name: string;
  address: string;
  province: string;
  region: Region;
  category: Category;
  contactPerson?: string;
  contactPhone?: string;
}): Promise<{ success: boolean; team?: Team; error?: string }> {
  return withDatabaseLock(async () => {
    try {
      const backend = await getDataBackend();

      // Pre-check kuota untuk pesan error yang ramah (trigger DB sebagai backstop)
      const pairs = await backend.fetchRegionCategoryPairs();
      const sameSlot = pairs.filter(
        p => p.region === data.region && p.category === data.category
      ).length;
      if (sameSlot >= MAX_TEAMS_PER_REGION_CATEGORY) {
        return {
          success: false,
          error: `Kuota untuk Regional ${data.region} (${data.category}) sudah penuh (${MAX_TEAMS_PER_REGION_CATEGORY} Tim).`,
        };
      }

      // Hitung nomor bebas; bila kalah race dan kena unique constraint, coba lagi.
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const teamNumber = await generateTeamNumber(data.region, data.category);
        const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const nowIso = new Date().toISOString();

        const newTeam: Team = {
          id: teamId,
          teamNumber,
          name: data.name,
          address: data.address ?? '',
          province: data.province,
          region: data.region,
          category: data.category,
          contactPerson: data.contactPerson ?? '',
          contactPhone: data.contactPhone ?? '',
          members: buildDefaultMembers(teamId, teamNumber),
          status: 'Draft',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        try {
          const inserted = await backend.createTeamWithMembers(newTeam);
          return { success: true, team: inserted };
        } catch (err) {
          lastError = err;
          if (err instanceof BackendError && err.kind === 'team_number_unique') {
            continue; // nomor diambil proses lain -> hitung ulang
          }
          throw err;
        }
      }

      return {
        success: false,
        error: `Gagal mendapatkan nomor daftar tim unik setelah beberapa percobaan: ${
          lastError instanceof Error ? lastError.message : 'tidak diketahui'
        }`,
      };
    } catch (error) {
      console.error('createTeam error:', error);
      const friendly = describeBackendError(error);
      return {
        success: false,
        error: friendly ?? (
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan sistem saat mendaftarkan tim'
        ),
      };
    }
  });
}

// ============================================================
// UPDATE / DELETE TIM
// ============================================================

const TEAM_PATCH_FIELDS: Partial<Record<keyof Team, string>> = {
  name: 'name',
  address: 'address',
  province: 'province',
  region: 'region',
  category: 'category',
  contactPerson: 'contact_person',
  contactPhone: 'contact_phone',
  status: 'status',
};

export function updateTeam(id: string, updates: Partial<Team>): Promise<{ success: boolean; team?: Team; error?: string }> {
  return withDatabaseLock(async () => {
    try {
      const backend = await getDataBackend();

      // Whitelist kolom — abaikan field lain (members, timestamp, dsb.)
      const patch: Record<string, unknown> = {};
      (Object.keys(TEAM_PATCH_FIELDS) as (keyof Team)[]).forEach(key => {
        if (updates[key] !== undefined) {
          patch[TEAM_PATCH_FIELDS[key] as string] = updates[key];
        }
      });

      if (Object.keys(patch).length > 0) {
        const found = await backend.updateTeamColumns(id, patch);
        if (!found) {
          return { success: false, error: 'Team tidak ditemukan' };
        }
      }

      const freshTeam = await backend.fetchTeamWithMembers(id);
      if (!freshTeam) {
        return { success: false, error: 'Team tidak ditemukan' };
      }
      return { success: true, team: freshTeam };
    } catch (error) {
      console.error('updateTeam fatal:', error);
      const friendly = describeBackendError(error);
      return {
        success: false,
        error: friendly ?? (
          error instanceof Error
            ? error.message
            : 'Gagal memperbarui data tim'
        ),
      };
    }
  });
}

export function deleteTeam(id: string): Promise<{ success: boolean; error?: string }> {
  return withDatabaseLock(async () => {
    try {
      const backend = await getDataBackend();
      // Personel ikut terhapus otomatis lewat ON DELETE CASCADE
      const found = await backend.deleteTeamById(id);
      if (!found) {
        return { success: false, error: 'Team tidak ditemukan' };
      }
      return { success: true };
    } catch (error) {
      console.error('deleteTeam fatal:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Gagal menghapus data tim',
      };
    }
  });
}

// ============================================================
// UPDATE MEMBER
// ============================================================

const MEMBER_PATCH_FIELDS: Partial<Record<keyof Member, string>> = {
  fullName: 'full_name',
  birthDate: 'birth_date',
  nim: 'nim',
  faculty: 'faculty',
  major: 'major',
  entryYear: 'entry_year',
  teamRole: 'team_role',
  jerseyNumber: 'jersey_number',
  position: 'position',
  height: 'height',
  weight: 'weight',
  photoUrl: 'photo_url',
};

export function updateMember(teamId: string, memberId: string, updates: Partial<Member>): Promise<{ success: boolean; member?: Member; error?: string }> {
  return withDatabaseLock(async () => {
    try {
      const backend = await getDataBackend();

      // Pencocokan ketat berdasarkan memberId + teamId
      const current = await backend.findMemberById(teamId, memberId);
      if (!current) {
        return { success: false, error: 'Member tidak ditemukan' };
      }

      // Susun patch (whitelist kolom)
      const patch: Record<string, unknown> = {};
      (Object.keys(MEMBER_PATCH_FIELDS) as (keyof Member)[]).forEach(key => {
        if (updates[key] !== undefined) {
          patch[MEMBER_PATCH_FIELDS[key] as string] = updates[key];
        }
      });

      const effectiveRole =
        (patch.team_role as Member['teamRole'] | undefined) ?? current.teamRole;
      const effectiveJersey =
        patch.jersey_number !== undefined
          ? String(patch.jersey_number ?? '')
          : current.jerseyNumber ?? '';

      // FR-02.3: tolak nomor jersey ganda antar pemain dalam tim yang sama.
      // Partial unique index di DB menjadi pengaman kedua.
      if (effectiveRole === 'Pemain' && effectiveJersey.trim() !== '') {
        const others = await backend.listPlayerJerseys(teamId, memberId);
        const duplicate = others.some(o => o.jerseyNumber.trim() === effectiveJersey.trim());
        if (duplicate) {
          return {
            success: false,
            error: `Nomor Jersey ${effectiveJersey} sudah digunakan oleh pemain lain dalam tim ini.`,
          };
        }
      }

      // Normalisasi nilai kosong menjadi NULL (konsisten dengan skema/index)
      if ('jersey_number' in patch && String(patch.jersey_number ?? '').trim() === '') {
        patch.jersey_number = null;
      }
      if ('position' in patch && String(patch.position ?? '').trim() === '-') {
        patch.position = null;
      }

      let updated: Member | null = current;
      if (Object.keys(patch).length > 0) {
        updated = await backend.updateMemberColumns(teamId, memberId, patch);
        if (!updated) {
          return { success: false, error: 'Member tidak ditemukan' };
        }
      }

      // Hitung ulang status kelengkapan tim dari fullName non-kosong (trim).
      // Bila 0 slot terisi, biarkan status apa adanya (paritas logika lama).
      const fullNames = await backend.listMemberFullNames(teamId);
      const filledCount = fullNames.filter(n => n.trim() !== '').length;

      let nextStatus: Team['status'] | null = null;
      if (filledCount === 20) {
        nextStatus = 'Lengkap';
      } else if (filledCount > 0) {
        nextStatus = 'Draft';
      }

      if (nextStatus) {
        await backend.updateTeamColumns(teamId, { status: nextStatus });
      }

      return { success: true, member: updated };
    } catch (error) {
      console.error('updateMember fatal:', error);
      const friendly = describeBackendError(error);
      return {
        success: false,
        error: friendly ?? (
          error instanceof Error
            ? error.message
            : 'Gagal memperbarui data personel/pemain'
        ),
      };
    }
  });
}
