import { Team, Member, Region, Category } from './types';

/**
 * Kontrak backend data + mekanisme pemilihan backend berdasarkan environment.
 *
 * Prioritas:
 *   1. Supabase cloud  — bila SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY terisi
 *   2. PostgreSQL lokal— bila DATABASE_URL (atau variabel PGHOST/PGUSER/...) terisi
 *   3. Belum dikonfigurasi → error dengan petunjuk jelas
 *
 * Kedua backend menghadirkan SQL yang sama persis dari supabase/schema.sql,
 * sehingga perpindahan lokal <-> cloud hanya mengubah .env.
 */

export type BackendErrorKind =
  | 'team_number_unique' // nomor daftar tim sudah dipakai tim lain
  | 'quota_exceeded'     // trigger kuota regional x kategori
  | 'member_unique';     // pelanggaran unik di members (jersey/slot)

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly detail?: string;

  constructor(kind: BackendErrorKind, detail?: string) {
    super(detail ?? kind);
    this.name = 'BackendError';
    this.kind = kind;
    this.detail = detail;
  }
}

/** Kontributor yang harus disediakan setiap backend database */
export interface DataBackend {
  readonly name: 'supabase' | 'postgres';

  fetchTeamsWithMembers(filter?: { region?: Region; category?: Category }): Promise<Team[]>;
  fetchTeamWithMembers(id: string): Promise<Team | null>;
  fetchRegionCategoryPairs(): Promise<Array<{ region: string; category: string }>>;
  findUsedTeamNumbers(prefix: string): Promise<Set<number>>;

  /** Insert tim + seluruh personelnya secara atomik; throws BackendError */
  createTeamWithMembers(team: Team): Promise<Team>;

  /** false = id tidak ditemukan */
  updateTeamColumns(id: string, patch: Record<string, unknown>): Promise<boolean>;
  deleteTeamById(id: string): Promise<boolean>;
  deleteAllTeams(): Promise<void>;

  findMemberById(teamId: string, memberId: string): Promise<Member | null>;
  listPlayerJerseys(
    teamId: string,
    excludeMemberId?: string
  ): Promise<Array<{ id: string; jerseyNumber: string }>>;
  listMemberFullNames(teamId: string): Promise<string[]>;

  /** null = tidak ditemukan; throws BackendError('member_unique') bila jersey/slot bentrok */
  updateMemberColumns(
    teamId: string,
    memberId: string,
    patch: Record<string, unknown>
  ): Promise<Member | null>;
}

let cachedBackend: DataBackend | null = null;

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hasLocalPostgresEnv(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.PGHOST ||
      process.env.PGUSER ||
      process.env.PGDATABASE
  );
}

export function getActiveBackendName(): 'supabase' | 'postgres' | null {
  if (hasSupabaseEnv()) return 'supabase';
  if (hasLocalPostgresEnv()) return 'postgres';
  return null;
}

/** Pilih & cache backend aktif berdasarkan environment. */
export async function getDataBackend(): Promise<DataBackend> {
  if (cachedBackend) {
    return cachedBackend;
  }

  if (hasSupabaseEnv()) {
    const mod = await import('./backends/supabaseBackend');
    cachedBackend = mod.supabaseBackend;
    return cachedBackend;
  }

  if (hasLocalPostgresEnv()) {
    const mod = await import('./backends/pgBackend');
    cachedBackend = mod.pgBackend;
    return cachedBackend;
  }

  throw new Error(
    'Database belum dikonfigurasi. Pilih salah satu pada file .env.local: ' +
    '(1) PostgreSQL lokal -> isi DATABASE_URL, atau ' +
    '(2) Supabase cloud -> isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY. ' +
    'Lihat .env.example dan README bagian setup database.'
  );
}
