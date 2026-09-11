import { Team, Member, Region, Category } from '../types';
import { mapMemberRow, mapTeamRow, MemberRow, TeamRowWithMembers } from '../rowMappers';
import { AccountInsert, AccountRow, BackendError, DataBackend } from '../backend';
import { getSupabaseAdmin } from '../supabaseServer';

/**
 * Backend Supabase (PostgREST via @supabase/supabase-js) untuk deployment cloud.
 * Klien admin service-role dibuat lazy di supabaseServer.ts.
 */

type PgErrorLike = { code?: string | null; message?: string | null };

function isQuotaViolation(err: PgErrorLike | null): boolean {
  return Boolean(
    err &&
      (err.code === '23514' ||
        err.code === 'P0001' ||
        /Kuota untuk Regional/i.test(err.message ?? ''))
  );
}

async function findMemberByIdImpl(teamId: string, memberId: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal membaca data personel: ${error.message}`);
  }
  return data ? mapMemberRow(data as unknown as MemberRow) : null;
}

export const supabaseBackend: DataBackend = {
  name: 'supabase',

  async fetchTeamsWithMembers(filter?: { region?: Region; category?: Category; ownerCode?: string }): Promise<Team[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('teams')
      .select('*, members(*)')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (filter?.region) {
      query = query.eq('region', filter.region);
    }
    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.ownerCode) {
      query = query.eq('owner_code', filter.ownerCode);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Gagal mengambil data tim: ${error.message}`);
    }

    return ((data ?? []) as unknown as TeamRowWithMembers[]).map(mapTeamRow);
  },

  async fetchTeamWithMembers(id: string): Promise<Team | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('teams')
      .select('*, members(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Gagal mengambil detail tim: ${error.message}`);
    }

    return data ? mapTeamRow(data as unknown as TeamRowWithMembers) : null;
  },

  async fetchRegionCategoryPairs(status?: 'Terverifikasi' | 'ALL'): Promise<Array<{ region: string; category: string }>> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('teams').select('region, category');
    if (status === 'Terverifikasi') {
      query = query.eq('status', 'Terverifikasi');
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Gagal mengambil statistik kuota: ${error.message}`);
    }
    return data ?? [];
  },

  async findTeamOwner(teamId: string): Promise<string | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('teams')
      .select('owner_code')
      .eq('id', teamId)
      .maybeSingle();

    if (error) {
      throw new Error(`Gagal membaca pemilik tim: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return data.owner_code ?? '';
  },

  async findUsedTeamNumbers(prefix: string): Promise<Set<number>> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('teams')
      .select('team_number')
      .like('team_number', `${prefix}%`);

    if (error) {
      throw new Error(`Gagal membaca nomor tim yang sudah terpakai: ${error.message}`);
    }

    const used = new Set<number>();
    for (const row of data ?? []) {
      const parsed = Number.parseInt(String(row.team_number).slice(prefix.length), 10);
      if (Number.isFinite(parsed)) {
        used.add(parsed);
      }
    }
    return used;
  },

  async createTeamWithMembers(team: Team): Promise<Team> {
    const supabase = getSupabaseAdmin();
    const { members, ...fields } = team;

    const teamPayload = {
      id: fields.id,
      team_number: fields.teamNumber,
      name: fields.name,
      address: fields.address ?? '',
      province: fields.province,
      region: fields.region,
      category: fields.category,
      contact_person: fields.contactPerson ?? '',
      contact_phone: fields.contactPhone ?? '',
      owner_code: fields.ownerCode ?? '',
      status: fields.status,
    };

    const memberPayloads = members.map(m => ({
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
        m.jerseyNumber && m.jerseyNumber.trim() !== '' ? m.jerseyNumber : null,
      position: m.position && m.position !== '-' ? m.position : null,
      height: m.height ?? null,
      weight: m.weight ?? null,
      photo_url: m.photoUrl ?? '',
    }));

    const { data: insertedTeam, error: teamError } = await supabase
      .from('teams')
      .insert(teamPayload)
      .select('*')
      .single();

    if (teamError || !insertedTeam) {
      if (isQuotaViolation(teamError)) {
        throw new BackendError('quota_exceeded', teamError?.message ?? undefined);
      }
      if (teamError?.code === '23505' && /team_number/i.test(teamError.message ?? '')) {
        throw new BackendError('team_number_unique');
      }
      throw new Error(`Gagal menyimpan tim baru: ${teamError?.message ?? 'tidak diketahui'}`);
    }

    const { error: membersError } = await supabase
      .from('members')
      .insert(memberPayloads);

    if (membersError) {
      // Rollback manual: PostgREST tidak menyediakan transaksi multi-tabel
      await supabase.from('teams').delete().eq('id', team.id);

      if (membersError.code === '23505') {
        throw new BackendError(
          'member_unique',
          /jersey/i.test(membersError.message)
            ? 'Nomor Jersey sudah digunakan oleh pemain lain dalam tim ini.'
            : membersError.message
        );
      }
      throw new Error(`Gagal menyimpan personel tim: ${membersError.message}`);
    }

    return {
      id: insertedTeam.id,
      teamNumber: insertedTeam.team_number,
      name: insertedTeam.name,
      address: insertedTeam.address ?? '',
      province: insertedTeam.province,
      region: insertedTeam.region,
      category: insertedTeam.category,
      contactPerson: insertedTeam.contact_person ?? '',
      contactPhone: insertedTeam.contact_phone ?? '',
      ownerCode: insertedTeam.owner_code ?? '',
      status: insertedTeam.status,
      members: [...members].sort((a, b) => a.slotIndex - b.slotIndex),
      createdAt: insertedTeam.created_at,
      updatedAt: insertedTeam.updated_at,
    };
  },

  async updateTeamColumns(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const keys = Object.keys(patch);

    if (keys.length === 0) {
      const { data } = await supabase.from('teams').select('id').eq('id', id).maybeSingle();
      return Boolean(data);
    }

    const { data, error } = await supabase
      .from('teams')
      .update(patch)
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Gagal memperbarui data tim: ${error.message}`);
    }
    return (data ?? []).length > 0;
  },

  async deleteTeamById(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Gagal menghapus data tim: ${error.message}`);
    }
    return (data ?? []).length > 0;
  },

  async deleteAllTeams(): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('teams').delete().neq('id', '__none__');
    if (error) {
      throw new Error(`Gagal mengosongkan tabel tim: ${error.message}`);
    }
  },

  async findMemberById(teamId: string, memberId: string): Promise<Member | null> {
    return findMemberByIdImpl(teamId, memberId);
  },

  async listPlayerJerseys(
    teamId: string,
    excludeMemberId?: string
  ): Promise<Array<{ id: string; jerseyNumber: string }>> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('members')
      .select('id, jersey_number')
      .eq('team_id', teamId)
      .eq('team_role', 'Pemain');

    if (excludeMemberId) {
      query = query.neq('id', excludeMemberId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Gagal memeriksa nomor jersey: ${error.message}`);
    }

    return (data ?? []).map(row => ({
      id: row.id,
      jerseyNumber: row.jersey_number ?? '',
    }));
  },

  async listMemberFullNames(teamId: string): Promise<string[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('members')
      .select('full_name')
      .eq('team_id', teamId);

    if (error) {
      throw new Error(`Gagal menghitung kelengkapan roster: ${error.message}`);
    }
    return (data ?? []).map(row => row.full_name ?? '');
  },

  async updateMemberColumns(
    teamId: string,
    memberId: string,
    patch: Record<string, unknown>
  ): Promise<Member | null> {
    const supabase = getSupabaseAdmin();
    const keys = Object.keys(patch);

    if (keys.length === 0) {
      return findMemberByIdImpl(teamId, memberId);
    }

    const { data, error } = await supabase
      .from('members')
      .update(patch)
      .eq('id', memberId)
      .eq('team_id', teamId)
      .select('*');

    if (error) {
      if (error.code === '23505') {
        throw new BackendError(
          'member_unique',
          /jersey/i.test(error.message)
            ? 'Nomor Jersey sudah digunakan oleh pemain lain dalam tim ini.'
            : error.message
        );
      }
      throw new Error(`Gagal memperbarui data personel: ${error.message}`);
    }
    if (!data || data.length === 0) {
      return null;
    }
    return mapMemberRow(data[0] as unknown as MemberRow);
  },

  async findAccountByHash(hash: string): Promise<AccountRow | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .select('id, code_hash, code_enc, role, label, team_id, revoked')
      .eq('code_hash', hash)
      .maybeSingle();

    if (error) {
      throw new Error(`Gagal mencari akun akses: ${error.message}`);
    }
    return (data as unknown as AccountRow | null) ?? null;
  },

  async findAccountById(id: string): Promise<AccountRow | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .select('id, code_hash, code_enc, role, label, team_id, revoked')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Gagal membaca akun akses: ${error.message}`);
    }
    return (data as unknown as AccountRow | null) ?? null;
  },

  async listAccounts(): Promise<AccountRow[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .select('id, code_hash, code_enc, role, label, team_id, revoked')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Gagal mengambil daftar akun akses: ${error.message}`);
    }
    return (data as unknown as AccountRow[] | null) ?? [];
  },

  async createAccounts(rows: AccountInsert[]): Promise<void> {
    if (rows.length === 0) return;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('access_accounts').insert(rows);

    if (error) {
      throw new Error(`Gagal menyimpan akun akses: ${error.message}`);
    }
  },

  async clearAllAccounts(): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('access_accounts').delete().neq('id', '__none__');
    if (error) {
      throw new Error(`Gagal mengosongkan tabel akun akses: ${error.message}`);
    }
  },

  async setAccountTeam(accountId: string, teamId: string | null): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .update({ team_id: teamId })
      .eq('id', accountId)
      .select('id');

    if (error) {
      throw new Error(`Gagal mengikat akun ke tim: ${error.message}`);
    }
    return (data ?? []).length > 0;
  },

  async setAccountRevoked(id: string, revoked: boolean): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .update({ revoked })
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Gagal mengubah status revoke akun: ${error.message}`);
    }
    return (data ?? []).length > 0;
  },

  async rotateAccountHash(id: string, newHash: string, newEnc: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('access_accounts')
      .update({ code_hash: newHash, code_enc: newEnc })
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Gagal memperbarui kode akun: ${error.message}`);
    }
    return (data ?? []).length > 0;
  },
};
