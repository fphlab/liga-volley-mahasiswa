import { NextRequest, NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/db';
import { listAccessCodes } from '@/lib/accessCodes';
import { AuthError, requireActor } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    requireActor(request, ['panpel']);

    const teams = await getAllTeams();
    const ownerMap = new Map<string, { id: string; name: string }>();
    for (const team of teams) {
      if (team.ownerCode !== '') {
        ownerMap.set(team.ownerCode, { id: team.id, name: team.name });
      }
    }

    const codes = listAccessCodes().map(({ code, role }) => {
      const usedBy = ownerMap.get(code);
      return {
        code,
        role,
        usedByTeamId: usedBy?.id ?? null,
        usedByTeamName: usedBy?.name ?? null,
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
