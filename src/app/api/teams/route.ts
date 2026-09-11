import { NextRequest, NextResponse } from 'next/server';
import { getAllTeams, createTeam, getQuotaStats } from '@/lib/db';
import { AuthError, requireActor } from '@/lib/auth';
import { Region, Category } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    requireActor(request);

    const { searchParams } = new URL(request.url);
    const region = (searchParams.get('region') as Region) || undefined;
    const category = (searchParams.get('category') as Category) || undefined;

    const teams = await getAllTeams(region, category);
    const quota = await getQuotaStats();

    return NextResponse.json({
      success: true,
      teams,
      quota,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal mengambil data tim'
            : error instanceof Error
            ? error.message
            : 'Gagal mengambil data tim',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireActor(request, ['panpel']);

    const body = await request.json();
    const { name, address, province, region, category, contactPerson, contactPhone } = body;

    if (!name || !province || !region || !category) {
      return NextResponse.json(
        { success: false, error: 'Nama Tim, Provinsi, Regional, dan Kategori wajib diisi' },
        { status: 400 }
      );
    }

    const result = await createTeam({
      name,
      address: address || '',
      province,
      region,
      category,
      contactPerson,
      contactPhone,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, team: result.team }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error creating team:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Terjadi kesalahan sistem saat mendaftarkan tim'
            : error instanceof Error
            ? error.message
            : 'Terjadi kesalahan sistem saat mendaftarkan tim',
      },
      { status: 500 }
    );
  }
}
