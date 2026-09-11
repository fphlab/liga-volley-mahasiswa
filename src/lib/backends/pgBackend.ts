import { Pool, PoolClient, types } from 'pg';
import { Team, Member, Region, Category } from '../types';
import { assembleTeams, mapMemberRow, MemberRow, TeamRow } from '../rowMappers';
import { BackendError, DataBackend } from '../backend';

/**
 * Backend PostgreSQL langsung (node-postgres) — untuk database lokal/dev
 * maupun Postgres terkelola mana pun. Skema identik dengan supabase/schema.sql:
 * trigger kuota & updated_at serta index unik ditegakkan di level database.
 */

// Kembalikan timestamptz/timestamp sebagai string ISO agar konsisten
// dengan bentuk data dari Supabase (PostgREST).
types.setTypeParser(1184, (v: string) => new Date(v).toISOString()); // timestamptz OID
types.setTypeParser(1114, (v: string) => new Date(v).toISOString()); // timestamp OID

let cachedPool: Pool | null = null;

function getPool(): Pool {
  if (cachedPool) {
    return cachedPool;
  }

  cachedPool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
    : new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        max: 10,
      });

  return cachedPool;
}

function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params as never[]);
}

/** Terjemahkan error Postgres menjadi BackendError yang bermakna */
function translateInsertError(err: unknown): never {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e?.code === '23505') {
    if (e.constraint === 'teams_team_number_key') {
      throw new BackendError('team_number_unique', `Nomor daftar tim sudah digunakan.`);
    }
    throw new BackendError('member_unique', e.constraint === 'members_unique_jersey_per_team'
      ? 'Nomor Jersey sudah digunakan oleh pemain lain dalam tim ini.'
      : 'Slot personel sudah terisi pada tim ini.');
  }
  if (e?.code === '23514' || /Kuota untuk Regional/i.test(e?.message ?? '')) {
    throw new BackendError('quota_exceeded', e.message);
  }
  throw err as Error;
}

async function fetchMemberRows(teamIds: string[]): Promise<MemberRow[]> {
  if (teamIds.length === 0) return [];
  const result = await query<MemberRow>(
    `SELECT * FROM members WHERE team_id = ANY($1::text[]) ORDER BY slot_index ASC`,
    [teamIds]
  );
  return result.rows;
}

async function findMemberByIdImpl(teamId: string, memberId: string): Promise<Member | null> {
  const result = await query<MemberRow>(
    `SELECT * FROM members WHERE id = $1 AND team_id = $2`,
    [memberId, teamId]
  );
  return result.rows[0] ? mapMemberRow(result.rows[0]) : null;
}

