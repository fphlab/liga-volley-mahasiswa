import { Team, Member, Region, Category } from './types';

/**
 * Bentuk baris mentah (snake_case) yang dikembalikan oleh SEMUA backend
 * (Postgres lokal via node-postgres maupun Supabase/PostgREST), plus mapper
 * ke entitas domain camelCase yang dipakai aplikasi.
 */

export type TeamRow = {
  id: string;
  team_number: string;
  name: string;
  address: string;
  province: string;
  region: Region;
  category: Category;
  contact_person: string;
  contact_phone: string;
  status: Team['status'];
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  id: string;
  team_id: string;
  slot_index: number;
  reg_number: string;
  full_name: string;
  birth_date: string;
  nim: string;
  faculty: string;
  major: string;
  entry_year: string;
  team_role: Member['teamRole'];
  jersey_number: string | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  photo_url: string;
  created_at: string;
  updated_at: string;
};

/** Bentuk tim ter-embed hasil join/embed dengan anggotanya */
export type TeamRowWithMembers = TeamRow & { members: MemberRow[] | null };

export function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    teamId: row.team_id,
    slotIndex: row.slot_index,
    regNumber: row.reg_number ?? '',
    fullName: row.full_name ?? '',
    birthDate: row.birth_date ?? '',
    nim: row.nim ?? '',
    faculty: row.faculty ?? '',
    major: row.major ?? '',
    entryYear: row.entry_year ?? '',
    teamRole: row.team_role,
    jerseyNumber: row.jersey_number ?? '',
    position: (row.position as Member['position']) ?? '-',
    height: row.height ?? undefined,
    weight: row.weight ?? undefined,
    photoUrl: row.photo_url ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTeamRow(row: TeamRowWithMembers): Team {
  const members = (row.members ?? []).map(mapMemberRow);
  // Urutkan berdasarkan nomor slot agar identik dengan struktur data lama
  members.sort((a, b) => a.slotIndex - b.slotIndex);

  return {
    id: row.id,
    teamNumber: row.team_number,
    name: row.name,
    address: row.address ?? '',
    province: row.province,
    region: row.region,
    category: row.category,
    contactPerson: row.contact_person ?? '',
    contactPhone: row.contact_phone ?? '',
    status: row.status,
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Bangun ulang bentuk ter-embed dari dua hasil query terpisah (dipakai backend SQL) */
export function assembleTeams(teamRows: TeamRow[], memberRows: MemberRow[]): Team[] {
  const byTeam = new Map<string, MemberRow[]>();
  for (const m of memberRows) {
    const bucket = byTeam.get(m.team_id);
    if (bucket) {
      bucket.push(m);
    } else {
      byTeam.set(m.team_id, [m]);
    }
  }
  return teamRows.map(row => mapTeamRow({ ...row, members: byTeam.get(row.id) ?? [] }));
}
