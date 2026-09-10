import { NextRequest, NextResponse } from 'next/server';
import { updateMember, getTeamById } from '@/lib/db';
import { verifyAdminKey } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const isAdmin = verifyAdminKey(request);

    // Ambil data tim untuk cek status pendaftaran
    const currentTeam = await getTeamById(teamId);
    if (!currentTeam) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Sesuai sistem Google Form: jika tim sudah final (status !== 'Draft'),
    // pendaftaran dikunci dan hanya Panitia dengan PIN yang boleh mengedit.
    // Jika tim masih 'Draft' (tahap pendaftaran), pendaftar dapat mengisi dan menyimpan roster.
    if (!isAdmin && currentTeam.status !== 'Draft') {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak: Susunan roster pemain telah dikunci (final). Perubahan data roster hanya dapat dilakukan oleh Panitia.',
        },
        { status: 401 }
      );
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
