import { NextRequest, NextResponse } from 'next/server';
import { getTeamById, updateTeam, deleteTeam } from '@/lib/db';
import { verifyAdminKey } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await getTeamById(id);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, team });
  } catch (error) {
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
  // Sesuai brief klien (gaya Google Form): data pendaftaran final & terkunci.
  // Hanya Panitia dengan Secret PIN yang berhak mengubah data atau status tim.
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Akses ditolak: Formulir pendaftaran bersifat final (terkunci). Perubahan data hanya dapat dilakukan oleh Panitia.',
      },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updateTeam(id, body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, team: result.team });
  } catch (error) {
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
  // Hanya Panitia dengan Secret PIN yang berhak menghapus tim.
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Akses ditolak: Data pendaftaran tidak dapat dihapus oleh umum. Aksi ini hanya dapat dilakukan oleh Panitia.',
      },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const result = await deleteTeam(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Tim berhasil dihapus' });
  } catch (error) {
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
