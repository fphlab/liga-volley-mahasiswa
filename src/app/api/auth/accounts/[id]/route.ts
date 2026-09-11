import { NextRequest, NextResponse } from 'next/server';
import { getTeamById, getAllTeams, updateTeam, withDatabaseLock } from '@/lib/db';
import { AuthError, requireActor } from '@/lib/auth';
import { getDataBackend } from '@/lib/backend';
import { encryptCode, generateRandomCode, hashCode } from '@/lib/accessCodes';

type AccountAction = 'regenerate' | 'revoke' | 'unrevoke' | 'reassign';

interface ActionBody {
  action?: unknown;
  teamId?: unknown;
}

async function generateUniqueCode(): Promise<{ code: string; codeHash: string }> {
  const backend = await getDataBackend();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateRandomCode();
    const codeHash = hashCode(code);
    if (!(await backend.findAccountByHash(codeHash))) return { code, codeHash };
  }
  throw new Error('Gagal membuat kode unik setelah 10 percobaan.');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireActor(request, ['panpel']);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as ActionBody | null;
    const action = body?.action as AccountAction | undefined;

    if (action !== 'regenerate' && action !== 'revoke' && action !== 'unrevoke' && action !== 'reassign') {
      return NextResponse.json(
        { success: false, error: 'Aksi tidak dikenal. Pilih regenerate, revoke, unrevoke, atau reassign.' },
        { status: 400 }
      );
    }

    return withDatabaseLock(async () => {
      const backend = await getDataBackend();
      const account = await backend.findAccountById(id);
      if (!account) {
        return NextResponse.json(
          { success: false, error: 'Akun akses tidak ditemukan.' },
          { status: 404 }
        );
      }

      if (action === 'regenerate') {
        const { code, codeHash } = await generateUniqueCode();
        const ok = await backend.rotateAccountHash(id, codeHash, encryptCode(code));
        if (!ok) {
          return NextResponse.json(
            { success: false, error: 'Akun akses tidak ditemukan.' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, code });
      }

      if (action === 'revoke') {
        const ok = await backend.setAccountRevoked(id, true);
        if (!ok) {
          return NextResponse.json(
            { success: false, error: 'Akun akses tidak ditemukan.' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, revoked: true });
      }

      if (action === 'unrevoke') {
        const ok = await backend.setAccountRevoked(id, false);
        if (!ok) {
          return NextResponse.json(
            { success: false, error: 'Akun akses tidak ditemukan.' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, revoked: false });
      }

      // action === 'reassign': pindah akun peserta ke tim lain (atau lepas).
      if (account.role !== 'peserta') {
        return NextResponse.json(
          { success: false, error: 'Hanya akun peserta yang dapat dipindah tim.' },
          { status: 400 }
        );
      }
      const rawTeamId = body?.teamId;
      const targetTeamId = rawTeamId === null || rawTeamId === undefined || rawTeamId === ''
        ? null
        : String(rawTeamId);

      if (targetTeamId !== null) {
        const target = await getTeamById(targetTeamId);
        if (!target) {
          return NextResponse.json(
            { success: false, error: 'Tim tujuan tidak ditemukan.' },
            { status: 404 }
          );
        }
        const targetOwner = target.ownerCode ?? '';
        if (targetOwner !== '' && targetOwner !== id) {
          return NextResponse.json(
            { success: false, error: `Tim "${target.name}" sudah terikat akun lain. Lepaskan dulu sebelum dipindah.` },
            { status: 400 }
          );
        }
      }

      const bound = await backend.setAccountTeam(id, targetTeamId);
      if (!bound) {
        return NextResponse.json(
          { success: false, error: 'Akun akses tidak ditemukan.' },
          { status: 404 }
        );
      }

      // Selaraskan sisi tim (owner_code menyimpan id akun): bersihkan tim lama
      // yang masih menunjuk akun ini, lalu tulis ikatan baru bila ada target.
      const allTeams = await getAllTeams();
      for (const team of allTeams) {
        if ((team.ownerCode ?? '') === id && team.id !== targetTeamId) {
          await updateTeam(team.id, { ownerCode: '' });
        }
      }
      if (targetTeamId !== null) {
        const result = await updateTeam(targetTeamId, { ownerCode: id });
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error ?? 'Gagal mengikat akun ke tim.' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({ success: true, teamId: targetTeamId });
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error updating access account:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal memproses aksi akun'
            : error instanceof Error
            ? error.message
            : 'Gagal memproses aksi akun',
      },
      { status: 500 }
    );
  }
}
