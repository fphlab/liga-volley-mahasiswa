import { NextRequest, NextResponse } from 'next/server';
import { getTeamById, getAllTeams, updateTeam, deleteTeam } from '@/lib/db';
import { AuthError, requireActor } from '@/lib/auth';
import { getDataBackend } from '@/lib/backend';
import type { Team } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request);

    const { id } = await params;
    const team = await getTeamById(id);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Privasi: Peserta hanya boleh melihat data sensitif (NIM, tanggal lahir, kontak) milik timnya sendiri.
    const safeTeam =
      actor.role === 'peserta' && (!actor.ownerCode || team.ownerCode !== actor.ownerCode)
        ? {
            ...team,
            contactPhone: '',
            members: team.members.map((m) => ({
              ...m,
              nim: '',
              birthDate: '',
            })),
          }
        : team;

    return NextResponse.json({ success: true, team: safeTeam });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error getting team:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal mengambil detail tim'
            : error instanceof Error
            ? error.message
            : 'Gagal mengambil detail tim',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request);
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const existingTeam = await getTeamById(id);
    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    const keys = Object.keys(body);

    const isOwnerCodeOnly =
      keys.length === 1 && keys[0] === 'ownerCode' && typeof body.ownerCode === 'string';

    if (isOwnerCodeOnly) {
      if (actor.role !== 'panpel') {
        throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
      }
      const nextOwnerCode = body.ownerCode as string;
      if (nextOwnerCode !== '') {
        const allTeams = await getAllTeams();
        const conflict = allTeams.find(
          (t) => t.id !== id && t.ownerCode !== '' && t.ownerCode === nextOwnerCode
        );
        if (conflict) {
          return NextResponse.json(
            { success: false, error: `Kode akses sudah dipakai oleh tim "${conflict.name}". Lepaskan dulu sebelum assign ulang.` },
            { status: 400 }
          );
        }
      }
      const backend = await getDataBackend();
      const prevOwnerCode = existingTeam.ownerCode ?? '';

      // Lepaskan ikatan tim pada akun lama jika ada
      if (prevOwnerCode !== '' && prevOwnerCode !== nextOwnerCode) {
        await backend.setAccountTeam(prevOwnerCode, null);
      }

      // Ikat akun baru ke tim ini bila nextOwnerCode tidak kosong
      if (nextOwnerCode !== '') {
        await backend.setAccountTeam(nextOwnerCode, id);
      }

      const result = await updateTeam(id, { ownerCode: nextOwnerCode });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, team: result.team });
    }

    const isFinalizingDraft =
      existingTeam.status === 'Draft' &&
      keys.length === 1 &&
      keys[0] === 'status' &&
      body.status === 'Lengkap';

    if (isFinalizingDraft) {
      if (actor.role === 'panpel') {
        const result = await updateTeam(id, { status: 'Lengkap' });
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, team: result.team });
      }
      if (actor.role === 'peserta') {
        const ownerCode = existingTeam.ownerCode ?? '';
        if (ownerCode === '' || ownerCode !== actor.ownerCode) {
          throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
        }
        const result = await updateTeam(id, { status: 'Lengkap' });
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, team: result.team });
      }
      throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
    }

    if (actor.role !== 'panpel') {
      throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
    }

    const result = await updateTeam(id, body as Partial<Team>);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, team: result.team });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error updating team:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal memperbarui data tim'
            : error instanceof Error
            ? error.message
            : 'Gagal memperbarui data tim',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireActor(request, ['panpel']);

    const { id } = await params;
    const result = await deleteTeam(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Tim berhasil dihapus' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error deleting team:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal menghapus data tim'
            : error instanceof Error
            ? error.message
            : 'Gagal menghapus data tim',
      },
      { status: 500 }
    );
  }
}