export const pgBackend: DataBackend = {
  name: 'postgres',

  async fetchTeamsWithMembers(filter?: { region?: Region; category?: Category }): Promise<Team[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filter?.region) {
      params.push(filter.region);
      clauses.push(`region = $${params.length}`);
    }
    if (filter?.category) {
      params.push(filter.category);
      clauses.push(`category = $${params.length}`);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const teamsResult = await query<TeamRow>(
      `SELECT * FROM teams ${whereSql} ORDER BY created_at ASC, id ASC`,
      params
    );
    const memberRows = await fetchMemberRows(teamsResult.rows.map(r => r.id));

    return assembleTeams(teamsResult.rows, memberRows);
  },

  async fetchTeamWithMembers(id: string): Promise<Team | null> {
    const teamResult = await query<TeamRow>(`SELECT * FROM teams WHERE id = $1`, [id]);
    if (teamResult.rows.length === 0) {
      return null;
    }
    const memberRows = await fetchMemberRows([id]);
    return assembleTeams(teamResult.rows, memberRows)[0] ?? null;
  },

  async fetchRegionCategoryPairs(status?: 'Terverifikasi' | 'ALL'): Promise<Array<{ region: string; category: string }>> {
    if (status === 'Terverifikasi') {
      const result = await query<{ region: string; category: string }>(
        `SELECT region, category FROM teams WHERE status = 'Terverifikasi'`
      );
      return result.rows;
    }
    const result = await query<{ region: string; category: string }>(
      `SELECT region, category FROM teams`
    );
    return result.rows;
  },

  async findUsedTeamNumbers(prefix: string): Promise<Set<number>> {
    const result = await query<{ team_number: string }>(
      `SELECT team_number FROM teams WHERE team_number LIKE $1`,
      [`${prefix}%`]
    );

    const used = new Set<number>();
    for (const row of result.rows) {
      const parsed = Number.parseInt(String(row.team_number).slice(prefix.length), 10);
      if (Number.isFinite(parsed)) {
        used.add(parsed);
      }
    }
    return used;
  },

  async createTeamWithMembers(team: Team): Promise<Team> {
    const client: PoolClient = await getPool().connect();
    try {
      await client.query('BEGIN');

      const t = team;
      const teamResult = await client.query<TeamRow>(
        `INSERT INTO teams
           (id, team_number, name, address, province, region, category,
            contact_person, contact_phone, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          t.id, t.teamNumber, t.name, t.address ?? '', t.province,
          t.region, t.category, t.contactPerson ?? '', t.contactPhone ?? '', t.status,
        ]
      );

      for (const m of t.members) {
        await client.query(
          `INSERT INTO members
             (id, team_id, slot_index, reg_number, full_name, birth_date, nim,
              faculty, major, entry_year, team_role, jersey_number, position,
              height, weight, photo_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            m.id, m.teamId, m.slotIndex, m.regNumber ?? '', m.fullName ?? '',
            m.birthDate ?? '', m.nim ?? '', m.faculty ?? '', m.major ?? '',
            m.entryYear ?? '', m.teamRole,
            m.jerseyNumber && m.jerseyNumber.trim() !== '' ? m.jerseyNumber : null,
            m.position && m.position !== '-' ? m.position : null,
            m.height ?? null, m.weight ?? null, m.photoUrl ?? '',
          ]
        );
      }

      await client.query('COMMIT');

      // Susun entitas dari baris hasil insert + anggota yang baru dimasukkan
      const row = teamResult.rows[0];
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
        members: [...t.members].sort((a, b) => a.slotIndex - b.slotIndex),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      translateInsertError(err);
    } finally {
      client.release();
    }
  },

  async updateTeamColumns(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      const exists = await query(`SELECT id FROM teams WHERE id = $1`, [id]);
      return exists.rowCount !== 0;
    }

    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const result = await query(
      `UPDATE teams SET ${sets} WHERE id = $${keys.length + 1} RETURNING id`,
      [...keys.map(k => patch[k]), id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteTeamById(id: string): Promise<boolean> {
    // Personel ikut terhapus lewat ON DELETE CASCADE
    const result = await query(`DELETE FROM teams WHERE id = $1 RETURNING id`, [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async deleteAllTeams(): Promise<void> {
    await query(`DELETE FROM teams WHERE id <> '__none__'`);
  },

  async findMemberById(teamId: string, memberId: string): Promise<Member | null> {
    return findMemberByIdImpl(teamId, memberId);
  },

  async listPlayerJerseys(
    teamId: string,
    excludeMemberId?: string
  ): Promise<Array<{ id: string; jerseyNumber: string }>> {
    const params: unknown[] = [teamId];
    let sql = `SELECT id, COALESCE(jersey_number, '') AS jersey_number
               FROM members
               WHERE team_id = $1 AND team_role = 'Pemain'`;
    if (excludeMemberId) {
      params.push(excludeMemberId);
      sql += ` AND id <> $2`;
    }
    const result = await query<{ id: string; jersey_number: string }>(sql, params);
    return result.rows.map(r => ({ id: r.id, jerseyNumber: r.jersey_number ?? '' }));
  },

  async listMemberFullNames(teamId: string): Promise<string[]> {
    const result = await query<{ full_name: string }>(
      `SELECT full_name FROM members WHERE team_id = $1`,
      [teamId]
    );
    return result.rows.map(r => r.full_name ?? '');
  },

  async updateMemberColumns(
    teamId: string,
    memberId: string,
    patch: Record<string, unknown>
  ): Promise<Member | null> {
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return findMemberByIdImpl(teamId, memberId);
    }

    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    try {
      const result = await query<MemberRow>(
        `UPDATE members SET ${sets}
         WHERE id = $${keys.length + 1} AND team_id = $${keys.length + 2}
         RETURNING *`,
        [...keys.map(k => patch[k]), memberId, teamId]
      );
      return result.rows[0] ? mapMemberRow(result.rows[0]) : null;
    } catch (err) {
      const e = err as { code?: string; constraint?: string; message?: string };
      if (e?.code === '23505' && e.constraint === 'members_unique_jersey_per_team') {
        throw new BackendError('member_unique', 'Nomor Jersey sudah digunakan oleh pemain lain dalam tim ini.');
      }
      throw err;
    }
  },
};
