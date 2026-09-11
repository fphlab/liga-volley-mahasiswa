import { NextRequest, NextResponse } from 'next/server';
import { getAllTeams, createTeam, getQuotaStats, updateTeam, withDatabaseLock } from '@/lib/db';
import { AuthError, requireActor } from '@/lib/auth';
import { getDataBackend } from '@/lib/backend';
import { encryptCode, generateRandomCode, hashCode } from '@/lib/accessCodes';
import { Region, Category, Team } from '@/lib/types';

function slugifyName(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'tim';
}

async function buildUniqueAccountId(baseSlug: string, category: Category): Promise<string> {
  const backend = await getDataBackend();
  const cleanBase = slugifyName(baseSlug);
  if (!(await backend.findAccountById(cleanBase))) return cleanBase;
  const categorySuffix = category === 'Putri' ? 'putri' : 'putra';
  const withCategory = `${cleanBase}-${categorySuffix}`;
  if (!(await backend.findAccountById(withCategory))) return withCategory;
  for (let n = 2; n <= 100; n += 1) {
    const candidate = `${withCategory}-${n}`;
    if (!(await backend.findAccountById(candidate))) return candidate;
  }
  throw new Error('Gagal membuat id akun unik setelah 100 percobaan.');
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

interface NewAccountResult {
  team: Team;
  newAccount: { id: string; label: string; code: string };
}

async function createParticipantAccount(newTeam: Team): Promise<NewAccountResult> {
  return withDatabaseLock(async () => {
    const backend = await getDataBackend();
    const label = newTeam.name.trim();
    const accountId = await buildUniqueAccountId(newTeam.name, newTeam.category);
    const { code, codeHash } = await generateUniqueCode();
    await backend.createAccounts([
      {
        id: accountId,
        code_hash: codeHash,
        code_enc: encryptCode(code),
        role: 'peserta',
        label,
        team_id: newTeam.id,
        revoked: false,
      },
    ]);
    const bound = await updateTeam(newTeam.id, { ownerCode: accountId });
    if (!bound.success || !bound.team) {
      throw new Error(bound.error ?? 'Gagal mengikat kode ke tim.');
    }
    return { team: bound.team, newAccount: { id: accountId, label, code } };
  });
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);

    const { searchParams } = new URL(request.url);
    const region = (searchParams.get('region') as Region) || undefined;
    const category = (searchParams.get('category') as Category) || undefined;

    const teams = await getAllTeams(region, category);
    const quota = await getQuotaStats();

    // Privasi: Peserta hanya boleh melihat data sensitif (NIM, tanggal lahir, kontak) milik timnya sendiri.
    // Data tim lain disanitasi agar tidak bocor ke peserta lain.
    const safeTeams =
      actor.role === 'peserta'
        ? teams.map((team) => {
            const isOwn = Boolean(actor.ownerCode) && team.ownerCode === actor.ownerCode;
            if (isOwn) return team;
            return {
              ...team,
              contactPhone: '',
              members: team.members.map((m) => ({
                ...m,
                nim: '',
                birthDate: '',
              })),
            };
          })
        : teams;

    return NextResponse.json({
      success: true,
      teams: safeTeams,
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
    await requireActor(request, ['panpel']);

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

    const createdTeam = result.team as Team;
    try {
      const { team, newAccount } = await createParticipantAccount(createdTeam);
      return NextResponse.json({ success: true, team, newAccount }, { status: 201 });
    } catch (accountError) {
      console.error('Gagal membuat kode akses peserta setelah tim dibuat:', accountError);
      return NextResponse.json(
        {
          success: true,
          team: createdTeam,
          accountError:
            'Tim berhasil dibuat, tetapi kode akses peserta gagal dibuat. Buat kode manual melalui panel Panpel.',
        },
        { status: 201 }
      );
    }
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
