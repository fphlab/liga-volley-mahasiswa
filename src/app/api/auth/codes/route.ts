import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/db';
import { decryptCode } from '@/lib/accessCodes';
import { AuthError, requireActor } from '@/lib/auth';
import { getDataBackend } from '@/lib/backend';
import type { NextRequest } from 'next/server';

// Ikatan akun↔tim ditulis ganda (access_accounts.team_id + teams.owner_code,
// lihat POST /api/teams dan POST /api/admin/bootstrap). Di sini team_id akun
// adalah sumber utama; owner_code tim dipakai sebagai fallback masa transisi.
export async function GET(request: NextRequest) {
  try {
    await requireActor(request, ['panpel']);

    const backend = await getDataBackend();
    const [accounts, teams] = await Promise.all([
      backend.listAccounts(),
      getAllTeams(),
    ]);

    const teamById = new Map(teams.map((t) => [t.id, t]));
    const teamIdByOwnerCode = new Map<string, string>();
    for (const team of teams) {
      if (team.ownerCode !== '') {
        teamIdByOwnerCode.set(team.ownerCode, team.id);
      }
    }

    const codes = accounts.map((account) => {
      let teamId: string | null = account.team_id;
      if (!teamId) {
        teamId = teamIdByOwnerCode.get(account.id) ?? null;
      }
      const team = teamId ? teamById.get(teamId) ?? null : null;
      let code = '';
      try {
        code = decryptCode(account.code_enc);
      } catch {
        code = '';
      }
      return {
        id: account.id,
        label: account.label,
        role: account.role,
        code,
        teamId: team?.id ?? teamId,
        teamName: team?.name ?? null,
        revoked: account.revoked,
      };
    });

    return NextResponse.json({ success: true, codes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error listing access codes:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar kode akses' },
      { status: 500 }
    );
  }
}
