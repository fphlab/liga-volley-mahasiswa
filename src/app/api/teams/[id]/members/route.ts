import { NextRequest, NextResponse } from 'next/server';
import { updateMember, getTeamById } from '@/lib/db';
import { getDataBackend } from '@/lib/backend';
import { AuthError, requireActor } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = requireActor(request);

    if (actor.role === 'mojisport') {
      throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
    }

    const { id: teamId } = await params;

    const currentTeam = await getTeamById(teamId);
    if (!currentTeam) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    if (actor.role === 'peserta') {
      const backend = await getDataBackend();
      const ownerCode = backend.findTeamOwner
        ? await backend.findTeamOwner(teamId)
        : currentTeam.ownerCode ?? '';
      if (ownerCode === null || ownerCode === '' || ownerCode !== actor.ownerCode) {
        throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
      }
      if (currentTeam.status !== 'Draft') {
        throw new AuthError('Roster tim ini sudah dikunci. Hubungi Panpel untuk perubahan.', 403);
      }
    }

    const body = await request.json();
    const { memberId, updates } = body;

    if (!memberId || !updates) {
      return NextResponse.json(
        { success: false, error: 'memberId dan data updates wajib diisi' },
        { status: 400 }
      );
    }

    const result = await updateMember(teamId, memberId, updates);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const updatedTeam = await getTeamById(teamId);

    return NextResponse.json({
      success: true,
      member: result.member,
      team: updatedTeam,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error updating member:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal memperbarui data personel/pemain'
            : error instanceof Error
            ? error.message
            : 'Gagal memperbarui data personel/pemain',
      },
      { status: 500 }
    );
  }
}
